(function () {
  "use strict";

  const STATUSES = new Set(["active", "idle", "stale", "pinned", "error"]);
  const STATUS_ORDER = new Map([
    ["active", 0],
    ["idle", 1],
    ["pinned", 2],
    ["error", 3],
    ["stale", 4],
  ]);

  function element(tagName, className, text) {
    const node = document.createElement(tagName);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;

    return node;
  }

  function displayStatus(oracle) {
    const status = String(oracle.status || "").toLowerCase();
    return STATUSES.has(status) ? status : "stale";
  }

  function idleSortValue(idleSec) {
    if (idleSec === null || idleSec === undefined || idleSec === "") return Infinity;

    const seconds = Number(idleSec);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : Infinity;
  }

  function byActivity(left, right) {
    const statusOrder = STATUS_ORDER.get(displayStatus(left)) - STATUS_ORDER.get(displayStatus(right));
    return statusOrder || idleSortValue(left.idleSec) - idleSortValue(right.idleSec);
  }

  function idleLabel(idleSec) {
    if (idleSec === null || idleSec === undefined || idleSec === "") return "—";

    const seconds = Number(idleSec);

    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    if (seconds === 0) return "live";

    return `${Math.floor(seconds / 60)}m`;
  }

  function renderOracle(oracle) {
    const name = String(oracle.oracle || "unknown");
    const modelTier = String(oracle.modelTier || "").trim();
    const annotation = String(oracle.annotation || "");
    const status = displayStatus(oracle);

    const node = element("article", `node ${status} status-${status}`);
    node.dataset.oracle = name;
    node.dataset.status = status;

    const heatRing = element("span", "heat-ring");
    heatRing.setAttribute("aria-hidden", "true");

    const content = element("div", "node-content");
    const heading = element("div", "node-heading");

    const statusDot = element("span", `status-dot ${status} status-${status}`);
    statusDot.setAttribute("role", "img");
    statusDot.setAttribute("aria-label", `${status} status`);

    const oracleName = element("strong", "oracle-name", name);
    heading.append(statusDot, oracleName);

    if (modelTier && modelTier.toLowerCase() !== "unknown") {
      heading.append(element("span", "model-chip", modelTier));
    }

    const details = element("div", "node-details");
    const idle = element("span", "idle-label", idleLabel(oracle.idleSec));
    const note = element("span", "annotation", annotation);
    note.title = annotation;

    details.append(idle, note);
    content.append(heading, details);
    node.append(heatRing, content);

    return node;
  }

  window.renderTopology = function renderTopology(census, container) {
    const nodes = [];
    const regions = document.createDocumentFragment();
    const displays = Array.isArray(census && census.displays) ? census.displays : [];

    for (const display of displays) {
      const region = element("section", "region");
      region.dataset.display = String(display.name || "unassigned");

      const regionHeader = element("header", "region-header");
      regionHeader.append(element("h2", "region-name", region.dataset.display));
      region.append(regionHeader);

      const spaces = Array.isArray(display.spaces) ? display.spaces : [];
      for (const spaceData of spaces) {
        const space = element("section", "space");
        space.dataset.space = String(spaceData.name || "unknown");
        space.append(element("h3", "space-name", space.dataset.space));

        const grid = element("div", "node-grid");
        const oracles = Array.isArray(spaceData.oracles) ? [...spaceData.oracles].sort(byActivity) : [];

        for (const oracle of oracles) {
          const node = renderOracle(oracle || {});
          nodes.push(node);
          grid.append(node);
        }

        space.append(grid);
        region.append(space);
      }

      regions.append(region);
    }

    container.replaceChildren(regions);
    return nodes;
  };
})();
