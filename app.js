/* ═══════════════════════════════════════════════════════════
   RunCam — Strava-Style Video Recorder
   With multi-theme overlay system
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DOM ──
  const $ = (s) => document.querySelector(s);
  const cameraVideo   = $('#cameraVideo');
  const mainCanvas    = $('#mainCanvas');
  const ctx           = mainCanvas.getContext('2d');

  const btnStart      = $('#btnStart');
  const btnPause      = $('#btnPause');
  const btnResume     = $('#btnResume');
  const btnStop       = $('#btnStop');
  const btnSwitchCam  = $('#btnSwitchCam');
  const btnTheme      = $('#btnTheme');
  const btnCloseTheme = $('#btnCloseTheme');
  const themePanel    = $('#themePanel');
  const themeList     = $('#themeList');

  const previewModal  = $('#previewModal');
  const previewVideo  = $('#previewVideo');
  const modalStats    = $('#modalStats');
  const btnDownload   = $('#btnDownload');
  const btnNewRec     = $('#btnNewRecording');

  const splashScreen  = $('#splashScreen');
  const btnGrant      = $('#btnGrant');

  // ═══════════════════════════════════════════
  // THEME DEFINITIONS
  // ═══════════════════════════════════════════

  const THEMES = [
    {
      id: 'classic',
      name: 'Classic White',
      desc: 'Clean & simple',
      swatch: '#ffffff',
      labelColor: 'rgba(255,255,255,0.7)',
      valueColor: '#ffffff',
      unitColor: 'rgba(255,255,255,0.6)',
      compassAccent: '#FF6B35',
      routeColor: '#00E5A0',
      fontLabel: "'Inter', sans-serif",
      fontValue: "'Inter', sans-serif",
      labelWeight: 500,
      valueWeight: 800,
    },
    {
      id: 'ocean',
      name: 'Ocean Blue',
      desc: 'Cool blue tones',
      swatch: '#4FC3F7',
      labelColor: 'rgba(100,195,247,0.65)',
      valueColor: '#4FC3F7',
      unitColor: 'rgba(100,195,247,0.5)',
      compassAccent: '#2196F3',
      routeColor: '#4FC3F7',
      fontLabel: "'Space Grotesk', sans-serif",
      fontValue: "'Space Grotesk', sans-serif",
      labelWeight: 500,
      valueWeight: 700,
    },
    {
      id: 'smoke',
      name: 'Smoke Gray',
      desc: 'Subtle & minimal',
      swatch: '#90A4AE',
      labelColor: 'rgba(160,175,185,0.55)',
      valueColor: '#B0BEC5',
      unitColor: 'rgba(160,175,185,0.45)',
      compassAccent: '#78909C',
      routeColor: '#90A4AE',
      fontLabel: "'Inter', sans-serif",
      fontValue: "'Inter', sans-serif",
      labelWeight: 400,
      valueWeight: 700,
    },
    {
      id: 'neon',
      name: 'Neon Cyber',
      desc: 'Futuristic glow',
      swatch: '#00E5A0',
      labelColor: 'rgba(0,229,160,0.6)',
      valueColor: '#00E5A0',
      unitColor: 'rgba(0,229,160,0.5)',
      compassAccent: '#00E676',
      routeColor: '#00E5A0',
      fontLabel: "'Orbitron', sans-serif",
      fontValue: "'Orbitron', sans-serif",
      labelWeight: 500,
      valueWeight: 700,
    },
    {
      id: 'blaze',
      name: 'Strava Blaze',
      desc: 'Bold orange energy',
      swatch: '#FF6B35',
      labelColor: 'rgba(255,150,100,0.65)',
      valueColor: '#FF6B35',
      unitColor: 'rgba(255,150,100,0.5)',
      compassAccent: '#FF6B35',
      routeColor: '#FF8A65',
      fontLabel: "'Rajdhani', sans-serif",
      fontValue: "'Rajdhani', sans-serif",
      labelWeight: 600,
      valueWeight: 700,
    },
    {
      id: 'midnight',
      name: 'Midnight Indigo',
      desc: 'Deep blue elegance',
      swatch: '#7C8CF8',
      labelColor: 'rgba(140,160,255,0.6)',
      valueColor: '#8C9EFF',
      unitColor: 'rgba(140,160,255,0.5)',
      compassAccent: '#5C6BC0',
      routeColor: '#7C8CF8',
      fontLabel: "'Space Grotesk', sans-serif",
      fontValue: "'Space Grotesk', sans-serif",
      labelWeight: 500,
      valueWeight: 700,
    },
    {
      id: 'sport',
      name: 'Sport Bold',
      desc: 'Big & cinematic',
      swatch: '#FFD600',
      labelColor: 'rgba(255,214,0,0.6)',
      valueColor: '#FFD600',
      unitColor: 'rgba(255,214,0,0.5)',
      compassAccent: '#FFD600',
      routeColor: '#FFD600',
      fontLabel: "'Bebas Neue', sans-serif",
      fontValue: "'Bebas Neue', sans-serif",
      labelWeight: 400,
      valueWeight: 400,
    },
  ];

  let currentThemeId = localStorage.getItem('runcam_theme') || 'classic';

  function getTheme() {
    return THEMES.find(t => t.id === currentThemeId) || THEMES[0];
  }

  function setTheme(id) {
    currentThemeId = id;
    localStorage.setItem('runcam_theme', id);
    renderThemeList();
  }

  // ── State ──
  let cameraStream   = null;
  let audioStream    = null;
  let facingMode     = 'environment';
  let mediaRecorder  = null;
  let recordedChunks = [];
  let recordedBlob   = null;

  let isRecording = false;
  let isPaused    = false;
  let timerStart  = 0;
  let timerElapsed = 0;
  let timerInterval = null;

  // GPS
  let gpsWatchId     = null;
  let gpsReady       = false;
  let totalDistance   = 0;
  let currentSpeed   = 0;
  let maxSpeed       = 0;
  let lastPosition   = null;
  let currentHeading = null;
  let routePoints    = [];

  // Canvas
  let animFrameId = null;
  let canvasW = 0;
  let canvasH = 0;

  // Canvas stream track for Safari requestFrame()
  let canvasStreamTrack = null;

  // Camera lens system
  let allVideoDevices = [];       // All enumerated video devices
  let backCameras = {};           // { '0.5': deviceId, '1': deviceId, '2': deviceId }
  let currentLens = '1';          // Currently active lens
  let selectedDeviceId = null;    // Specific deviceId to use

  const lensPicker = $('#lensPicker');
  const lensBtns = document.querySelectorAll('.lens-btn');

  // ═══════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = x => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatTimer(ms) {
    const t = Math.floor(ms / 1000);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function formatPace(speedMs) {
    if (!speedMs || speedMs < 0.1) return "--'--\"";
    const secPerKm = 1000 / speedMs;
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    if (mins > 99) return "--'--\"";
    return `${mins}'${String(secs).padStart(2,'0')}"`;
  }

  function formatDistance(m) {
    return (m / 1000).toFixed(2);
  }

  function formatSpeed(ms) {
    return (ms * 3.6).toFixed(1);
  }

  function getElapsedMs() {
    if (!isRecording) return timerElapsed;
    if (isPaused) return timerElapsed;
    return timerElapsed + (Date.now() - timerStart);
  }

  function getDPR() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  // ═══════════════════════════════════════════
  // CAMERA
  // ═══════════════════════════════════════════

  async function initCamera() {
    try {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());

      const constraints = { audio: false, video: {} };

      if (selectedDeviceId) {
        // Use specific device (for lens switching)
        constraints.video = {
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        };
      } else {
        // Default: use facingMode
        constraints.video = {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        };
      }

      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
    } catch (err) {
      console.warn('Camera not available:', err.message);
      cameraStream = null;
    }
    resizeCanvas();
  }

  /**
   * Enumerate cameras and identify ultra-wide / wide / telephoto
   * On iPhone, labels are like:
   *   - "Back Ultra Wide Camera" (0.5x)
   *   - "Back Camera" or "Back Wide Camera" (1x)
   *   - "Back Telephoto Camera" (2x / 3x)
   *   - "Front Camera"
   */
  async function enumerateCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      allVideoDevices = devices.filter(d => d.kind === 'videoinput');

      backCameras = {};

      for (const dev of allVideoDevices) {
        const label = (dev.label || '').toLowerCase();

        if (label.includes('ultra wide') || label.includes('ultrawide')) {
          backCameras['0.5'] = dev.deviceId;
        } else if (label.includes('telephoto')) {
          backCameras['2'] = dev.deviceId;
        } else if (
          label.includes('back') &&
          !label.includes('ultra') &&
          !label.includes('telephoto')
        ) {
          backCameras['1'] = dev.deviceId;
        }
      }

      // If we couldn't identify by label (non-iPhone or permissions not granted yet),
      // try to map by index — many Android phones list back cameras in order
      const backDevices = allVideoDevices.filter(d => {
        const l = (d.label || '').toLowerCase();
        return !l.includes('front') && l !== '';
      });

      if (!backCameras['1'] && backDevices.length >= 1) {
        backCameras['1'] = backDevices[0].deviceId;
      }
      if (!backCameras['0.5'] && backDevices.length >= 2) {
        // On many phones the 2nd back camera is ultra-wide
        backCameras['0.5'] = backDevices[1].deviceId;
      }
      if (!backCameras['2'] && backDevices.length >= 3) {
        backCameras['2'] = backDevices[2].deviceId;
      }

      // Update lens picker UI: hide unavailable lenses
      updateLensPicker();

      console.log('Detected cameras:', backCameras, 'Total devices:', allVideoDevices.length);
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
    }
  }

  function updateLensPicker() {
    const available = Object.keys(backCameras);
    lensBtns.forEach(btn => {
      const lens = btn.dataset.lens;
      if (available.length <= 1) {
        // Only one camera — hide lens picker entirely
        lensPicker.style.display = 'none';
      } else {
        lensPicker.style.display = 'flex';
        btn.style.display = available.includes(lens) ? '' : 'none';
      }
    });
  }

  async function switchLens(lens) {
    if (!backCameras[lens]) return;
    currentLens = lens;
    selectedDeviceId = backCameras[lens];

    // Update active button
    lensBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lens === lens);
    });

    await initCamera();
  }

  async function initAudio() {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      audioStream = null;
    }
  }

  function resizeCanvas() {
    const dpr = getDPR();
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    mainCanvas.width = canvasW * dpr;
    mainCanvas.height = canvasH * dpr;
    mainCanvas.style.width = canvasW + 'px';
    mainCanvas.style.height = canvasH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ═══════════════════════════════════════════
  // GPS
  // ═══════════════════════════════════════════

  function startGPS() {
    if (!navigator.geolocation) return;

    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy, heading } = pos.coords;
        const ts = pos.timestamp;

        if (!gpsReady) gpsReady = true;
        if (heading !== null && !isNaN(heading)) currentHeading = heading;

        if (isRecording && !isPaused) {
          if (speed !== null && speed >= 0) currentSpeed = speed;

          if (lastPosition) {
            const dist = haversine(lastPosition.lat, lastPosition.lng, latitude, longitude);
            const dt = (ts - lastPosition.time) / 1000;

            if (dist > 1 && dist < 200 && accuracy < 50) {
              totalDistance += dist;
            }

            if ((speed === null || speed === 0) && dt > 0 && dist > 1 && accuracy < 50) {
              currentSpeed = dist / dt;
            }

            if (dist < 1 && dt > 2) currentSpeed = 0;

            if (currentSpeed > maxSpeed && currentSpeed < 100) maxSpeed = currentSpeed;
          }

          lastPosition = { lat: latitude, lng: longitude, time: ts };
          routePoints.push({ lat: latitude, lng: longitude });
        } else if (!isRecording) {
          lastPosition = { lat: latitude, lng: longitude, time: ts };
        }
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  // ═══════════════════════════════════════════
  // TIMER
  // ═══════════════════════════════════════════

  function startTimer() {
    timerStart = Date.now();
    timerInterval = setInterval(() => {}, 200);
  }

  function pauseTimer() {
    timerElapsed += Date.now() - timerStart;
    clearInterval(timerInterval);
  }

  function resumeTimer() {
    timerStart = Date.now();
    timerInterval = setInterval(() => {}, 200);
  }

  function stopTimer() {
    if (timerInterval) {
      timerElapsed += Date.now() - timerStart;
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ═══════════════════════════════════════════
  // CANVAS RENDER
  // ═══════════════════════════════════════════

  function renderFrame() {
    drawCameraFrame();
    drawOverlay();

    // Tell Safari/iOS that a new frame is ready to capture
    // Without this, captureStream on Safari freezes after 1st frame
    if (canvasStreamTrack && canvasStreamTrack.requestFrame) {
      canvasStreamTrack.requestFrame();
    }

    animFrameId = requestAnimationFrame(renderFrame);
  }

  function drawCameraFrame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (!cameraVideo.videoWidth) return;

    const vw = cameraVideo.videoWidth;
    const vh = cameraVideo.videoHeight;
    const videoAspect = vw / vh;
    const canvasAspect = canvasW / canvasH;
    let sx, sy, sw, sh;

    if (canvasAspect > videoAspect) {
      sw = vw; sh = vw / canvasAspect; sx = 0; sy = (vh - sh) / 2;
    } else {
      sh = vh; sw = vh * canvasAspect; sx = (vw - sw) / 2; sy = 0;
    }

    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(canvasW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(cameraVideo, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
      ctx.restore();
    } else {
      ctx.drawImage(cameraVideo, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
    }
  }

  // ── OVERLAY (themed) ──
  function drawOverlay() {
    const theme = getTheme();
    const w = canvasW;
    const h = canvasH;
    const scale = Math.min(w / 390, 1.4);
    const px = v => Math.round(v * scale);

    ctx.textBaseline = 'alphabetic';

    const leftX = px(24);
    let curY = h * 0.36;
    const blockGap = px(12);

    // Duration
    drawStatBlock(leftX, curY, 'Duration', formatTimer(getElapsedMs()), '', theme);
    curY += px(78) + blockGap;

    // Total Distance
    drawStatBlock(leftX, curY, 'Total Distance', formatDistance(totalDistance), 'KM', theme);
    curY += px(78) + blockGap;

    // Pace
    drawStatBlock(leftX, curY, 'Pace', formatPace(currentSpeed), '/KM', theme);
    curY += px(78) + blockGap;

    // Speed
    drawStatBlock(leftX, curY, 'Speed', formatSpeed(currentSpeed), 'KM/H', theme);

    // Compass
    drawCompass(w * 0.5, h - px(90), px(40), theme);
  }

  function drawStatBlock(x, y, label, value, unit, theme) {
    const w = canvasW;
    const scale = Math.min(w / 390, 1.4);
    const px = v => Math.round(v * scale);

    // Text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Label
    ctx.font = `${theme.labelWeight} ${px(13)}px ${theme.fontLabel}`;
    ctx.fillStyle = theme.labelColor;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y);

    // Value
    ctx.font = `${theme.valueWeight} ${px(40)}px ${theme.fontValue}`;
    ctx.fillStyle = theme.valueColor;
    ctx.fillText(value, x, y + px(44));

    // Unit
    if (unit) {
      const vw = ctx.measureText(value).width;
      ctx.font = `600 ${px(16)}px ${theme.fontLabel}`;
      ctx.fillStyle = theme.unitColor;
      ctx.fillText(unit, x + vw + px(6), y + px(44));
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  function drawCompass(cx, cy, radius, theme) {
    const w = canvasW;
    const scale = Math.min(w / 390, 1.4);
    const px = v => Math.round(v * scale);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;

    // Circle bg
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Mini route
    if (routePoints.length > 2) drawMiniRoute(cx, cy, radius * 0.7, theme);

    // "N"
    const headingRad = currentHeading ? (currentHeading * Math.PI / 180) : 0;
    const nX = cx + Math.sin(-headingRad) * (radius - px(10));
    const nY = cy - Math.cos(-headingRad) * (radius - px(10));
    ctx.font = `700 ${px(10)}px 'Inter', sans-serif`;
    ctx.fillStyle = theme.compassAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nX, nY);

    // Heading text
    const deg = currentHeading !== null ? Math.round(currentHeading) : '--';
    const dir = getCardinal(currentHeading);
    ctx.font = `700 ${px(12)}px ${theme.fontLabel}`;
    ctx.fillStyle = theme.compassAccent;
    ctx.textBaseline = 'top';
    ctx.fillText(`${deg}°${dir}`, cx, cy + radius + px(8));

    ctx.restore();
  }

  function drawMiniRoute(cx, cy, radius, theme) {
    if (routePoints.length < 2) return;

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of routePoints) {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
    }

    const latR = maxLat - minLat || 0.001;
    const lngR = maxLng - minLng || 0.001;
    const rangeMax = Math.max(latR, lngR);

    ctx.beginPath();
    ctx.strokeStyle = theme.routeColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < routePoints.length; i++) {
      const px = cx + ((routePoints[i].lng - (minLng + lngR / 2)) / rangeMax) * radius * 2;
      const py = cy - ((routePoints[i].lat - (minLat + latR / 2)) / rangeMax) * radius * 2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const last = routePoints[routePoints.length - 1];
    const dotX = cx + ((last.lng - (minLng + lngR / 2)) / rangeMax) * radius * 2;
    const dotY = cy - ((last.lat - (minLat + latR / 2)) / rangeMax) * radius * 2;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = theme.routeColor;
    ctx.fill();
  }

  function getCardinal(deg) {
    if (deg === null) return '';
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  // ═══════════════════════════════════════════
  // RECORDING
  // ═══════════════════════════════════════════

  function startRecording() {
    recordedChunks = [];

    // 60fps — max achievable in browser (rAF caps at display refresh rate)
    const canvasStream = mainCanvas.captureStream(60);

    // Store the video track so we can call requestFrame() in the render loop
    // This is critical for Safari/iOS — without it, video freezes
    const videoTracks = canvasStream.getVideoTracks();
    canvasStreamTrack = videoTracks.length > 0 ? videoTracks[0] : null;

    if (audioStream) {
      audioStream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
    }

    // Prioritize MP4 (works on Safari/iPhone), then WebM as fallback
    const mimeTypes = [
      'video/mp4;codecs=h264,aac',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    let mime = '';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }
    }

    // High bitrate for smooth, sharp video
    const opts = { videoBitsPerSecond: 25000000 }; // 25 Mbps — near-lossless quality
    if (mime) opts.mimeType = mime;

    try {
      mediaRecorder = new MediaRecorder(canvasStream, opts);
    } catch (e) {
      // Fallback without options
      try {
        mediaRecorder = new MediaRecorder(canvasStream, { videoBitsPerSecond: 25000000 });
      } catch (e2) {
        mediaRecorder = new MediaRecorder(canvasStream);
      }
    }

    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const type = mediaRecorder.mimeType || 'video/mp4';
      recordedBlob = new Blob(recordedChunks, { type });
      showPreview();
    };

    // No timeslice = continuous recording (smoother, no chunk boundary stutters)
    mediaRecorder.start();

    // Safety: periodically request data so long recordings don't lose everything on crash
    mediaRecorder._safetyInterval = setInterval(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData();
      }
    }, 5000);

    console.log('Recording started, format:', mediaRecorder.mimeType);
  }

  // ═══════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════

  async function onStart() {
    totalDistance = 0; currentSpeed = 0; maxSpeed = 0;
    routePoints = []; timerElapsed = 0;
    isRecording = true; isPaused = false;

    startTimer();
    startRecording();
    await requestWakeLock();

    btnStart.classList.add('hidden');
    btnPause.classList.remove('hidden');
    btnStop.classList.remove('hidden');
  }

  function onPause() {
    isPaused = true;
    pauseTimer();
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.pause();
    btnPause.classList.add('hidden');
    btnResume.classList.remove('hidden');
  }

  function onResume() {
    isPaused = false;
    resumeTimer();
    if (mediaRecorder && mediaRecorder.state === 'paused') mediaRecorder.resume();
    btnResume.classList.add('hidden');
    btnPause.classList.remove('hidden');
  }

  function onStop() {
    isRecording = false; isPaused = false;
    stopTimer();
    if (mediaRecorder) {
      if (mediaRecorder._safetyInterval) clearInterval(mediaRecorder._safetyInterval);
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }
    canvasStreamTrack = null;
    btnPause.classList.add('hidden');
    btnResume.classList.add('hidden');
    btnStop.classList.add('hidden');
    btnStart.classList.remove('hidden');
  }

  function showPreview() {
    const url = URL.createObjectURL(recordedBlob);
    previewVideo.src = url;
    const elapsed = getElapsedMs();

    modalStats.innerHTML = `
      <div class="modal-stat-item">
        <div class="modal-stat-label">Durasi</div>
        <div class="modal-stat-value">${formatTimer(elapsed)}</div>
      </div>
      <div class="modal-stat-item">
        <div class="modal-stat-label">Jarak</div>
        <div class="modal-stat-value">${formatDistance(totalDistance)} km</div>
      </div>
      <div class="modal-stat-item">
        <div class="modal-stat-label">Max Speed</div>
        <div class="modal-stat-value">${formatSpeed(maxSpeed)} km/h</div>
      </div>
    `;
    previewModal.classList.remove('hidden');
  }

  function downloadVideo() {
    if (!recordedBlob) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(recordedBlob);
    a.download = `RunCam_${ts}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function onNewRecording() {
    previewModal.classList.add('hidden');
    previewVideo.pause();
    previewVideo.removeAttribute('src');
    if (recordedBlob) { URL.revokeObjectURL(previewVideo.src); recordedBlob = null; }
    totalDistance = 0; currentSpeed = 0; maxSpeed = 0;
    timerElapsed = 0; routePoints = [];
  }

  async function onSwitchCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    selectedDeviceId = null; // Reset to facingMode-based selection
    currentLens = '1';
    lensBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lens === '1'));

    // Show/hide lens picker (only for back camera)
    if (facingMode === 'user') {
      lensPicker.style.display = 'none';
    } else {
      updateLensPicker();
    }

    await initCamera();
  }

  // ═══════════════════════════════════════════
  // THEME PICKER UI
  // ═══════════════════════════════════════════

  function renderThemeList() {
    themeList.innerHTML = '';
    THEMES.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'theme-item' + (t.id === currentThemeId ? ' active' : '');
      btn.innerHTML = `
        <span class="theme-swatch" style="background:${t.swatch}"></span>
        <span class="theme-info">
          <span class="theme-name">${t.name}</span>
          <span class="theme-desc">${t.desc}</span>
        </span>
        ${t.id === currentThemeId ? '<span class="theme-check">✓</span>' : ''}
      `;
      btn.addEventListener('click', () => setTheme(t.id));
      themeList.appendChild(btn);
    });
  }

  function toggleThemePanel() {
    themePanel.classList.toggle('hidden');
  }

  // ═══════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════

  async function init() {
    const grantText = btnGrant.querySelector('.btn-grant-text');
    const grantLoader = btnGrant.querySelector('.btn-grant-loader');
    grantText.classList.add('hidden');
    grantLoader.classList.remove('hidden');

    try {
      await initCamera();
      await initAudio();
      await enumerateCameras();
      startGPS();
      resizeCanvas();
      renderFrame();
      renderThemeList();

      // Default to 1x if available
      if (backCameras['1']) {
        currentLens = '1';
        selectedDeviceId = backCameras['1'];
        lensBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lens === '1'));
        await initCamera();
      }

      splashScreen.style.transition = 'opacity 0.4s ease';
      splashScreen.style.opacity = '0';
      setTimeout(() => splashScreen.classList.add('hidden'), 400);
    } catch (err) {
      console.error(err);
      grantText.textContent = 'Coba Lagi';
      grantText.classList.remove('hidden');
      grantLoader.classList.add('hidden');
      alert('Gagal mengakses kamera. Pastikan izin diaktifkan.');
    }
  }

  // ═══════════════════════════════════════════
  // WAKE LOCK
  // ═══════════════════════════════════════════

  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isRecording) await requestWakeLock();
  });

  // ═══════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════

  btnGrant.addEventListener('click', init);
  btnStart.addEventListener('click', onStart);
  btnPause.addEventListener('click', onPause);
  btnResume.addEventListener('click', onResume);
  btnStop.addEventListener('click', onStop);
  btnSwitchCam.addEventListener('click', onSwitchCamera);
  btnDownload.addEventListener('click', downloadVideo);
  btnNewRec.addEventListener('click', onNewRecording);
  btnTheme.addEventListener('click', toggleThemePanel);
  btnCloseTheme.addEventListener('click', () => themePanel.classList.add('hidden'));

  // Lens picker buttons
  lensBtns.forEach(btn => {
    btn.addEventListener('click', () => switchLens(btn.dataset.lens));
  });

  // Close theme panel when tapping outside
  document.addEventListener('click', (e) => {
    if (!themePanel.classList.contains('hidden') &&
        !themePanel.contains(e.target) &&
        e.target !== btnTheme && !btnTheme.contains(e.target)) {
      themePanel.classList.add('hidden');
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 100);
  });
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 300));

})();
