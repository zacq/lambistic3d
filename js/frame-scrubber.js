/**
 * FrameScrubber — scroll-driven canvas frame animation engine
 * Inspired by Apple product page scroll animations
 */
class FrameScrubber {
  constructor(options) {
    this.canvas  = options.canvas;
    this.ctx     = this.canvas.getContext('2d');
    this.frames  = options.frames;          // array of src strings
    this.images  = new Array(this.frames.length).fill(null);
    this.loadedCount  = 0;
    this.currentFrame = 0;
    this.rafId        = null;
    this.pendingFrame = null;
    this.onProgress   = options.onProgress || (() => {});
    this.onReady      = options.onReady    || (() => {});
    this._readyCalled = false;
    this._dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x

    this._setupCanvas();
    this._onResize = this._setupCanvas.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  // ─── Canvas sizing ──────────────────────────────────────────────────────────

  _setupCanvas() {
    const parent = this.canvas.parentElement;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width  = Math.round(w * this._dpr);
    this.canvas.height = Math.round(h * this._dpr);
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';

    // Reset and re-apply DPR scale (canvas.width assignment resets context)
    this.ctx.scale(this._dpr, this._dpr);
    this._logicalW = w;
    this._logicalH = h;

    this._drawFrame(this.currentFrame);
  }

  // ─── Preloading ─────────────────────────────────────────────────────────────

  preload() {
    for (let i = 0; i < this.frames.length; i++) {
      this._loadFrame(i);
    }
  }

  _loadFrame(i) {
    if (this.images[i]) return;
    const img = new Image();
    img.onload = () => {
      this.images[i] = img;
      this.loadedCount++;
      this.onProgress(this.loadedCount, this.frames.length);

      // Fire onReady on first frame load
      if (i === 0 && !this._readyCalled) {
        this._readyCalled = true;
        this._drawFrame(0);
        this.onReady();
      }
    };
    img.onerror = () => {
      // Mark as failed (use null placeholder) but still increment counter
      this.images[i] = false;
      this.loadedCount++;
      this.onProgress(this.loadedCount, this.frames.length);
    };
    img.src = this.frames[i];
  }

  // ─── Playback ────────────────────────────────────────────────────────────────

  /**
   * Set frame by index (0-based)
   */
  setFrame(frameIndex) {
    const idx = Math.max(0, Math.min(Math.round(frameIndex), this.frames.length - 1));
    if (idx === this.currentFrame && this.images[idx]) return;
    this.currentFrame = idx;
    this.pendingFrame = idx;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        if (this.pendingFrame !== null) {
          this._drawFrame(this.pendingFrame);
        }
        this.rafId      = null;
        this.pendingFrame = null;
      });
    }
  }

  /**
   * Set frame by scroll progress (0.0 → 1.0)
   */
  setProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    this.setFrame(p * (this.frames.length - 1));
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  _drawFrame(idx) {
    const img = this.images[idx];
    if (!img) return;

    const cw = this._logicalW;
    const ch = this._logicalH;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Object-fit: contain
    const scale = Math.min(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, x, y, w, h);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
