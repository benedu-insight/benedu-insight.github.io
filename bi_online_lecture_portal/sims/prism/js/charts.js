/* ═══════════════════════════════════════════════════════════
   charts.js — RF Matcher Engine v3.7
   Smith Chart: gradient trajectory + marching-ants animation
   S11: exact fCenter calculation
   Benedu Insight © 2025
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Dark mode helper ── */
function isDark() { return document.documentElement.classList.contains('dark'); }
function canvasBg()  { return isDark() ? '#141B28' : '#FAFBFD'; }
function gridCol1()  { return isDark() ? '#1E2A3A' : '#D4DCE8'; }
function gridCol2()  { return isDark() ? '#1A2535' : '#DDE4EE'; }
function axisCol()   { return isDark() ? '#2A3A50' : '#C0CAD8'; }
function r1Col()     { return isDark() ? '#1E3A2A' : '#C0D4C0'; }
function labelCol()  { return isDark() ? '#4A6A8A' : '#8A96A8'; }
function prepCanvas(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: rect.width, H: rect.height };
}

/* ── Gamma from Z ─────────────────────────────────────── */
function zToGam(z, z0re) {
  const z0 = new Complex(z0re, 0);
  return z.sub(z0).div(z.add(z0));
}

/* ─────────────────────────────────────────────────────────
   TRAJECTORY HELPERS
   Color interpolation: ZL(red #DC2626) → Zin(green #0F8C50)
───────────────────────────────────────────────────────── */

/* Interpolate red→green at normalized t=0..1 */
function _trajColor(t, alpha=1) {
  const r = Math.round(220*(1-t) + 15*t);
  const g = Math.round(38*(1-t)  + 140*t);
  const b = Math.round(38*(1-t)  + 80*t);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* Build { nodes, total } from canvas-space pts array */
function _buildPolyline(pts) {
  let total = 0;
  const nodes = [{ x: pts[0].x, y: pts[0].y, d: 0 }];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
    total += Math.sqrt(dx*dx + dy*dy);
    nodes.push({ x: pts[i].x, y: pts[i].y, d: total });
  }
  return { nodes, total };
}

/* Point + normalized-t at arc-length d */
function _ptAt(nodes, total, d) {
  d = ((d % total) + total) % total;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].d >= d) {
      const seg = nodes[i].d - nodes[i-1].d;
      const u   = seg > 0 ? (d - nodes[i-1].d) / seg : 0;
      return {
        x: nodes[i-1].x + u * (nodes[i].x - nodes[i-1].x),
        y: nodes[i-1].y + u * (nodes[i].y - nodes[i-1].y),
        t: (nodes[i-1].d + u * seg) / total
      };
    }
  }
  return { ...nodes[nodes.length-1], t: 1 };
}

/* 1. Gradient static path */
function _drawGradientPath(ctx, pts) {
  if (pts.length < 2) return;
  const { nodes, total } = _buildPolyline(pts);
  ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  let accum = 0;
  for (let i = 1; i < pts.length; i++) {
    const segLen = nodes[i].d - nodes[i-1].d;
    const tm     = (accum + segLen/2) / total;
    accum += segLen;
    ctx.beginPath();
    ctx.moveTo(pts[i-1].x, pts[i-1].y);
    ctx.lineTo(pts[i].x,   pts[i].y);
    ctx.strokeStyle = _trajColor(tm, 0.82);
    ctx.stroke();
  }
}

/* 2. Marching-ants flow overlay */
function _drawFlowOverlay(ctx, pts, phase) {
  if (pts.length < 2) return;
  const { nodes, total } = _buildPolyline(pts);
  if (total < 2) return;
  const DASH = 7, GAP = 11, PERIOD = DASH + GAP;
  ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  let dashStart = -(phase * PERIOD) % PERIOD;
  if (dashStart > 0) dashStart -= PERIOD;
  while (dashStart < total) {
    const ds = dashStart, de = dashStart + DASH;
    if (de > 0 && ds < total) {
      const a = _ptAt(nodes, total, Math.max(ds, 0));
      const b = _ptAt(nodes, total, Math.min(de, total));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = _trajColor((a.t + b.t) / 2, 0.5);
      ctx.stroke();
    }
    dashStart += PERIOD;
  }
}

/* 3. Direction arrow at ~40% along path */
function _drawArrow(ctx, pts) {
  if (pts.length < 2) return;
  const { nodes, total } = _buildPolyline(pts);
  const target = total * 0.40;
  let ax = pts[0].x, ay = pts[0].y, ang = 0;
  for (let i = 1; i < pts.length; i++) {
    const prev = nodes[i-1], curr = nodes[i];
    if (curr.d >= target) {
      const u = (target - prev.d) / Math.max(curr.d - prev.d, 1e-9);
      ax  = prev.x + u*(curr.x - prev.x);
      ay  = prev.y + u*(curr.y - prev.y);
      ang = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      break;
    }
  }
  ctx.save();
  ctx.translate(ax, ay); ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(9, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5);
  ctx.closePath();
  ctx.fillStyle = _trajColor(0.4, 0.88);
  ctx.fill();
  ctx.restore();
}

/* ─────────────────────────────────────────────────────────
   ANIMATION STATE
───────────────────────────────────────────────────────── */
let _animHandle = null;
let _animSol    = null;
let _animZSrc   = null;
let _animPhase  = 0;

function startSmithAnimation(sol, zSrc) {
  _animSol   = sol;
  _animZSrc  = zSrc;
  if (_animHandle) cancelAnimationFrame(_animHandle);
  let lastTs = null;
  function tick(ts) {
    if (lastTs === null) lastTs = ts;
    _animPhase = (_animPhase + (ts - lastTs) / 1000 * 0.50) % 1;
    lastTs = ts;
    drawSmithChart(_animSol, _animZSrc);
    _animHandle = requestAnimationFrame(tick);
  }
  _animHandle = requestAnimationFrame(tick);
}

function stopSmithAnimation() {
  if (_animHandle) { cancelAnimationFrame(_animHandle); _animHandle = null; }
}

/* ── Triangle marker (up/down) at point p ── */
function _drawTriangle(ctx, p, dir, col) {
  const S = 6;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(0, -S); ctx.lineTo(S, S*0.6); ctx.lineTo(-S, S*0.6);
  } else {
    ctx.moveTo(0, S); ctx.lineTo(S, -S*0.6); ctx.lineTo(-S, -S*0.6);
  }
  ctx.closePath();
  ctx.fillStyle   = col;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════
   SMITH CHART DRAW
═══════════════════════════════════════════════════════ */
function drawSmithChart(sol, zSrc) {
  const cv = prepCanvas('smithCanvas');
  if (!cv) return;
  const { ctx, W, H } = cv;
  const cx = W/2, cy = H/2;
  const R  = Math.min(cx, cy) - 16;
  const z0re = Math.max(zSrc.re, 1);

  ctx.fillStyle = canvasBg();
  ctx.fillRect(0, 0, W, H);

  /* ── Grid: constant-R circles ── */
  [[0,gridCol1(),1],[0.2,gridCol2(),.7],[0.5,gridCol2(),.7],
   [1,r1Col(),1.2],[2,gridCol2(),.7],[5,gridCol2(),.7]
  ].forEach(([rn,col,lw])=>{
    const sc=R/(rn+1),xC=cx+R-sc;
    ctx.beginPath(); ctx.arc(xC,cy,sc,0,Math.PI*2);
    ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.stroke();
  });

  /* ── Grid: constant-X arcs ── */
  [.2,.5,1,2,-.2,-.5,-1,-2].forEach(xn=>{
    const sc=R/Math.abs(xn),yC=cy+(xn>0?-sc:sc);
    ctx.beginPath(); ctx.arc(cx+R,yC,sc,0,Math.PI*2);
    ctx.strokeStyle=gridCol2(); ctx.lineWidth=.7; ctx.stroke();
  });

  /* ── Axes ── */
  ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx+R,cy);
  ctx.strokeStyle=axisCol(); ctx.lineWidth=.8; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=axisCol(); ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx+R/2,cy,R/2,0,Math.PI*2);
  ctx.strokeStyle=r1Col(); ctx.lineWidth=1.2; ctx.stroke();

  const toXY = z => {
    const g = zToGam(z, z0re);
    return { x: cx+g.re*R, y: cy-g.im*R };
  };

  /* ── C_Load sweep line (red) ── */
  if (sol.loadSweep && sol.loadSweep.length > 1) {
    const pts = sol.loadSweep.map(z => toXY(z));
    ctx.beginPath();
    pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.strokeStyle = 'rgba(220,38,38,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
    /* Current C_Load position — filled triangle marker */
    _drawTriangle(ctx, toXY(sol.Zout), 'up', '#DC2626');
  }

  /* ── C_Tune sweep line (blue) ── */
  if (sol.tuneSweep && sol.tuneSweep.length > 1) {
    const pts = sol.tuneSweep.map(z => toXY(z));
    ctx.beginPath();
    pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.strokeStyle = 'rgba(3,105,161,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    /* Current C_Tune position — filled triangle marker */
    _drawTriangle(ctx, toXY(sol.Zout), 'down', '#0369A1');
  }

  /* ── Tuning contour (Zout boundary) ── */
  if (document.getElementById('chkContour')?.checked !== false &&
      sol.contour && sol.contour.length > 3) {
    ctx.beginPath();
    sol.contour.forEach((z,i)=>{ const p=toXY(z); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); });
    ctx.closePath();
    ctx.fillStyle='rgba(112,48,160,.07)'; ctx.fill();
    ctx.strokeStyle='rgba(112,48,160,.45)'; ctx.lineWidth=1.2;
    ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ── Conjugate contour (matchable Z_L region) ── */
  if (sol.conjContour && sol.conjContour.length > 3) {
    ctx.beginPath();
    sol.conjContour.forEach((z,i)=>{ const p=toXY(z); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); });
    ctx.closePath();
    ctx.fillStyle='rgba(15,140,80,.08)'; ctx.fill();
    ctx.strokeStyle='rgba(15,140,80,.7)'; ctx.lineWidth=1.5;
    ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([]);
    /* Label inside region */
    const pts = sol.conjContour.map(z => toXY(z));
    const mx  = pts.reduce((s,p)=>s+p.x,0)/pts.length;
    const my  = pts.reduce((s,p)=>s+p.y,0)/pts.length;
    ctx.font="bold 8.5px 'Google Sans',sans-serif";
    ctx.fillStyle='rgba(10,107,60,0.75)';
    ctx.textAlign='center';
    ctx.fillText('Matchable Z_L', mx, my);
    ctx.textAlign='left';
  }

  /* ── Trajectory: gradient + animated flow + arrow ── */
  const showTraj = document.getElementById('chkTrajectory')?.checked !== false;
  if (showTraj && sol.trajectory && sol.trajectory.length > 1) {
    const pts = sol.trajectory.map(z => toXY(z));
    _drawGradientPath(ctx, pts);
    _drawFlowOverlay(ctx, pts, _animPhase);
    _drawArrow(ctx, pts);
  }

  /* ── ZL and Zin markers — ALWAYS visible (independent of trajectory) ── */
  if (sol.trajectory && sol.trajectory.length > 1) {
    const pts  = sol.trajectory.map(z => toXY(z));
    const pZL  = pts[0];
    const pZin = pts[pts.length-1];

    /* ZL — red */
    ctx.beginPath(); ctx.arc(pZL.x,pZL.y,7,0,Math.PI*2);
    ctx.fillStyle='rgba(220,38,38,.12)'; ctx.fill();
    ctx.beginPath(); ctx.arc(pZL.x,pZL.y,4,0,Math.PI*2);
    ctx.fillStyle='#DC2626'; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.2; ctx.stroke();
    ctx.font="bold 10px 'Google Sans',sans-serif";
    ctx.fillStyle='#DC2626';
    ctx.fillText('ZL', pZL.x+8, pZL.y-6);

    /* Zin — green */
    ctx.beginPath(); ctx.arc(pZin.x,pZin.y,7,0,Math.PI*2);
    ctx.fillStyle='rgba(15,140,80,.12)'; ctx.fill();
    ctx.beginPath(); ctx.arc(pZin.x,pZin.y,4,0,Math.PI*2);
    ctx.fillStyle='#0F8C50'; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.2; ctx.stroke();
    ctx.font="bold 10px 'Google Sans',sans-serif";
    ctx.fillStyle='#0F8C50';
    ctx.fillText('Zin', pZin.x+8, pZin.y-6);
  }

  /* ── Zout marker + thin dashed line to Zin ── */
  if (sol.Zout) {
    const pZout = toXY(sol.Zout);

    /* Thin dashed line: Zin → Zout (conjugate relationship) */
    if (sol.trajectory && sol.trajectory.length > 1) {
      const pts  = sol.trajectory.map(z => toXY(z));
      const pZin = pts[pts.length-1];
      ctx.beginPath();
      ctx.moveTo(pZin.x, pZin.y);
      ctx.lineTo(pZout.x, pZout.y);
      ctx.strokeStyle = 'rgba(180,140,60,0.5)';
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* Zout dot */
    ctx.beginPath(); ctx.arc(pZout.x,pZout.y,4.5,0,Math.PI*2);
    ctx.fillStyle='#D97706'; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
    ctx.font="9px 'Google Sans',sans-serif";
    ctx.fillStyle='#D97706';
    ctx.fillText('Zout', pZout.x+6, pZout.y+11);
  }

  /* ── Center dot ── */
  ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2);
  ctx.fillStyle='#0F8C50'; ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();

  /* ── Z0 label ── */
  ctx.font="8.5px 'JetBrains Mono',monospace";
  ctx.fillStyle=labelCol();
  ctx.fillText(`Z₀ = ${z0re.toFixed(0)} Ω`, 5, H-5);
}

/* ═══════════════════════════════════════════════════════
   S11 MAGNITUDE RESPONSE
   curDB computed exactly at fCenter (not from sweep)
═══════════════════════════════════════════════════════ */
function drawS11(fCenter, zSrc, zLoad, comps, sweepMult) {
  const cv = prepCanvas('s11Canvas');
  if (!cv) return;
  const { ctx, W, H } = cv;

  ctx.fillStyle = canvasBg();
  ctx.fillRect(0, 0, W, H);

  const PAD  = { L:34, R:10, T:8, B:22 };
  const pW   = W - PAD.L - PAD.R;
  const pH   = H - PAD.T - PAD.B;
  const fMin = fCenter / sweepMult;
  const fMax = fCenter * sweepMult;
  const DB_MAX = 0, DB_MIN = -50;
  const STEPS  = 160;

  /* dB grid — -10dB bold highlighted */
  ctx.font="8.5px 'JetBrains Mono',monospace";
  [-10,-20,-30,-40].forEach(db=>{
    const yG=PAD.T+(db-DB_MAX)/(DB_MIN-DB_MAX)*pH;
    ctx.beginPath(); ctx.moveTo(PAD.L,yG); ctx.lineTo(PAD.L+pW,yG);
    if (db === -10) {
      ctx.strokeStyle= isDark() ? 'rgba(88,166,255,0.3)' : 'rgba(3,105,161,0.25)';
      ctx.lineWidth=1.2;
    } else {
      ctx.strokeStyle= isDark() ? '#1E2A3A' : '#E4E8F0';
      ctx.lineWidth=.8;
    }
    ctx.stroke();
    ctx.fillStyle = db === -10 ? (isDark()?'#58A6FF':'#0369A1') : labelCol();
    ctx.fillText(db+'dB', 2, yG+3);
  });
  ctx.strokeStyle= isDark() ? '#2A3A50' : '#D4DCE8';
  ctx.lineWidth=.8;
  ctx.strokeRect(PAD.L, PAD.T, pW, pH);

  /* Exact S11 at fCenter */
  const exactSol = solveNetwork(fCenter, 1, zSrc, zLoad, comps);
  const curDB    = 20*Math.log10(Math.max(exactSol.Gamma.mag(), 1e-5));
  const curX     = PAD.L + ((fCenter-fMin)/(fMax-fMin))*pW;
  let   curY     = PAD.T + (curDB-DB_MAX)/(DB_MIN-DB_MAX)*pH;
  curY = Math.max(PAD.T, Math.min(PAD.T+pH, curY));

  /* Sweep */
  const pts=[];
  for(let i=0;i<=STEPS;i++){
    const f  =fMin+(fMax-fMin)*(i/STEPS);
    const res=solveNetwork(f,1,zSrc,zLoad,comps);
    const db =20*Math.log10(Math.max(res.Gamma.mag(),1e-5));
    const xC =PAD.L+(i/STEPS)*pW;
    const yC =PAD.T+(db-DB_MAX)/(DB_MIN-DB_MAX)*pH;
    pts.push({x:xC, y:Math.max(PAD.T,Math.min(PAD.T+pH,yC))});
  }

  /* BW at -10 dB */
  let bwF1=null, bwF2=null;
  for(let i=1;i<=STEPS;i++){
    const fA=fMin+(fMax-fMin)*((i-1)/STEPS), fB=fMin+(fMax-fMin)*(i/STEPS);
    const dA=20*Math.log10(Math.max(solveNetwork(fA,1,zSrc,zLoad,comps).Gamma.mag(),1e-5));
    const dB_=20*Math.log10(Math.max(solveNetwork(fB,1,zSrc,zLoad,comps).Gamma.mag(),1e-5));
    if(bwF1===null && dA>-10 && dB_<=-10) bwF1=(fA+fB)/2;
    if(bwF1!==null && bwF2===null && dA<=-10 && dB_>-10) bwF2=(fA+fB)/2;
  }
  const bwEl=document.getElementById('bwLabel');
  if(bwEl){
    if(bwF1!==null && bwF2!==null){
      const bwMHz=((bwF2-bwF1)/1e6).toFixed(2);
      bwEl.textContent=`BW₋₁₀: ${bwMHz} MHz`;
    } else {
      bwEl.textContent='';
    }
  }

  /* -10 dB threshold shaded region */
  const y10 = PAD.T + (-10-DB_MAX)/(DB_MIN-DB_MAX)*pH;
  ctx.fillStyle= isDark() ? 'rgba(88,166,255,0.05)' : 'rgba(3,105,161,0.04)';
  ctx.fillRect(PAD.L, PAD.T, pW, Math.min(y10-PAD.T, pH));
  const grad=ctx.createLinearGradient(0,PAD.T,0,PAD.T+pH);
  grad.addColorStop(0,'rgba(3,105,161,.13)');
  grad.addColorStop(1,'rgba(3,105,161,.01)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x,PAD.T+pH);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x,PAD.T+pH);
  ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

  /* Curve */
  ctx.beginPath();
  pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.strokeStyle='#0369A1'; ctx.lineWidth=2; ctx.stroke();

  /* Center-frequency marker */
  ctx.beginPath(); ctx.moveTo(curX,PAD.T); ctx.lineTo(curX,PAD.T+pH);
  ctx.strokeStyle='#0F8C50'; ctx.lineWidth=1;
  ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);

  /* Operating point */
  ctx.beginPath(); ctx.arc(curX,curY,4.5,0,Math.PI*2);
  ctx.fillStyle='#0F8C50'; ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();

  /* Frequency labels */
  ctx.fillStyle=labelCol(); ctx.font="8.5px 'JetBrains Mono',monospace";
  ctx.textAlign='center';
  [0,.25,.5,.75,1].forEach(t=>{
    const fL=(fMin+(fMax-fMin)*t)/1e6;
    ctx.fillText(fL.toFixed(1), PAD.L+t*pW, H-3);
  });
  ctx.textAlign='left';

  const badge=document.getElementById('curS11Label');
  if(badge) badge.textContent=curDB.toFixed(1)+' dB';
}