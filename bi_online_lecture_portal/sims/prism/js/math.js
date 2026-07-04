/* ═══════════════════════════════════════════════════════════
   math.js — RF Matcher Engine
   Complex arithmetic + ABCD 2-port matrix
   Benedu Insight © 2025
═══════════════════════════════════════════════════════════ */
'use strict';

class Complex {
  constructor(re, im = 0) { this.re = re; this.im = im; }

  add(c) { return new Complex(this.re + c.re, this.im + c.im); }
  sub(c) { return new Complex(this.re - c.re, this.im - c.im); }
  mul(c) { return new Complex(this.re*c.re - this.im*c.im,  this.re*c.im + this.im*c.re); }
  div(c) {
    const d = c.re*c.re + c.im*c.im;
    if (d === 0) return new Complex(0, 0);
    return new Complex((this.re*c.re + this.im*c.im)/d, (this.im*c.re - this.re*c.im)/d);
  }
  inv()  { return new Complex(1, 0).div(this); }
  conj() { return new Complex(this.re, -this.im); }
  mag()  { return Math.sqrt(this.re*this.re + this.im*this.im); }
  arg()  { return Math.atan2(this.im, this.re); }

  /* Pretty-print: "50.00 + j0.00 Ω" style */
  toString(dp = 2) {
    const sign = this.im < 0 ? '−' : '+';
    return `${this.re.toFixed(dp)} ${sign} j${Math.abs(this.im).toFixed(dp)}`;
  }
}

/* ── ABCD (Transmission) Matrix ─────────────────────── */
class ABCD {
  constructor(a, b, c, d) {
    this.a = a ?? new Complex(1, 0);
    this.b = b ?? new Complex(0, 0);
    this.c = c ?? new Complex(0, 0);
    this.d = d ?? new Complex(1, 0);
  }

  /* Chain product: [this] × [m] */
  mul(m) {
    return new ABCD(
      this.a.mul(m.a).add(this.b.mul(m.c)),
      this.a.mul(m.b).add(this.b.mul(m.d)),
      this.c.mul(m.a).add(this.d.mul(m.c)),
      this.c.mul(m.b).add(this.d.mul(m.d))
    );
  }

  /* Factory helpers */
  static series(Z)  { return new ABCD(new Complex(1,0), Z,               new Complex(0,0), new Complex(1,0)); }
  static shunt(Y)   { return new ABCD(new Complex(1,0), new Complex(0,0), Y,               new Complex(1,0)); }
  static identity() { return new ABCD(); }
}

/* ── Utility formatters ──────────────────────────────── */
function fmtCompVal(val, type) {
  if (type === 'C') {
    if (val >= 1e-9) return (val * 1e9).toFixed(2) + ' nF';
    return (val * 1e12).toFixed(1) + ' pF';
  } else {
    if (val >= 1e-3) return (val * 1e3).toFixed(3) + ' mH';
    if (val >= 1e-6) return (val * 1e6).toFixed(3) + ' µH';
    return (val * 1e9).toFixed(1) + ' nH';
  }
}
