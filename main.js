/* ═══════════════════════════════════════
   HIVE CONSTRUCTION — main.js (fixed)
═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════
     THEME TOGGLE
  ══════════════════════════════════ */
  const html        = document.documentElement;
  const toggleBtns  = document.querySelectorAll('.toggle-option');

  // Apply theme without touching the canvas
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('hive-theme', theme);
    toggleBtns.forEach(btn =>
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme)
    );
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.getAttribute('data-theme'));
    });
  });

  // Restore saved theme (no canvas wipe)
  const savedTheme = localStorage.getItem('hive-theme') || 'dark';
  applyTheme(savedTheme);


  /* ══════════════════════════════════
     NAV SCROLL SHADOW
  ══════════════════════════════════ */
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  });


  /* ══════════════════════════════════
     HAMBURGER MENU
  ══════════════════════════════════ */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });


  /* ══════════════════════════════════
     DRAWING CANVAS
  ══════════════════════════════════ */
  const canvas = document.getElementById('drawCanvas');
  const ctx    = canvas.getContext('2d');

  const CANVAS_THEMES = {
    dark:  { bg: '#080d14', grid: 'rgba(204,160,68,0.07)' },
    light: { bg: '#f5f2eb', grid: 'rgba(184,136,42,0.12)' }
  };

  function initCanvas() {
    const t = CANVAS_THEMES[savedTheme] || CANVAS_THEMES.dark;
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(t);
  }

  function drawGrid(t) {
    ctx.save();
    ctx.strokeStyle = t.grid;
    ctx.lineWidth   = 0.5;
    for (let x = 0; x <= canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  // Draw initial background + grid once
  initCanvas();

  // State
  let activeTool   = 'pen';
  let isDrawing    = false;
  let startX       = 0;
  let startY       = 0;
  let currentColor = '#cca044';
  let brushSize    = 3;
  let history      = [];
  let snapshot     = null;

  // ── Helpers ──────────────────────
  function saveHistory() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 50) history.shift();
  }

  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY
    };
  }

  // ── Pointer down ─────────────────
  function onDown(e) {
    isDrawing = true;
    const { x, y } = getXY(e);
    startX = x;
    startY = y;

    saveHistory();
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Reset composite before every stroke
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth   = brushSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = currentColor;

    if (activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  // ── Pointer move ─────────────────
  function onMove(e) {
    if (!isDrawing) return;
    const { x, y } = getXY(e);

    ctx.lineWidth   = brushSize;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = currentColor;

    if (activeTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);

    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);

    } else {
      // Shape tools: redraw from snapshot each frame
      ctx.putImageData(snapshot, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth   = brushSize;
      ctx.beginPath();

      if (activeTool === 'line') {
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (activeTool === 'rect') {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (activeTool === 'circle') {
        const rx = (x - startX) / 2;
        const ry = (y - startY) / 2;
        ctx.ellipse(startX + rx, startY + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // ── Pointer up ───────────────────
  function onUp() {
    if (!isDrawing) return;
    isDrawing = false;
    // Always reset composite so next operation starts clean
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
  }

  // Mouse events
  canvas.addEventListener('mousedown',  onDown);
  canvas.addEventListener('mousemove',  onMove);
  canvas.addEventListener('mouseup',    onUp);
  canvas.addEventListener('mouseleave', onUp);

  // Touch events
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(e); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e); }, { passive: false });
  canvas.addEventListener('touchend',   e => { e.preventDefault(); onUp();    }, { passive: false });


  /* ── Tool buttons ── */
  ['pen', 'line', 'rect', 'circle', 'eraser'].forEach(t => {
    const btn = document.getElementById('tool-' + t);
    if (!btn) return;
    btn.addEventListener('click', () => {
      activeTool = t;
      // Reset composite whenever tool changes
      ctx.globalCompositeOperation = 'source-over';
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ── Color dots ── */
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', function () {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      this.classList.add('active');
      currentColor = this.getAttribute('data-color');
      // Switch to pen automatically
      activeTool = 'pen';
      ctx.globalCompositeOperation = 'source-over';
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('tool-pen').classList.add('active');
    });
  });

  /* ── Brush size ── */
  const sizeSlider  = document.getElementById('brushSize');
  const sizeDisplay = document.getElementById('sizeDisplay');
  sizeSlider.addEventListener('input', function () {
    brushSize = +this.value;
    sizeDisplay.textContent = this.value;
  });

  /* ── Undo ── */
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (history.length > 0) {
      ctx.putImageData(history.pop(), 0, 0);
    }
  });

  /* ── Clear ── */
  document.getElementById('btn-clear').addEventListener('click', () => {
    saveHistory();
    const theme = html.getAttribute('data-theme') || 'dark';
    const t = CANVAS_THEMES[theme] || CANVAS_THEMES.dark;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(t);
  });

  /* ── Download ── */
  document.getElementById('btn-download').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'hive-sketch.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });


  /* ══════════════════════════════════
     FILE UPLOAD
  ══════════════════════════════════ */
  const fileInput   = document.getElementById('fileInput');
  const uploadZone  = document.getElementById('uploadZone');
  const preview     = document.getElementById('uploadPreview');
  const previewWrap = document.getElementById('preview-wrap');

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      preview.src = ev.target.result;
      previewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));

  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    loadFile(e.dataTransfer.files[0]);
  });


  /* ══════════════════════════════════
     CONTACT FORM
  ══════════════════════════════════ */
  document.getElementById('contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const btn  = document.getElementById('submitBtn');
    const orig = btn.textContent;
    btn.textContent   = '✓ Message Sent!';
    btn.style.background = '#3a8a3a';
    setTimeout(() => {
      btn.textContent   = orig;
      btn.style.background = '';
      e.target.reset();
    }, 3500);
  });

});
