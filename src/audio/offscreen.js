/**
 * Job Hunter Audio Synthesizer - Offscreen Document
 * Manifest V3 - Real-time Web Audio API synthesis for 4 selectable ringtones.
 * Runs in extension origin, completely exempt from web-page autoplay policies.
 */

(() => {
  'use strict';

  let audioCtx = null;
  let chimeIntervalId = null;
  let currentRingtone = 'chime';

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

  function playTone(freq, startTime, duration, type = 'sine', volume = 0.2) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Audio node creation safeguard
    }
  }

  /* --------------------------------------------------------------------------
     4 Distinct Ringtone Patterns
     -------------------------------------------------------------------------- */

  // 1. Chime: Classic two-tone pleasant chime (D5 -> A5)
  function playChime(now) {
    playTone(587.33, now, 0.24, 'sine', 0.2);
    playTone(880.00, now + 0.12, 0.35, 'sine', 0.18);
  }

  // 2. Pulse: Crisp modern double radar blip (G5 -> G5)
  function playPulse(now) {
    playTone(784.00, now, 0.09, 'sine', 0.22);
    playTone(784.00, now + 0.12, 0.15, 'sine', 0.22);
  }

  // 3. Bell: Crystal ascending triad chord (C5 -> E5 -> G5)
  function playBell(now) {
    playTone(523.25, now, 0.3, 'sine', 0.18);
    playTone(659.25, now + 0.09, 0.32, 'sine', 0.18);
    playTone(783.99, now + 0.18, 0.42, 'sine', 0.2);
  }

  // 4. Marimba: Warm mellow acoustic percussive tap (A4 -> C#5)
  function playMarimba(now) {
    playTone(440.00, now, 0.15, 'triangle', 0.25);
    playTone(554.37, now + 0.10, 0.22, 'triangle', 0.25);
  }

  function playTonePattern(ringtoneName) {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    switch (ringtoneName) {
      case 'pulse':
        playPulse(now);
        break;
      case 'bell':
        playBell(now);
        break;
      case 'marimba':
        playMarimba(now);
        break;
      case 'chime':
      default:
        playChime(now);
        break;
    }
  }

  function startChimeLoop(ringtoneName = 'chime') {
    currentRingtone = ringtoneName;
    stopChimeLoop();
    playTonePattern(currentRingtone);
    chimeIntervalId = setInterval(() => {
      playTonePattern(currentRingtone);
    }, 1200);
  }

  function previewChime(ringtoneName = 'chime') {
    stopChimeLoop();
    playTonePattern(ringtoneName);
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
      startChimeLoop(message.ringtone || 'chime');
    } else if (message.type === 'OFFSCREEN_PREVIEW_CHIME') {
      previewChime(message.ringtone || 'chime');
    } else if (message.type === 'OFFSCREEN_STOP_CHIME') {
      stopChimeLoop();
    }
  });
})();
