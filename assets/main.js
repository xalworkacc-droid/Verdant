/* VERDANT 1.0 — no third-party runtime dependencies or live AI calls. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)],
    root = document.documentElement,
    reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reduce.matches;
  try {
    paused = paused || localStorage.getItem("verdant-motion") === "paused";
  } catch (_) {
    /* Optional storage */
  }
  function motion() {
    root.classList.toggle("paused", paused);
    $("#motion").setAttribute("aria-pressed", String(paused));
    $("#motion").setAttribute(
      "aria-label",
      paused ? "Resume ambient motion" : "Pause ambient motion",
    );
    $("#motion").textContent = paused ? "▷" : "Ⅱ";
  }
  motion();
  $("#motion").onclick = () => {
    paused = !paused;
    motion();
    try {
      localStorage.setItem("verdant-motion", paused ? "paused" : "playing");
    } catch (_) {}
  };
  reduce.addEventListener?.("change", (e) => {
    paused = e.matches;
    motion();
  });
  function closeMenu() {
    $("#mobile").hidden = true;
    $("#menu").setAttribute("aria-expanded", "false");
    $("#menu").setAttribute("aria-label", "Open menu");
  }
  $("#menu").onclick = () => {
    const open = $("#menu").getAttribute("aria-expanded") === "true";
    $("#mobile").hidden = open;
    $("#menu").setAttribute("aria-expanded", String(!open));
    $("#menu").setAttribute("aria-label", open ? "Open menu" : "Close menu");
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#mobile").hidden) {
      closeMenu();
      $("#menu").focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("header")) closeMenu();
  });
  window.addEventListener("resize", () => {
    if (innerWidth > 760) closeMenu();
  });
  const pagesMenu = $(".pages-menu");
  pagesMenu.addEventListener("toggle", () => { if (pagesMenu.open) closeMenu(); });
  $("#menu").addEventListener("click", () => { pagesMenu.open = false; });
  document.addEventListener("click", (e) => {
    if (!pagesMenu.contains(e.target)) pagesMenu.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pagesMenu.open) {
      pagesMenu.open = false;
      pagesMenu.querySelector("summary").focus();
    }
  });
  let scheduled = false;
  function progress() {
    const max = root.scrollHeight - innerHeight;
    $(".progress").style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
    scheduled = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        requestAnimationFrame(progress);
        scheduled = true;
      }
    },
    { passive: true },
  );
  progress();
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.06 },
    );
    $$(".section-head,.service-card,.work-card,.process article").forEach(
      (el) => {
        el.classList.add("reveal");
        obs.observe(el);
      },
    );
    root.classList.add("js");
  }
  if ($(".hero") && matchMedia("(pointer:fine)").matches) {
    $(".hero").onpointermove = (e) => {
      if (paused || reduce.matches) return;
      const r = $(".hero").getBoundingClientRect();
      $(".hero-art").style.setProperty(
        "--x",
        (e.clientX / r.width - 0.5) * 18 + "px",
      );
      $(".hero-art").style.setProperty(
        "--y",
        ((e.clientY - r.top) / r.height - 0.5) * 15 + "px",
      );
    };
    $(".hero").onpointerleave = () => {
      $(".hero-art").style.setProperty("--x", "0px");
      $(".hero-art").style.setProperty("--y", "0px");
    };
  }
  /* Cancellable state machine. The human approval branch is real UI logic. */
  if ($("#run")) {
    const data = {
      launch: {
        name: "PRODUCT LAUNCH",
        count: 12,
        roles: ["Strategy", "Build", "Research", "Testing"],
        steps: [
          "Brief accepted. Mapping goals and constraints.",
          "Twelve work packages assigned by the orchestrator.",
          "Agents are researching, building, and validating.",
          "Draft ready. Waiting for your review.",
        ],
        title: "A launch plan, ready for the next step.",
        output:
          "Discovery brief → interface prototype → implementation plan → QA checklist. Twelve simulated tasks completed. A real team would validate scope and release criteria.",
      },
      support: {
        name: "SUPPORT AUTOMATION",
        count: 18,
        roles: ["Routing", "Response", "Knowledge", "Quality"],
        steps: [
          "Sample requests accepted. Classifying urgency.",
          "Eighteen sample requests assigned to specialists.",
          "Context retrieved. Replies drafted. Uncertainty flagged.",
          "Four simulated escalations identified. Waiting for review.",
        ],
        title: "Routine questions handled. Complex ones elevated.",
        output:
          "18 simulated requests: 14 draft responses and 4 escalations. Knowledge references and a review queue are prepared. No customer messages were sent.",
      },
      insights: {
        name: "BUSINESS INTELLIGENCE",
        count: 15,
        roles: ["Analysis", "Synthesis", "Sources", "Verify"],
        steps: [
          "Brief accepted. Identifying questions and sources.",
          "Fifteen collection and verification tasks created.",
          "Agents connect signals and cross-check evidence.",
          "Assumptions labeled. Waiting for an analyst decision.",
        ],
        title: "The signal is clearer.",
        output:
          "15 simulated tasks produced a source map, pattern summary, and evidence checklist. This is an illustrative workflow, not analysis of real company data.",
      },
    };
    let key = "launch",
      timer,
      clock,
      token = 0,
      running = false,
      pending = null,
      revisions = 0,
      active = 0,
      start = 0;
    const startClock = () => {
      start = performance.now();
      clock = setInterval(
        () =>
          ($("#elapsed").textContent =
            ((active + performance.now() - start) / 1000).toFixed(1) + "s"),
        100,
      );
    };
    const stopClock = () => {
      if (clock) {
        active += performance.now() - start;
        clearInterval(clock);
        clock = null;
      }
      $("#elapsed").textContent = (active / 1000).toFixed(1) + "s";
    };
    function reset() {
      token++;
      clearTimeout(timer);
      stopClock();
      active = 0;
      running = false;
      pending = null;
      $(".lab").classList.remove("running");
      $("#run").disabled = false;
      $("#agents").disabled = false;
      $("#run").textContent = "Run the mission ↗";
      $("#reviewGate").hidden = true;
      $("#result").hidden = true;
      $("#state").textContent = "READY";
      $("#tasks").textContent = "00 / " + data[key].count;
      $("#elapsed").textContent = "0.0s";
      $("#log").textContent = "SYSTEM / All systems ready. Your move.";
      $$(".node").forEach((n) => n.classList.remove("active"));
    }
    $("#reset").onclick = reset;
    $("#agents").oninput = () => {
      reset();
      $("#agentValue").value = $("#agents").value;
      $("#agentMetric").textContent = $("#agents").value.padStart(2, "0");
    };
    $$("[data-mission]").forEach(
      (b) =>
        (b.onclick = () => {
          key = b.dataset.mission;
          reset();
          $$("[data-mission]").forEach((t) => {
            t.classList.toggle("active", t === b);
            t.setAttribute("aria-pressed", String(t === b));
          });
          $("#missionName").textContent = data[key].name;
          $$(".agent small").forEach(
            (n, i) => (n.textContent = data[key].roles[i]),
          );
        }),
    );
    $("#run").onclick = () => {
      if (running) return;
      reset();
      running = true;
      revisions = 0;
      $("#run").disabled = true;
      $("#agents").disabled = true;
      $("#run").textContent = "Mission in progress ↗";
      $(".lab").classList.add("running");
      startClock();
      const id = token,
        d = data[key],
        delay = 750 + 2500 / Number($("#agents").value);
      function step(i) {
        if (id !== token) return;
        if (i < 4) {
          $("#state").textContent = [
            "MAPPING",
            "DECOMPOSING",
            "EXECUTING",
            "AWAITING YOU",
          ][i];
          $("#tasks").textContent =
            String(Math.floor((d.count * i) / 4)).padStart(2, "0") +
            " / " +
            d.count;
          $("#log").textContent = `0${i + 1} / ${d.steps[i]}`;
          $$(".node").forEach((n) =>
            n.classList.toggle("active", Number(n.dataset.step) <= i),
          );
          if (i === 3) {
            stopClock();
            $(".lab").classList.remove("running");
            $("#reviewGate").hidden = false;
            $("#run").textContent = "Awaiting your review";
            pending = (ok) => {
              pending = null;
              $("#reviewGate").hidden = true;
              if (ok) step(4);
              else {
                revisions++;
                $("#state").textContent = "REVISING";
                $("#log").textContent =
                  `REVISE / Pass ${revisions}: rechecking evidence and refining output.`;
                $("#run").textContent = "Revision in progress";
                $(".lab").classList.add("running");
                startClock();
                timer = setTimeout(() => step(3), delay * 1.5);
              }
            };
          } else timer = setTimeout(() => step(i + 1), delay);
        } else {
          running = false;
          $("#run").disabled = false;
          $("#agents").disabled = false;
          $("#run").textContent = "Run it again ↗";
          $("#state").textContent = "COMPLETE";
          $("#tasks").textContent = `${d.count} / ${d.count}`;
          $("#log").textContent =
            `APPROVED / You approved the handoff after ${revisions} revision(s).`;
          const h = document.createElement("h3"),
            p = document.createElement("p");
          h.textContent = d.title;
          p.textContent = d.output;
          $("#result").replaceChildren(h, p);
          $("#result").hidden = false;
        }
      }
      step(0);
    };
    $("#approve").onclick = () => pending?.(true);
    $("#revise").onclick = () => pending?.(false);
    window.addEventListener("pagehide", reset);
  }
  $$("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        $$("[data-filter]").forEach((t) => {
          t.classList.toggle("active", t === b);
          t.setAttribute("aria-pressed", String(t === b));
        });
        $$("[data-category]").forEach((c) => {
          c.hidden =
            b.dataset.filter !== "all" &&
            c.dataset.category !== b.dataset.filter;
          c.classList.add("visible");
        });
      }),
  );
  if ($("#hours")) {
    const update = () => {
      const h = Number($("#hours").value),
        s = Number($("#share").value);
      $("#hoursValue").value = h + " hours";
      $("#shareValue").value = s + "%";
      $("#saved").textContent = Math.round(((h * s) / 100) * 52).toLocaleString(
        "en-US",
      );
    };
    $("#hours").oninput = update;
    $("#share").oninput = update;
    update();
  }
  /* Local brief only. Never insert user input as HTML. */
  if ($("#briefForm")) {
    let text = "";
    const serviceMap = {
      agents: "AI agents",
      software: "Intelligent software",
      vision: "Computer vision",
    };
    const serviceKey = new URLSearchParams(location.search).get("service");
    const service = Object.prototype.hasOwnProperty.call(serviceMap, serviceKey)
      ? serviceMap[serviceKey] : null;
    const serviceInput = $$("input[name=service]").find((r) => r.value === service);
    if (serviceInput) serviceInput.checked = true;
    $("#briefForm").oninput = () => {
      $("#brief").setCustomValidity("");
      $("#name").setCustomValidity("");
      $("#briefResult").hidden = true;
      text = "";
    };
    $("#briefForm").onsubmit = (e) => {
      e.preventDefault();
      if (!$("#name").value.trim()) {
        $("#name").setCustomValidity("Please enter your name.");
        $("#name").reportValidity();
        return;
      }
      if ($("#brief").value.trim().length < 20) {
        $("#brief").setCustomValidity(
          "Enter at least 20 meaningful characters.",
        );
        $("#brief").reportValidity();
        return;
      }
      if (!e.target.reportValidity()) return;
      const d = new FormData(e.target);
      text = [
        "VERDANT / PROJECT BRIEF",
        "Created locally. No inquiry has been sent.",
        ...["name", "email", "company", "service", "budget", "brief"].map(
          (k) =>
            k.toUpperCase() + ": " + String(d.get(k) || "Not specified").trim(),
        ),
      ].join("\n\n");
      $("#briefResult").hidden = false;
      $("#briefResult").scrollIntoView({
        behavior: paused ? "instant" : "smooth",
        block: "nearest",
      });
    };
    $("#download").onclick = () => {
      if (!text) return;
      const url = URL.createObjectURL(
          new Blob([text], { type: "text/plain;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "verdant-project-brief.txt";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }
  /* Query-driven content uses a fixed local allowlist. */
  if ($("#caseTitle")) {
    const cases = {
      signal: [
        "Signal",
        "Clarity from complexity.",
        "AGENTIC AI",
        "Decision-ready business insights.",
        "The information exists. The clarity doesn’t.",
        "Business insights sit across spreadsheets, documents, and conversations. Signal brings these sources into one workspace.",
        "Research gathers sources. Analysis identifies patterns. Verification checks evidence. A human reviewer decides what is ready.",
      ],
      sentinel: [
        "Sentinel",
        "Awareness at the edge.",
        "COMPUTER VISION",
        "Visual events become timely signals.",
        "Recording is only the beginning.",
        "Operations teams cannot watch every camera continuously. Sentinel surfaces potential issues for a human operator.",
        "Edge inference processes signals. Rules group events by zone and threshold. Operators review and choose the next action.",
      ],
      relay: [
        "Relay",
        "From request to resolution.",
        "DIGITAL PRODUCTS",
        "Requests, context, and decisions in one workspace.",
        "The handoff is the hard part.",
        "Requests lose context across teams. Relay keeps the question, evidence, and next action together.",
        "Routing classifies requests. Knowledge retrieval provides context. Drafts are prepared for a person to approve, edit, or escalate.",
      ],
    };
    const projectKey = new URLSearchParams(location.search).get("project");
    const d = Object.prototype.hasOwnProperty.call(cases, projectKey)
      ? cases[projectKey] : cases.signal;
    [
      "caseTitle",
      "caseTagline",
      "caseCategory",
      "caseIntro",
      "caseHeading",
      "caseProblem",
      "caseSystem",
    ].forEach((id, i) => ($("#" + id).textContent = d[i]));
    $("#bannerLabel").textContent =
      d[0].toUpperCase() + " / CONNECTED INTELLIGENCE";
    const artwork = {
      Signal: ["intelligence-knot.webp", "Abstract AI-generated sculpture, preview only"],
      Sentinel: ["sentinel-stack.webp", "Abstract AI-generated sculpture, preview only"],
      Relay: ["signal-ribbon.webp", "Abstract AI-generated sculpture, preview only"]
    }[d[0]];
    $("#caseArtwork").src = "assets/" + artwork[0];
    $("#caseArtwork").alt = artwork[1];
    document.title = d[0] + " — Concept study | Verdant";
  }
  /* Lightweight connected-signal data visualization. */
  if ($("#signals")) {
    const c = $("#signals"),
      ctx = c.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0,
      t = 0,
      visible = true;
    const pts = Array.from({ length: 64 }, (_, i) => ({
      x: Math.sin(i * 127.1) * 6.28,
      y: Math.cos(i * 73.7) * 6.28,
    }));
    function resize() {
      const r = c.getBoundingClientRect(),
        d = Math.min(devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      c.width = w * d;
      c.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    resize();
    new ResizeObserver(resize).observe(c);
    if ("IntersectionObserver" in window)
      new IntersectionObserver(
        (es) => (visible = es[0].isIntersecting),
      ).observe(c);
    function draw() {
      if (visible && !document.hidden) {
        if (!paused && !reduce.matches) t += 0.004;
        ctx.clearRect(0, 0, w, h);
        const p = pts.map((a, i) => ({
          x: w * (0.5 + Math.sin(a.x + t + i * 0.07) * 0.42),
          y: h * (0.5 + Math.cos(a.y + t * 0.7) * 0.38),
        }));
        p.forEach((a, i) => {
          p.slice(i + 1).forEach((b) => {
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 120) {
              ctx.strokeStyle = `rgba(185,250,57,${(1 - d / 120) * 0.3})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          });
          ctx.fillStyle = "#b9fa39";
          ctx.beginPath();
          ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      requestAnimationFrame(draw);
    }
    draw();
  }
})();
