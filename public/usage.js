(() => {
  "use strict";

  const NODE_SELECTOR = ".oracle-node, [data-oracle]";
  const STATUS_NAMES = ["active", "idle", "stale"];

  function normalizeHandle(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/-oracle/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function clampRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : null;
  }

  function resolveNodes(nodesOrContainer) {
    if (!nodesOrContainer) {
      return typeof document === "undefined"
        ? []
        : Array.from(document.querySelectorAll(NODE_SELECTOR));
    }

    if (typeof nodesOrContainer === "string") {
      return typeof document === "undefined"
        ? []
        : Array.from(document.querySelectorAll(nodesOrContainer));
    }

    if (typeof nodesOrContainer.querySelectorAll === "function") {
      const nodes = Array.from(nodesOrContainer.querySelectorAll(NODE_SELECTOR));
      if (typeof nodesOrContainer.matches === "function" && nodesOrContainer.matches(NODE_SELECTOR)) {
        nodes.unshift(nodesOrContainer);
      }
      return nodes;
    }

    if (typeof nodesOrContainer[Symbol.iterator] === "function") {
      return Array.from(nodesOrContainer).filter(Boolean);
    }

    return [nodesOrContainer].filter(Boolean);
  }

  function nodeHandle(node) {
    const labelledName = node.querySelector?.(".oracle-name, [data-oracle-name]")?.textContent;
    return normalizeHandle(
      node.dataset?.oracle ??
        node.dataset?.oracleHandle ??
        node.getAttribute?.("data-oracle") ??
        labelledName,
    );
  }

  function nodeStatus(node) {
    const nestedStatus = node.querySelector?.("[data-status]")?.dataset?.status;
    const explicit = String(node.dataset?.status ?? nestedStatus ?? "").toLowerCase();
    if (STATUS_NAMES.includes(explicit)) return explicit;

    const classes = String(node.className ?? "").toLowerCase();
    return STATUS_NAMES.find((status) =>
      new RegExp(`(?:^|\\s)(?:is-|status-)?${status}(?:\\s|$)`).test(classes),
    );
  }

  function heatColor(rate) {
    if (rate >= 85) return "oklch(0.68 0.20 25)";

    if (rate <= 70) {
      const mix = rate / 70;
      const lightness = 0.85 - 0.03 * mix;
      const chroma = 0.19 - 0.03 * mix;
      const hue = 155 - 80 * mix;
      return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
    }

    const mix = (rate - 70) / 15;
    const lightness = 0.82 - 0.14 * mix;
    const chroma = 0.16 + 0.04 * mix;
    const hue = 75 - 50 * mix;
    return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
  }

  function isPinned(node) {
    const classes = String(node.className ?? "").toLowerCase();
    return node.dataset?.pinned === "true" ||
      node.dataset?.status === "pinned" ||
      /(?:^|\s)(?:is-)?pinned(?:\s|$)/.test(classes);
  }

  function setSvgArc(ring, rate, color) {
    const tagName = String(ring.tagName ?? "").toLowerCase();
    const arc = tagName === "circle"
      ? ring
      : ring.querySelector?.("[data-usage-arc], circle:last-of-type");

    if (!arc) return;
    arc.setAttribute("pathLength", "100");
    arc.setAttribute("stroke-dasharray", `${rate} 100`);
    arc.setAttribute("stroke", color);
  }

  function renderRing(node, usage) {
    const rate = clampRate(usage.rate_5h_pct);
    if (rate === null) return;

    node.style?.setProperty("--heat", String(rate));
    node.classList?.add("has-heat");
    node.classList?.toggle("hot", rate >= 85);

    const ring = node.querySelector?.(".heat-ring");
    if (!ring) return;

    const color = isPinned(node) ? "oklch(0.82 0.16 75)" : heatColor(rate);
    const angle = `${(rate * 3.6).toFixed(1)}deg`;
    const oracleName = String(usage.oracle ?? "oracle").trim();

    ring.style?.setProperty("--heat-color", color);
    ring.style?.setProperty("--heat-rate", String(rate));
    ring.style?.setProperty("--heat-angle", angle);
    ring.style?.setProperty("--heat-progress", `${rate}%`);
    ring.style?.setProperty("--usage-angle", angle);
    ring.style?.setProperty("--usage-pct", `${rate}%`);
    ring.style?.setProperty("--ring-progress", angle);
    ring.style?.setProperty(
      "background-image",
      "conic-gradient(from -90deg, var(--heat-color) var(--heat-angle), var(--usage-track, var(--line)) var(--heat-angle) 360deg)",
    );
    ring.dataset.rate = String(rate);
    ring.removeAttribute?.("aria-hidden");
    ring.setAttribute?.("role", "img");
    ring.setAttribute?.("aria-label", `${oracleName}: ${rate}% five-hour usage`);
    setSvgArc(ring, rate, color);
  }

  function clearRing(node) {
    node.style?.removeProperty("--heat");
    node.classList?.remove("has-heat", "hot");

    const ring = node.querySelector?.(".heat-ring");
    if (!ring) return;

    ring.style?.setProperty("--heat-angle", "0deg");
    ring.style?.setProperty("--heat-progress", "0%");
    ring.style?.setProperty("--usage-angle", "0deg");
    ring.style?.setProperty("--usage-pct", "0%");
    ring.style?.setProperty("--ring-progress", "0deg");
    delete ring.dataset.rate;
    ring.removeAttribute?.("role");
    ring.removeAttribute?.("aria-label");
    ring.setAttribute?.("aria-hidden", "true");
    setSvgArc(ring, 0, "currentColor");
  }

  function formatCompact(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return "0";

    const units = [
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ];
    const unit = units.find(([threshold]) => amount >= threshold);
    if (!unit) return Math.round(amount).toLocaleString("en-US");

    const [threshold, suffix] = unit;
    const scaled = amount / threshold;
    const digits = scaled >= 10 ? 1 : 2;
    return `${Number(scaled.toFixed(digits))}${suffix}`;
  }

  function statusbarFor(nodesOrContainer, nodes) {
    const ownerDocument = nodesOrContainer?.ownerDocument ?? nodes[0]?.ownerDocument;
    if (ownerDocument?.getElementById) return ownerDocument.getElementById("statusbar");
    return typeof document === "undefined" ? null : document.getElementById("statusbar");
  }

  function appendMetric(statusbar, kind, label, value) {
    const documentRef = statusbar.ownerDocument;
    const metric = documentRef.createElement("span");
    metric.className = `statusbar__metric statusbar__metric--${kind}`;
    if (STATUS_NAMES.includes(kind)) metric.dataset.status = kind;

    const labelElement = documentRef.createElement("span");
    labelElement.className = "statusbar__label";
    labelElement.textContent = `${label} `;

    const valueElement = documentRef.createElement("strong");
    valueElement.className = "statusbar__value";
    valueElement.textContent = String(value);

    metric.append(labelElement, valueElement);
    statusbar.append(metric);
  }

  function renderStatusbar(usageTile, nodesOrContainer, nodes) {
    const statusbar = statusbarFor(nodesOrContainer, nodes);
    if (!statusbar) return;

    const counts = { active: 0, idle: 0, stale: 0 };
    for (const node of nodes) {
      const status = nodeStatus(node);
      if (status) counts[status] += 1;
    }

    const tokenBurn = Array.isArray(usageTile?.hosts)
      ? usageTile.hosts.reduce((total, host) => {
          const burn = Number(host?.burn_per_hr);
          return total + (Number.isFinite(burn) ? burn : 0);
        }, 0)
      : 0;
    const accountCount = Array.isArray(usageTile?.accounts) ? usageTile.accounts.length : 0;

    statusbar.replaceChildren();
    appendMetric(statusbar, "active", "active", counts.active);
    appendMetric(statusbar, "idle", "idle", counts.idle);
    appendMetric(statusbar, "stale", "stale", counts.stale);
    appendMetric(statusbar, "burn", "token burn", `${formatCompact(tokenBurn)} tok/h`);
    appendMetric(statusbar, "accounts", "accounts", accountCount);
    statusbar.setAttribute(
      "aria-label",
      `Fleet status: ${counts.active} active, ${counts.idle} idle, ${counts.stale} stale, ${formatCompact(tokenBurn)} tokens per hour, ${accountCount} accounts`,
    );
  }

  window.renderUsage = function renderUsage(usageTile, nodesOrContainer) {
    const nodes = resolveNodes(nodesOrContainer);
    const usageByOracle = new Map();

    if (Array.isArray(usageTile?.oracles)) {
      for (const usage of usageTile.oracles) {
        const handle = normalizeHandle(usage?.oracle);
        if (handle && clampRate(usage?.rate_5h_pct) !== null) usageByOracle.set(handle, usage);
      }
    }

    for (const node of nodes) {
      const usage = usageByOracle.get(nodeHandle(node));
      if (usage) renderRing(node, usage);
      else clearRing(node);
    }

    renderStatusbar(usageTile, nodesOrContainer, nodes);
  };
})();
