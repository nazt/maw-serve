(() => {
  "use strict";

  const POLL_INTERVAL_MS = 8_000;
  const CENSUS_URL = "/api/agora/census";
  const USAGE_URL = "/api/agora/usage";

  const fabric = document.querySelector("#fabric");
  const statusbar = document.querySelector("#statusbar");
  const clock = document.querySelector("#clock");
  const addNoteButton = document.querySelector("#add-note");
  const fitButton = document.querySelector("#fit-board");
  const zoomLabel = document.querySelector("#zoom-label");

  const clockFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const compactNumber = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  let requestInFlight = false;
  let firstLayoutComplete = false;
  const fleetItems = new Map();

  function updateClock() {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = clockFormatter.format(now);
  }

  function setBoardState(kind, message) {
    let state = document.querySelector("#board-state");

    if (!message) {
      state?.remove();
      return;
    }

    if (!state) {
      state = document.createElement("p");
      state.id = "board-state";
      fabric.append(state);
    }

    state.className = `board-state board-state--${kind}`;
    state.setAttribute("role", kind === "error" ? "alert" : "status");
    state.textContent = message;
  }

  function metric(label, value, kind) {
    const item = document.createElement("span");
    item.className = `statusbar__metric statusbar__metric--${kind}`;
    if (["active", "idle", "stale"].includes(kind)) {
      item.dataset.status = kind;
    }

    const name = document.createElement("span");
    name.className = "statusbar__label";
    name.textContent = `${label} `;

    const number = document.createElement("strong");
    number.className = "statusbar__value";
    number.textContent = value;
    item.append(name, number);
    return item;
  }

  function renderStatus(items, usage) {
    const totals = { active: 0, idle: 0, stale: 0 };

    for (const item of items) {
      if (item?.kind !== "oracle") continue;
      const status = String(item.data?.status ?? item.status ?? "stale").toLowerCase();
      if (status === "active") totals.active += 1;
      else if (status === "idle") totals.idle += 1;
      else if (status === "stale") totals.stale += 1;
    }

    const burn = Array.isArray(usage?.hosts)
      ? usage.hosts.reduce(
          (sum, host) => sum + (Number(host?.burn_per_hr) || 0),
          0,
        )
      : 0;
    const accounts = Array.isArray(usage?.accounts) ? usage.accounts.length : 0;

    statusbar.replaceChildren(
      metric("active", String(totals.active), "active"),
      metric("idle", String(totals.idle), "idle"),
      metric("stale", String(totals.stale), "stale"),
      metric("token burn", `${compactNumber.format(burn)} tok/h`, "burn"),
      metric(accounts === 1 ? "account" : "accounts", String(accounts), "accounts"),
    );
    statusbar.setAttribute(
      "aria-label",
      `Fleet status: ${totals.active} active, ${totals.idle} idle, ${totals.stale} stale, ${compactNumber.format(burn)} tokens per hour, ${accounts} accounts`,
    );
    statusbar.classList.remove("statusbar--error");
  }

  function showTelemetryError(hasTiles) {
    if (!hasTiles) {
      setBoardState("error", "Fleet telemetry is unavailable. Retrying shortly.");
    }
    statusbar.classList.add("statusbar--error");
    statusbar.replaceChildren();
    const message = document.createElement("span");
    message.className = "statusbar-message statusbar-message--error";
    message.textContent = "Telemetry link interrupted · retrying in 8s";
    statusbar.append(message);
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`${url} returned HTTP ${response.status}`);
    }

    return response.json();
  }

  function registeredItem(tiles, id) {
    const registries = [tiles.registry, tiles.items, tiles.tiles];

    for (const registry of registries) {
      if (!(registry instanceof Map)) continue;
      const entry = registry.get(id);
      if (!entry) continue;
      if (entry.item && typeof entry.item === "object") return entry.item;
      if (typeof entry === "object" && entry.nodeType !== 1) return entry;
    }

    return fleetItems.get(id);
  }

  function preserveGeometry(next, current) {
    if (!current) return next;

    const updated = {
      ...next,
      data: { ...next.data },
    };

    for (const key of ["x", "y", "w", "h"]) {
      if (Number.isFinite(current[key])) updated[key] = current[key];
    }
    if (Array.isArray(current.xy)) updated.xy = [...current.xy];

    return updated;
  }

  function syncFleet(tiles, nextItems) {
    const nextIds = new Set();

    for (const next of nextItems) {
      if (!next?.id) continue;
      nextIds.add(next.id);

      const item = preserveGeometry(next, registeredItem(tiles, next.id));
      tiles.upsert(item);
      fleetItems.set(next.id, registeredItem(tiles, next.id) ?? item);
    }

    for (const id of fleetItems.keys()) {
      if (nextIds.has(id)) continue;
      tiles.remove(id);
      fleetItems.delete(id);
    }
  }

  if (!fabric || !statusbar || !clock) {
    throw new Error("Stoa board shell is incomplete");
  }
  if (typeof window.Canvas !== "function" || typeof window.Tiles !== "function") {
    setBoardState("error", "Board engine failed to load.");
    throw new Error("Stoa Canvas or Tiles module is unavailable");
  }

  const fleet = window.fleet ?? {
    buildFleetTiles: window.buildFleetTiles,
    addNote: window.addNote,
  };
  if (
    typeof fleet.buildFleetTiles !== "function" ||
    typeof fleet.addNote !== "function"
  ) {
    setBoardState("error", "Fleet module failed to load.");
    throw new Error("Stoa fleet module is unavailable");
  }

  const c = new Canvas(fabric);
  const tiles = new Tiles(c);

  function updateZoomLabel() {
    zoomLabel.textContent = `${Math.round(c.zoom * 100)}%`;
  }

  c.on("change", updateZoomLabel);
  addNoteButton.addEventListener("click", () => fleet.addNote(c, tiles));
  fitButton.addEventListener("click", () => c.fit());

  async function refresh() {
    if (requestInFlight) return;
    requestInFlight = true;
    fabric.setAttribute("aria-busy", "true");

    try {
      const [census, usage] = await Promise.all([
        fetchJson(CENSUS_URL),
        fetchJson(USAGE_URL),
      ]);
      const items = fleet.buildFleetTiles(census, usage);

      if (!Array.isArray(items)) {
        throw new TypeError("buildFleetTiles must return an array");
      }

      syncFleet(tiles, items);
      renderStatus(items, usage);
      setBoardState(
        items.length === 0 ? "empty" : "ready",
        items.length === 0 ? "No oracle agents are currently reporting." : "",
      );

      if (!firstLayoutComplete && items.length > 0) {
        firstLayoutComplete = true;
        c.fit();
      }
    } catch (error) {
      console.error("Stoa telemetry refresh failed", error);
      showTelemetryError(fleetItems.size > 0);
    } finally {
      fabric.setAttribute("aria-busy", "false");
      requestInFlight = false;
    }
  }

  updateClock();
  updateZoomLabel();
  window.setInterval(updateClock, 1_000);
  refresh();
  window.setInterval(refresh, POLL_INTERVAL_MS);
})();
