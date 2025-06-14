const waveformSelect = document.getElementById("waveformSelect");
const freqInput = document.getElementById("freqInput");
const gainInput = document.getElementById("gainInput");
const lfoDepthInput = document.getElementById("lfoDepthInput");
const lfoRateInput = document.getElementById("lfoRateInput");

const freqValue = document.getElementById("freqValue");
const gainValue = document.getElementById("gainValue");
const lfoDepthValue = document.getElementById("lfoDepthValue");
const lfoRateValue = document.getElementById("lfoRateValue");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const randomBtn = document.getElementById("randomBtn");

const peakText = document.getElementById("peakText");
const centroidText = document.getElementById("centroidText");
const energyText = document.getElementById("energyText");

const canvas = document.getElementById("spectrum");
const ctx = canvas.getContext("2d");

let audioCtx;
let analyser;
let gainNode;
let osc;
let lfo;
let lfoGain;
let animation;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  gainNode = audioCtx.createGain();

  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function createSynth() {
  ensureAudio();

  stopTone();

  osc = audioCtx.createOscillator();
  osc.type = waveformSelect.value;
  osc.frequency.value = Number(freqInput.value);

  lfo = audioCtx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = Number(lfoRateInput.value);

  lfoGain = audioCtx.createGain();
  lfoGain.gain.value = Number(lfoDepthInput.value);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gainNode.gain.value = Number(gainInput.value);

  osc.connect(gainNode);
  osc.start();
  lfo.start();

  drawSpectrum();
}

function stopTone() {
  if (osc) {
    osc.stop();
    osc.disconnect();
    osc = null;
  }
  if (lfo) {
    lfo.stop();
    lfo.disconnect();
    lfo = null;
  }
  if (lfoGain) {
    lfoGain.disconnect();
    lfoGain = null;
  }
  if (animation) {
    cancelAnimationFrame(animation);
    animation = null;
  }
}

function syncParams() {
  freqValue.textContent = freqInput.value;
  gainValue.textContent = Number(gainInput.value).toFixed(2);
  lfoDepthValue.textContent = lfoDepthInput.value;
  lfoRateValue.textContent = Number(lfoRateInput.value).toFixed(1);

  if (osc) {
    osc.type = waveformSelect.value;
    osc.frequency.setTargetAtTime(Number(freqInput.value), audioCtx.currentTime, 0.02);
    gainNode.gain.setTargetAtTime(Number(gainInput.value), audioCtx.currentTime, 0.03);
    lfoGain.gain.setTargetAtTime(Number(lfoDepthInput.value), audioCtx.currentTime, 0.03);
    lfo.frequency.setTargetAtTime(Number(lfoRateInput.value), audioCtx.currentTime, 0.03);
  }
}

function drawGrid() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#120a18";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,210,255,0.12)";
  for (let i = 0; i <= 10; i += 1) {
    const x = (i / 10) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 0; i <= 8; i += 1) {
    const y = (i / 8) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawSpectrum() {
  if (!analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const data = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(data);

  drawGrid();

  const w = canvas.width;
  const h = canvas.height;
  const barW = w / bufferLength;

  let peakIndex = 0;
  let peakValue = 0;
  let energy = 0;
  let centroidN = 0;
  let centroidD = 0;

  for (let i = 0; i < bufferLength; i += 1) {
    const v = data[i];
    const x = i * barW;
    const barH = (v / 255) * (h - 20);

    const hue = 300 - (i / bufferLength) * 180;
    ctx.fillStyle = `hsla(${hue}, 88%, 66%, 0.85)`;
    ctx.fillRect(x, h - barH, Math.max(1, barW), barH);

    if (v > peakValue) {
      peakValue = v;
      peakIndex = i;
    }

    energy += v;
    centroidN += i * v;
    centroidD += v;
  }

  const nyquist = audioCtx.sampleRate / 2;
  const peakHz = (peakIndex / bufferLength) * nyquist;
  const centroidBin = centroidD ? centroidN / centroidD : 0;
  const centroidHz = (centroidBin / bufferLength) * nyquist;

  peakText.textContent = `${peakHz.toFixed(1)} Hz`;
  centroidText.textContent = `${centroidHz.toFixed(1)} Hz`;
  energyText.textContent = energy.toFixed(0);

  animation = requestAnimationFrame(drawSpectrum);
}

function randomPreset() {
  const waves = ["sine", "triangle", "sawtooth", "square"];
  waveformSelect.value = waves[Math.floor(Math.random() * waves.length)];
  freqInput.value = String(Math.floor(120 + Math.random() * 1300));
  gainInput.value = (0.15 + Math.random() * 0.6).toFixed(2);
  lfoDepthInput.value = String(Math.floor(Math.random() * 130));
  lfoRateInput.value = (0.3 + Math.random() * 12).toFixed(1);
  syncParams();
}

[waveformSelect, freqInput, gainInput, lfoDepthInput, lfoRateInput].forEach((el) => {
  el.addEventListener("input", syncParams);
});

startBtn.addEventListener("click", async () => {
  ensureAudio();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  createSynth();
});

stopBtn.addEventListener("click", stopTone);
randomBtn.addEventListener("click", randomPreset);

syncParams();
drawGrid();
