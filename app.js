import { messages, groundingPrompts, letters } from "./messages.js";

const screens = [...document.querySelectorAll("[data-screen]")];
const dialog = document.querySelector(".settings-dialog");
const ambientToggle = document.querySelector("#ambient-toggle");
const ambientLabel = document.querySelector("#ambient-label");
const breathToggle = document.querySelector("#breath-toggle");
const breathCaption = document.querySelector("#breath-caption");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const settings = {
  sound: document.querySelector("#setting-sound"),
  chimes: document.querySelector("#setting-chimes"),
  dim: document.querySelector("#setting-dim")
};
const defaults = { sound: false, chimes: false, dim: false };
let preferences = { ...defaults };
let promptIndex = 0;
let ambienceNodes = null;
let activeLetterIndex = -1;
let breathingPaused = false;
let toastTimer;

try {
  const saved = JSON.parse(localStorage.getItem("mochi-sanctuary-settings") || "{}");
  preferences = { ...defaults, ...saved, sound: false };
} catch {
  preferences = { ...defaults };
}

function applyPreferences() {
  document.body.classList.toggle("dim-screen", preferences.dim);
  for (const [key, input] of Object.entries(settings)) input.checked = Boolean(preferences[key]);
}

function persistPreferences() {
  const toSave = { ...preferences, sound: false };
  try { localStorage.setItem("mochi-sanctuary-settings", JSON.stringify(toSave)); } catch { /* Private browsing can disable storage. */ }
}

for (const [key, message] of Object.entries(messages)) {
  document.querySelectorAll(`[data-message="${key}"]`).forEach((element) => { element.textContent = message; });
}

function playChime() {
  if (!preferences.chimes) return;
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 587.33;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.57);
    oscillator.onended = () => context.close();
  } catch { /* Sound is optional; the interface works without Web Audio. */ }
}

function stopAmbience() {
  if (!ambienceNodes) return;
  const { context, gain, oscillators, noiseSource } = ambienceNodes;
  try {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    oscillators.forEach((osc) => { try { osc.stop(); } catch { /* Already stopped. */ } });
    noiseSource.stop();
    context.close().catch(() => {});
  } catch { context.close().catch(() => {}); }
  ambienceNodes = null;
  preferences.sound = false;
  settings.sound.checked = false;
  ambientToggle?.setAttribute("aria-pressed", "false");
  if (ambientLabel) ambientLabel.textContent = "Turn on soft room sound";
}

function startAmbience() {
  stopAmbience();
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const master = context.createGain();
    master.gain.value = 0.0001;
    master.connect(context.destination);
    const low = context.createOscillator();
    const high = context.createOscillator();
    const toneGain = context.createGain();
    low.type = "sine";
    low.frequency.value = 110;
    high.type = "sine";
    high.frequency.value = 164.81;
    toneGain.gain.value = 0.09;
    low.connect(toneGain).connect(master);
    high.connect(toneGain);
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.045;
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 280;
    noiseGain.gain.value = 0.13;
    noise.connect(filter).connect(noiseGain).connect(master);
    low.start();
    high.start();
    noise.start();
    master.gain.setTargetAtTime(0.12, context.currentTime, 1.3);
    ambienceNodes = { context, gain: master, oscillators: [low, high], noiseSource: noise };
    preferences.sound = true;
    settings.sound.checked = true;
    ambientToggle?.setAttribute("aria-pressed", "true");
    if (ambientLabel) ambientLabel.textContent = "Turn off soft room sound";
  } catch {
    showToast("Soft room sound isn’t available in this browser.");
  }
}

function navigate(name) {
  if (name !== "quiet") stopAmbience();
  screens.forEach((screen) => {
    const active = screen.dataset.screen === name;
    screen.hidden = !active;
    screen.classList.toggle("active", active);
  });
  document.body.dataset.screen = name;
  window.scrollTo({ top: 0, behavior: motionQuery.matches ? "auto" : "smooth" });
  const heading = document.querySelector(`#screen-${name} h1`);
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    window.setTimeout(() => heading.focus({ preventScroll: true }), 80);
  }
}

function showToast(text) {
  const toast = document.querySelector("#toast");
  toast.textContent = text;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

function renderPrompt() {
  document.querySelector("#prompt-text").textContent = groundingPrompts[promptIndex];
  document.querySelector("#prompt-text").style.whiteSpace = "pre-line";
  document.querySelector("#prompt-count").textContent = `A gentle prompt · ${promptIndex + 1} of ${groundingPrompts.length}`;
  document.querySelector("#prompt-dots").innerHTML = groundingPrompts.map((_, i) =>
    `<span class="progress-dot${i === promptIndex ? " current" : ""}${i < promptIndex ? " done" : ""}"></span>`
  ).join("");
  const next = document.querySelector("#next-prompt");
  next.textContent = promptIndex === groundingPrompts.length - 1 ? "Finish gently" : "Next";
}

function renderLetters() {
  const options = document.querySelector("#letter-options");
  options.replaceChildren();
  letters.forEach((letter, index) => {
    const button = document.createElement("button");
    const seal = document.createElement("span");
    const title = document.createElement("span");
    const arrow = document.createElement("span");
    button.type = "button";
    button.className = "letter-option";
    seal.className = "letter-option-seal";
    seal.setAttribute("aria-hidden", "true");
    seal.textContent = "♥";
    title.textContent = letter.title;
    arrow.className = "choice-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(seal, title, arrow);
    button.addEventListener("click", () => openLetter(index));
    options.append(button);
  });
}

function openLetter(index) {
  activeLetterIndex = index;
  document.querySelector("#letter-title").textContent = letters[index].title;
  document.querySelector("#letter-body").textContent = letters[index].body;
  const wrap = document.querySelector("#envelope-wrap");
  wrap.classList.remove("opened");
  navigate("letter");
  window.requestAnimationFrame(() => window.setTimeout(() => wrap.classList.add("opened"), 60));
}

function updateBreathing() {
  const isStatic = motionQuery.matches;
  document.body.classList.toggle("reduced-motion", isStatic);
  document.querySelector("#motion-note").hidden = !isStatic;
  if (isStatic) {
    document.querySelector(".breath-orb").classList.add("paused");
    breathToggle.textContent = breathingPaused ? "Resume" : "Pause";
    breathCaption.textContent = breathingPaused
      ? "The guide is paused. Let your breathing be natural."
      : "The orb is still. Let your breathing be natural.";
    return;
  }
  document.querySelector(".breath-orb").classList.toggle("paused", breathingPaused);
  breathToggle.textContent = breathingPaused ? "Resume" : "Pause";
  breathCaption.textContent = breathingPaused
    ? "The guide is paused. Let your breathing be natural."
    : "Breathe in gently, if you like.";
}

applyPreferences();
renderLetters();
renderPrompt();
updateBreathing();

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-go], [data-action], .settings-trigger");
  if (!target) return;
  playChime();
  if (target.matches(".settings-trigger")) {
    dialog.showModal();
    return;
  }
  if (target.dataset.go) {
    navigate(target.dataset.go);
    return;
  }
  const action = target.dataset.action;
  if (action === "grounding") {
    promptIndex = 0;
    renderPrompt();
    navigate("grounding");
  } else if (action === "letter-list") navigate("letters");
  else if (action === "another-letter") {
    openLetter((activeLetterIndex + 1) % letters.length);
  }
  else if (action === "quiet") navigate("quiet");
  else if (action === "bedtime") navigate("bedtime");
  else if (action === "breathing") {
    breathingPaused = false;
    updateBreathing();
    navigate("breathing");
  } else if (action === "goodnight") navigate("goodnight");
});

document.querySelector("#next-prompt").addEventListener("click", () => {
  playChime();
  if (promptIndex < groundingPrompts.length - 1) {
    promptIndex += 1;
    renderPrompt();
  } else {
    navigate("grounding-end");
  }
});

ambientToggle.addEventListener("click", () => {
  playChime();
  if (ambienceNodes) stopAmbience();
  else startAmbience();
});

breathToggle.addEventListener("click", () => {
  breathingPaused = !breathingPaused;
  playChime();
  updateBreathing();
});

for (const [key, input] of Object.entries(settings)) {
  input.addEventListener("change", () => {
    if (key === "sound") {
      if (input.checked) startAmbience();
      else stopAmbience();
    } else {
      preferences[key] = input.checked;
      if (key === "dim") document.body.classList.toggle("dim-screen", preferences.dim);
    }
    persistPreferences();
  });
}

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  if (preferences.sound && document.body.dataset.screen !== "quiet") stopAmbience();
});
motionQuery.addEventListener?.("change", updateBreathing);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAmbience();
});
window.addEventListener("pagehide", stopAmbience);
