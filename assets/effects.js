/* VERDANT 1.1 — pointer-responsive plexus and routed SVG data packets.
   No external libraries. Rendering pauses off-screen, in hidden tabs, and with
   reduced motion or the site's motion toggle. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const stopped = () => root.classList.contains("paused") || reduced.matches;
  const NS = "http://www.w3.org/2000/svg";
  let frame = 0,
    last = 0,
    time = 0;
  const fx = document.createElement("div");
  fx.className = "ambient-fx";
  fx.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  canvas.id = "plexus";
  const glow = document.createElement("div");
  glow.className = "plexus-glow";
  fx.append(glow, canvas);
  document.body.prepend(fx);
  const ctx = canvas.getContext("2d");
  let width = 0,
    height = 0,
    particles = [];
  const pointer = { x: -9999, y: -9999, gx: 0, gy: 0, active: false };
  const linkRadius = 145,
    pointerRadius = 180;
  function resizePlexus() {
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(
      Math.min(115, Math.max(32, (width * height) / 12500)),
    );
    particles = Array.from({ length: count }, (_, i) => {
      const old = particles[i];
      if (old) {
        old.x = Math.min(width, old.x);
        old.y = Math.min(height, old.y);
        return old;
      }
      const angle = Math.random() * Math.PI * 2,
        speed = 0.15 + Math.random() * 0.35;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 0.8 + Math.random() * 1.7,
        phase: Math.random() * 6.28,
        lime: Math.random() < 0.34,
      };
    });
    drawPlexus(0);
    wake();
  }
  function drawPlexus(delta) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const moving = !stopped(),
      dt = moving ? delta : 0;
    for (const p of particles) {
      if (dt) {
        const dx = p.x - pointer.x,
          dy = p.y - pointer.y,
          d = Math.hypot(dx, dy);
        if (pointer.active && d > 0.1 && d < pointerRadius) {
          const force = (1 - d / pointerRadius) * 1.05 * dt;
          p.x += (dx / d) * force;
          p.y += (dy / d) * force;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.phase += 0.02 * dt;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.lime ? "185,250,57" : "197,215,181"},${0.36 + Math.sin(p.phase) * 0.16})`;
      ctx.fill();
    }
    ctx.lineWidth = 0.7;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j],
          d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkRadius) {
          ctx.strokeStyle = `rgba(176,207,146,${(1 - d / linkRadius) * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      if (pointer.active && moving) {
        const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (d < 220) {
          ctx.strokeStyle = `rgba(185,250,57,${(1 - d / 220) * 0.65})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
    }
    if (moving && pointer.active) {
      pointer.gx += (pointer.x - pointer.gx) * 0.12;
      pointer.gy += (pointer.y - pointer.gy) * 0.12;
      glow.style.transform = `translate(${pointer.gx - 260}px,${pointer.gy - 260}px)`;
    }
    glow.style.opacity = pointer.active && moving ? "1" : "0";
  }
  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch" || stopped()) return;
      if (!pointer.active) {
        pointer.gx = e.clientX;
        pointer.gy = e.clientY;
      }
      pointer.active = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      wake();
    },
    { passive: true },
  );
  function leave() {
    pointer.active = false;
    pointer.x = pointer.y = -9999;
    glow.style.opacity = "0";
  }
  document.addEventListener("pointerleave", leave);
  addEventListener("blur", leave);
  /* Each wire has its own path and packet set. Endpoints follow actual nodes
     instead of an approximate fixed viewBox, including after responsive resize. */
  const network = document.querySelector(".network");
  let wireVisible = true,
    edges = [],
    nodes = [],
    svg,
    picked = null,
    hovered = null;
  let wireState = "READY",
    previewStage = -1,
    routeKey = "",
    phase = 0;
  const descriptions = {
    input:
      "Your brief / Goals, context, constraints, and the outcome you want.",
    core: "Orchestrator / Decomposes the mission and routes work to specialist roles.",
    a: "Strategy / Defines the approach, scope, and acceptance criteria.",
    b: "Build / Turns the plan into an implementation draft.",
    c: "Research / Collects context and supporting evidence.",
    d: "Testing / Checks the result against the acceptance criteria.",
    review: "Human review / Approve the handoff or request a revision below.",
  };
  let detail;
  function make(tag, attrs = {}) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  }
  if (network) {
    svg = network.querySelector(".connections");
    svg.replaceChildren();
    const defs = make("defs"),
      filter = make("filter", {
        id: "wire-glow",
        x: "-100%",
        y: "-100%",
        width: "300%",
        height: "300%",
      });
    filter.append(
      make("feGaussianBlur", { stdDeviation: "3", result: "blur" }),
    );
    const merge = make("feMerge");
    merge.append(
      make("feMergeNode", { in: "blur" }),
      make("feMergeNode", { in: "SourceGraphic" }),
    );
    filter.append(merge);
    defs.append(filter);
    svg.append(defs);
    const keys = ["input", "core", "a", "b", "c", "d", "review"];
    nodes = keys.map((key) => {
      const old = network.querySelector(".node." + key),
        button = document.createElement("button");
      button.type = "button";
      button.className = old.className;
      button.dataset.step = old.dataset.step;
      button.innerHTML = old.innerHTML;
      button.dataset.wireNode = key;
      button.setAttribute("aria-label", descriptions[key]);
      old.replaceWith(button);
      button.addEventListener("pointerenter", () => {
        hovered = key;
        routeKey = "";
        wake();
      });
      button.addEventListener("pointerleave", () => {
        hovered = null;
        routeKey = "";
        wake();
      });
      button.addEventListener("focus", () => {
        hovered = key;
        routeKey = "";
        wake();
      });
      button.addEventListener("blur", () => {
        hovered = null;
        routeKey = "";
        wake();
      });
      button.addEventListener("click", () => {
        picked = picked === key ? null : key;
        detail.textContent = picked
          ? descriptions[key]
          : "Explore a node • Light follows the active route";
        routeKey = "";
        wake();
      });
      return { key, el: button };
    });
    detail = document.createElement("p");
    detail.className = "wire-detail";
    detail.setAttribute("role", "status");
    detail.textContent = "Explore a node • Light follows the active route";
    network.after(detail);
    const routes = [
      ["intake", "input", "core"],
      ...["a", "b", "c", "d"].map((k) => ["dispatch-" + k, "core", k]),
      ...["a", "b", "c", "d"].map((k) => ["collect-" + k, k, "review"]),
      ["revision", "review", "core"],
    ];
    edges = routes.map(([id, from, to]) => {
      const path = make("path", {
          class: "wire-edge",
          id: "wire-" + id,
          "data-route": id,
        }),
        g = make("g", { class: "wire-packets", "aria-hidden": "true" });
      const packets = [0, 0.5].map((offset) => {
        const c = make("circle", { r: "3.3", class: "wire-packet" });
        g.append(c);
        return { el: c, offset };
      });
      svg.append(path, g);
      return { id, from, to, path, packets, length: 0, live: false };
    });
    function resizeWires() {
      const r = network.getBoundingClientRect(),
        w = r.width,
        h = r.height;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const pos = {};
      nodes.forEach(({ key, el }) => {
        const b = el.getBoundingClientRect();
        pos[key] = {
          x: b.left + b.width / 2 - r.left,
          y: b.top + b.height / 2 - r.top,
          rx: b.width / 2 + 3,
          ry: b.height / 2 + 3,
        };
      });
      edges.forEach((e) => {
        const a = pos[e.from],
          b = pos[e.to];
        let path;
        if (e.id === "revision") {
          path = `M ${a.x} ${a.y + a.ry} C ${a.x} ${h - 4}, ${b.x + 50} ${h - 4}, ${b.x} ${b.y + b.ry}`;
        } else {
          const dx = b.x - a.x,
            dy = b.y - a.y,
            angle = Math.atan2(dy, dx),
            sx = a.x + Math.cos(angle) * a.rx,
            sy = a.y + Math.sin(angle) * a.ry,
            ex = b.x - Math.cos(angle) * b.rx,
            ey = b.y - Math.sin(angle) * b.ry;
          const bend = Math.max(30, Math.abs(dx) * 0.46);
          path = `M ${sx} ${sy} C ${sx + (dx >= 0 ? bend : -bend)} ${sy}, ${ex - (dx >= 0 ? bend : -bend)} ${ey}, ${ex} ${ey}`;
        }
        e.path.setAttribute("d", path);
        e.length = e.path.getTotalLength();
      });
      routeKey = "";
      drawWires(0);
      wake();
    }
    new ResizeObserver(resizeWires).observe(network);
    new IntersectionObserver((es) => {
      wireVisible = es[0].isIntersecting;
      if (wireVisible) wake();
    }).observe(network);
    const state = document.querySelector("#state");
    wireState = state.textContent;
    new MutationObserver(() => {
      wireState = state.textContent;
      routeKey = "";
      phase = 0;
      drawWires(0);
      wake();
    }).observe(state, { childList: true, subtree: true, characterData: true });
    resizeWires();
  }
  function drawWires(delta) {
    if (!svg || !wireVisible) return;
    const activeNode = hovered || picked;
    let mode = wireState;
    if (mode === "READY") {
      const stage = Math.floor(time / 2400) % 4;
      if (stage !== previewStage) {
        previewStage = stage;
        routeKey = "";
      }
      mode = ["MAPPING", "DECOMPOSING", "AWAITING YOU", "REVISING"][stage];
    }
    const key = mode + ":" + activeNode;
    if (key !== routeKey) {
      routeKey = key;
      const liveNodes = new Set();
      edges.forEach((e) => {
        e.live = activeNode
          ? e.from === activeNode || e.to === activeNode
          : mode === "MAPPING"
            ? e.id === "intake"
            : mode === "DECOMPOSING"
              ? e.id.startsWith("dispatch")
              : mode === "EXECUTING"
                ? e.id.startsWith("dispatch") || e.id.startsWith("collect")
                : mode === "REVISING"
                  ? e.id === "revision"
                  : e.id.startsWith("collect");
        e.path.classList.toggle("wire-live", e.live);
        e.path.classList.toggle("wire-return", e.id === "revision");
        e.path.classList.toggle("wire-done", wireState === "COMPLETE");
        if (e.live) {
          liveNodes.add(e.from);
          liveNodes.add(e.to);
        }
        e.packets.forEach((p) =>
          p.el.classList.toggle("return-packet", e.id === "revision"),
        );
      });
      nodes.forEach((n) => {
        n.el.classList.toggle("wire-preview", liveNodes.has(n.key));
        n.el.setAttribute("aria-pressed", String(picked === n.key));
      });
    }
    if (!stopped()) phase += delta / 95;
    edges.forEach((e) =>
      e.packets.forEach((p) => {
        const f = (phase + p.offset) % 1,
          pt = e.path.getPointAtLength(f * e.length);
        p.el.setAttribute("cx", pt.x);
        p.el.setAttribute("cy", pt.y);
        p.el.setAttribute(
          "opacity",
          e.live ? 0.35 + Math.sin(f * Math.PI) * 0.65 : 0,
        );
      }),
    );
  }
  function tick(now) {
    frame = 0;
    if (document.hidden) return;
    const elapsed = last ? Math.min(now - last, 40) : 16.67;
    last = now;
    if (!stopped()) time += elapsed;
    const delta = elapsed / 16.67;
    drawPlexus(delta);
    drawWires(delta);
    if (!stopped()) frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (!frame && !document.hidden) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function syncMotion() {
    if (stopped()) {
      leave();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      drawPlexus(0);
      drawWires(0);
    } else wake();
  }
  new MutationObserver(syncMotion).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  reduced.addEventListener?.("change", syncMotion);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    } else wake();
  });
  addEventListener("resize", resizePlexus, { passive: true });
  resizePlexus();
  wake();
})();
