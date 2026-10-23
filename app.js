(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const screens = $$(".screen");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = { messageIndex: 0, groundStep: 0, breathing: false, breathTimer: null, audioOn: false, audioContext: null, ambientNodes: null };
  const groundSteps = [
    { count: "A gentle start · no pressure", title: "Can you notice one thing around you?", detail: "Look for a familiar shape, a soft blanket, or the light coming through your window. You don't need to type an answer." },
    { count: "A little more grounded", title: "Can you feel one thing supporting you?", detail: "Maybe it's your pillow, the mattress beneath you, or your feet touching the floor. There's no right or wrong answer." },
    { count: "You're taking your time", title: "Can you notice one sound, or a moment of quiet?", detail: "You might hear a fan, distant traffic, or simply the quiet of the room. There's no need to force yourself to feel different." }
  ];
  const storage = {
    get(key, fallback) {
      try { const value = localStorage.getItem("mochi-" + key); return value === null ? fallback : value; }
      catch (_) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem("mochi-" + key, String(value)); } catch (_) {} },
    remove(key) { try { localStorage.removeItem("mochi-" + key); } catch (_) {} }
  };
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function go(id) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains("screen")) return;
    stopBreathing();
    screens.forEach(screen => {
      const active = screen === target;
      screen.classList.toggle("active", active);
      screen.hidden = !active;
    });
    if (id === "grounding") resetGrounding();
    window.scrollTo({ top: 0, behavior: document.body.classList.contains("reduce-motion") ? "auto" : "smooth" });
    const heading = $("h1, h2", target);
    if (heading) heading.setAttribute("tabindex", "-1");
    if (heading) setTimeout(() => heading.focus({ preventScroll: true }), 20);
  }
  $$("[data-go]").forEach(button => button.addEventListener("click", () => {
    const dest = button.dataset.go;
    if (dest === "home" && state.audioOn) playChime();
    go(dest);
  }));
  function resetGrounding() {
    state.groundStep = 0;
    renderGroundStep();
  }
  function renderGroundStep() {
    const step = groundSteps[state.groundStep];
    $("#ground-count").textContent = step.count;
    $("#ground-prompt").textContent = step.title;
    $("#ground-detail").textContent = step.detail;
    $$(".progress-dots .dot").forEach((dot, i) => dot.classList.toggle("current", i === state.groundStep));
    $("#ground-next").textContent = state.groundStep === groundSteps.length - 1 ? "I'm ready for a little comfort" : "I'm ready for the next step";
  }
  $("#ground-next").addEventListener("click", () => {
    if (state.groundStep < groundSteps.length - 1) {
      state.groundStep++;
      renderGroundStep();
      if (state.audioOn) playChime();
    } else {
      go("breathing");
    }
  });
  function renderMessage() {
    const messages = window.MOCHI_MESSAGES || [];
    if (!messages.length) return;
    const message = messages[state.messageIndex % messages.length];
    $("#letter-title").textContent = message.title;
    $("#letter-message").textContent = message.title;
    $(".letter-note").textContent = message.body;
  }
  $("#another-letter").addEventListener("click", () => {
    const messages = window.MOCHI_MESSAGES || [];
    if (!messages.length) return;
    state.messageIndex = (state.messageIndex + 1) % messages.length;
    renderMessage();
    if (state.audioOn) playChime();
  });
  function stopBreathing() {
    state.breathing = false;
    if (state.breathTimer) clearInterval(state.breathTimer);
    state.breathTimer = null;
    const orb = $("#breath-orb");
    if (orb) orb.classList.remove("breathing");
    const toggle = $("#breath-toggle");
    if (toggle) toggle.textContent = "Start gentle guide";
  }
  $("#breath-toggle").addEventListener("click", () => {
    const orb = $("#breath-orb");
    if (state.breathing) {
      stopBreathing();
      $("#breath-caption").textContent = "The guide is paused. Let your breathing be natural.";
      return;
    }
    state.breathing = true;
    orb.classList.add("breathing");
    $("#breath-toggle").textContent = "Pause guide";
    const captions = ["Breathe in gently", "Let the breath leave naturally", "Rest for a moment"];
    let index = 0;
    $("#breath-caption").textContent = captions[index];
    state.breathTimer = setInterval(() => {
      index = (index + 1) % captions.length;
      $("#breath-caption").textContent = captions[index];
      if (state.audioOn) playChime(0.035);
    }, 4000);
  });
  $("#goodnight").addEventListener("click", () => {
    $("#goodnight-note").textContent = "Goodnight, Mochi. You can come back here whenever you want. ♡";
    if (state.audioOn) playChime();
    document.body.classList.add("goodnight");
    setTimeout(() => document.body.classList.remove("goodnight"), 900);
  });

  // Sound is generated locally with Web Audio; no sound files or network requests required.
  function ensureAudio() {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { showToast("Audio isn't available in this browser, but everything else still works."); return false; }
      state.audioContext = new AudioContext();
    }
    if (state.audioContext.state === "suspended") state.audioContext.resume();
    return true;
  }
  function playChime(volume = 0.055) {
    if (!state.audioOn || !ensureAudio()) return;
    const ctx = state.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + .28);
    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .55);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + .58);
  }
  function startAmbient() {
    if (!ensureAudio() || state.ambientNodes) return;
    const ctx = state.audioContext;
    const master = ctx.createGain();
    master.gain.value = 0.012;
    master.connect(ctx.destination);
    const nodes = [];
    [110, 164.81, 220].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = frequency;
      gain.gain.value = i === 0 ? .48 : .2;
      lfo.type = "sine"; lfo.frequency.value = .06 + i * .025; lfoGain.gain.value = .08;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      osc.connect(gain); gain.connect(master);
      osc.start(); lfo.start();
      nodes.push(osc, gain, lfo, lfoGain);
    });
    state.ambientNodes = { master, nodes };
  }
  function stopAmbient() {
    if (!state.ambientNodes) return;
    state.ambientNodes.nodes.forEach(node => { try { node.stop ? node.stop() : node.disconnect(); } catch (_) {} });
    try { state.ambientNodes.master.disconnect(); } catch (_) {}
    state.ambientNodes = null;
  }
  function setSound(on) {
    state.audioOn = Boolean(on);
    storage.set("sound", state.audioOn ? "on" : "off");
    $("#sound-toggle").setAttribute("aria-pressed", String(state.audioOn));
    $("#sound-toggle").setAttribute("aria-label", state.audioOn ? "Turn off gentle sounds" : "Turn on gentle sounds");
    $("#sound-toggle").title = state.audioOn ? "Gentle sounds are on" : "Gentle sounds are off";
    $("#sound-icon").textContent = state.audioOn ? "♫" : "♩";
    $("#settings-sound").checked = state.audioOn;
    if (state.audioOn) { startAmbient(); playChime(); }
    else { stopAmbient(); }
  }
  $("#sound-toggle").addEventListener("click", () => setSound(!state.audioOn));
  $("#settings-sound").addEventListener("change", event => setSound(event.target.checked));
  $("#reduce-motion").addEventListener("change", event => {
    document.body.classList.toggle("reduce-motion", event.target.checked);
    storage.set("reduce-motion", event.target.checked ? "on" : "off");
  });
  $("#clear-settings").addEventListener("click", () => {
    ["sound", "reduce-motion"].forEach(storage.remove);
    document.body.classList.toggle("reduce-motion", reducedMotionQuery.matches);
    $("#reduce-motion").checked = reducedMotionQuery.matches;
    setSound(false);
    showToast("Saved preferences reset on this device.");
  });
  // Honour the OS accessibility preference by default, unless the user saved a choice.
  const savedMotion = storage.get("reduce-motion", null);
  const reduceMotion = savedMotion === null ? reducedMotionQuery.matches : savedMotion === "on";
  document.body.classList.toggle("reduce-motion", reduceMotion);
  $("#reduce-motion").checked = reduceMotion;
  setSound(storage.get("sound", "off") === "on");
  renderMessage();

  // Avoid leaving audio playing when the page is hidden or closed.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopAmbient(); stopBreathing(); }
    else if (state.audioOn) startAmbient();
  });
  window.addEventListener("pagehide", () => { stopAmbient(); stopBreathing(); });
})();
