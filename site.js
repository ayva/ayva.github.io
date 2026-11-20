function drawHero(ctx, w, h, t, css) {
  var gap = 22;
  var size = 2;
  var dot = css("--dot");
  var lit = css("--dot-lit");
  var cols = Math.ceil(w / gap) + 1;
  var rows = Math.ceil(h / gap) + 1;
  var ox = (w - (cols - 1) * gap) / 2;
  var oy = (h - (rows - 1) * gap) / 2;

  ctx.fillStyle = dot;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      ctx.fillRect(ox + c * gap - size / 2, oy + r * gap - size / 2, size, size);
    }
  }

  ctx.fillStyle = lit;
  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var sweep = Math.sin(col * 0.16 + row * 0.1 - t * 0.9);
      var noise = 0.5 + 0.5 * Math.sin(col * 12.9898 + row * 78.233);
      var v = Math.pow(Math.max(0, sweep), 10) * noise;
      if (v < 0.04) continue;
      var s = size + v * 3;
      ctx.globalAlpha = Math.min(1, v * 1.1);
      ctx.fillRect(ox + col * gap - s / 2, oy + row * gap - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;
}

function boot() {
  var root = document.documentElement;
  root.classList.add("js");

  var toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    var setLabel = function () {
      var dark = root.classList.contains("dark");
      var next = dark ? "Switch to light mode" : "Switch to dark mode";
      toggle.title = next;
      toggle.setAttribute("aria-label", next);
    };

    toggle.addEventListener("click", function () {
      var dark = !root.classList.contains("dark");
      root.classList.toggle("dark", dark);
      try {
        localStorage.setItem("theme", dark ? "dark" : "light");
      } catch (e) {}
      setLabel();
    });

    setLabel();
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    var reveals = document.querySelectorAll(".reveal");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px" }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  document.querySelectorAll(".spotlight").forEach(function (card) {
    card.addEventListener("pointermove", function (event) {
      if (reduce || event.pointerType !== "mouse") return;
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      card.style.setProperty("--mx", (100 * x) / rect.width + "%");
      card.style.setProperty("--my", (100 * y) / rect.height + "%");
      var px = x / rect.width - 0.5;
      var py = y / rect.height - 0.5;
      card.style.setProperty("--ry", (px * 5).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-py * 5).toFixed(2) + "deg");
    });
    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });

  document.querySelectorAll("[data-timeline]").forEach(initTimeline);

  function initTimeline(timeline) {
    var visible = timeline.querySelector("[data-timeline-visible]");
    var more = timeline.querySelector("[data-timeline-more]");
    var moreList = more && more.querySelector("ul");
    var button = timeline.querySelector("[data-timeline-toggle]");
    var label = timeline.querySelector("[data-timeline-label]");
    if (!visible || !more || !moreList || !button || !label) return;

    while (visible.children.length > 3) {
      moreList.appendChild(visible.children[3]);
    }

    var count = moreList.children.length;
    if (count === 0) {
      button.hidden = true;
      return;
    }

    var open = false;
    var sync = function () {
      more.classList.toggle("is-open", open);
      button.hidden = false;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      label.textContent = open ? "Show less" : "Show " + count + " more";
      if (open) moreList.removeAttribute("inert");
      else moreList.setAttribute("inert", "");
    };

    sync();
    button.addEventListener("click", function () {
      open = !open;
      sync();
    });
  }

  document.querySelectorAll("[data-hero-canvas]").forEach(function (container) {
    if (typeof drawHero === "function") runCanvas(container, drawHero);
  });

  function runCanvas(container, draw) {
    var canvas = container.querySelector("canvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var w = 0;
    var h = 0;
    var raf = 0;
    var clock = 0;
    var last = 0;
    var onScreen = true;
    var styles = getComputedStyle(root);
    var css = function (name) {
      return styles.getPropertyValue(name).trim();
    };

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function paint() {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, clock, css);
    }

    function frame(now) {
      clock += Math.min(now - last, 50) / 1000;
      last = now;
      paint();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || motion.matches || !onScreen || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    clock = 6;
    paint();
    window.setTimeout(function () {
      canvas.classList.add("is-on");
    }, motion.matches ? 0 : 120);

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        resize();
        paint();
      }).observe(container);
    }

    new MutationObserver(function () {
      paint();
    }).observe(root, { attributes: true, attributeFilter: ["class"] });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start();
        else stop();
      }).observe(container);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    if (motion.addEventListener) {
      motion.addEventListener("change", function () {
        if (motion.matches) {
          stop();
          paint();
        } else start();
      });
    }

    start();
  }
}

boot();
