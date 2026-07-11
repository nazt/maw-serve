(() => {
  "use strict";

  const POLL_INTERVAL_MS = 8_000;
  const CENSUS_URL = "/api/agora/census";
  const USAGE_URL = "/api/agora/usage";

  const regionsEl = document.querySelector("#regions");
  const statusbarEl = document.querySelector("#statusbar");
  const clockEl = document.querySelector("#clock");
  let requestInFlight = false;
  let hasRendered = false;

  const clockFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function updateClock() {
    const now = new Date();
    clockEl.dateTime = now.toISOString();
    clockEl.textContent = clockFormatter.format(now);
  }

  function showBoardState(kind, message) {
    regionsEl.replaceChildren();
    const state = document.createElement("p");
    state.className = `board-state board-state--${kind}`;
    state.setAttribute("role", kind === "error" ? "alert" : "status");
    state.textContent = message;
    regionsEl.append(state);
  }

  function showStatus(message, isError = false) {
    statusbarEl.replaceChildren();
    const status = document.createElement("span");
    status.className = isError
      ? "statusbar-message statusbar-message--error"
      : "statusbar-message";
    status.textContent = message;
    statusbarEl.append(status);
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

  function oracleCount(census) {
    if (!Array.isArray(census?.displays)) return 0;

    return census.displays.reduce(
      (displayTotal, display) =>
        displayTotal +
        (Array.isArray(display?.spaces)
          ? display.spaces.reduce(
              (spaceTotal, space) =>
                spaceTotal +
                (Array.isArray(space?.oracles) ? space.oracles.length : 0),
              0,
            )
          : 0),
      0,
    );
  }

  function render(census, usage) {
    if (typeof window.renderTopology !== "function") {
      throw new Error("Topology renderer is unavailable");
    }
    if (typeof window.renderUsage !== "function") {
      throw new Error("Usage renderer is unavailable");
    }

    const renderedNodes = window.renderTopology(census, regionsEl);
    const nodes =
      renderedNodes ?? regionsEl.querySelectorAll("[data-oracle], .oracle-node");

    window.renderUsage(usage, nodes);

    if (oracleCount(census) === 0) {
      showBoardState("empty", "No oracle agents are currently reporting.");
      showStatus("Fleet online · no oracle agents reporting");
    }
  }

  async function refresh() {
    if (requestInFlight) return;
    requestInFlight = true;
    regionsEl.setAttribute("aria-busy", "true");

    if (!hasRendered) {
      showBoardState("loading", "Acquiring fleet telemetry…");
      showStatus("Connecting to Stoa…");
    }

    try {
      const [census, usage] = await Promise.all([
        fetchJson(CENSUS_URL),
        fetchJson(USAGE_URL),
      ]);

      render(census, usage);
      hasRendered = true;
    } catch (error) {
      console.error("Stoa telemetry refresh failed", error);
      showBoardState(
        "error",
        hasRendered
          ? "Fleet telemetry update failed. Retrying shortly."
          : "Fleet telemetry is unavailable. Retrying shortly.",
      );
      showStatus("Telemetry link interrupted · retrying in 8s", true);
    } finally {
      regionsEl.setAttribute("aria-busy", "false");
      requestInFlight = false;
    }
  }

  updateClock();
  window.setInterval(updateClock, 1_000);
  refresh();
  window.setInterval(refresh, POLL_INTERVAL_MS);
})();
