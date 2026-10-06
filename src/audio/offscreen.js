/**
 * Job Hunter Audio Synthesizer - Offscreen Document
 * Runs in extension origin, exempt from web-page autoplay user-gesture policies.
 */

(() => {
  'use strict';

  let audioCtx = null;
  let chimeIntervalId = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  function playTone(freq, startTime, duration) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Safeguard
    }
  }

  function playChimeMelody() {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    // Pleasant two-tone chime (587.33 Hz [D5] -> 880.00 Hz [A5])
    playTone(587.33, now, 0.25);
    playTone(880.0, now + 0.12, 0.35);
  }

  function startChimeLoop() {
    stopChimeLoop();
    playChimeMelody();
    chimeIntervalId = setInterval(playChimeMelody, 1200);
  }

  function stopChimeLoop() {
    if (chimeIntervalId) {
      clearInterval(chimeIntervalId);
      chimeIntervalId = null;
    }
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {});
    }
  }

  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'OFFSCREEN_START_CHIME') {
      startChimeLoop();
    } else if (message.type === 'OFFSCREEN_STOP_CHIME') {
      stopChimeLoop();
    }
  });
})();
