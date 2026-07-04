/* ═══════════════════════════════════════════════════════════
   ui.js — RF Matcher Engine v3.3
   Adds: editable label, parasitic checkbox in inspector
   Benedu Insight © 2025
═══════════════════════════════════════════════════════════ */
'use strict';

window.AppState = { selectedRef:'C1', sweepMult:2 };

/* ── Input readers ── */
function readZs(){ return new Complex(parseFloat(document.getElementById('zsReal').value)||50, parseFloat(document.getElementById('zsImag').value)||0); }
function readZl(){ return new Complex(parseFloat(document.getElementById('zlReal').value)||50, parseFloat(document.getElementById('zlImag').value)||0); }
function readFreq(){ return (parseFloat(document.getElementById('freqInput').value)||13.56)*1e6; }
function readPower(){ return parseFloat(document.getElementById('fwdPowerInput').value)||500; }

/* ── Mode selection ── */
function setMode(btn){
  setNetMode(btn.dataset.mode);
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b===btn));
  const keys=getTuneLoadKeys(getComps());
  AppState.selectedRef=keys.loadKey||Object.keys(getComps())[0];
  updateSlidersFromValues();
  runSimulation();
}

/* ── Slider sync ── */
function updateSlidersFromValues(){
  const comps=getComps();
  const {tuneKey,loadKey}=getTuneLoadKeys(comps);
  if(!tuneKey||!loadKey) return;
  const tC=comps[tuneKey],lC=comps[loadKey];
  const tp=(tC.value-tC.minVal)/(tC.maxVal-tC.minVal)*100;
  const lp=(lC.value-lC.minVal)/(lC.maxVal-lC.minVal)*100;
  document.getElementById('tuneSlider').value=tp.toFixed(2);
  document.getElementById('loadSlider').value=lp.toFixed(2);
  document.getElementById('tunePosVal').textContent=tp.toFixed(2)+'%';
  document.getElementById('loadPosVal').textContent=lp.toFixed(2)+'%';
  document.getElementById('tuneCapValDisp').textContent=fmtCompVal(tC.value,'C');
  document.getElementById('loadCapValDisp').textContent=fmtCompVal(lC.value,'C');
  /* Update slider name labels from comp.label */
  const tuneLbl = document.getElementById('tuneSldLabel');
  const loadLbl = document.getElementById('loadSldLabel');
  if(tuneLbl) tuneLbl.textContent = tC.label || tuneKey;
  if(loadLbl) loadLbl.textContent = lC.label || loadKey;
}

function handleSliderChange(){
  const comps=getComps();
  const {tuneKey,loadKey}=getTuneLoadKeys(comps);
  if(!tuneKey||!loadKey) return;
  const tp=parseFloat(document.getElementById('tuneSlider').value);
  const lp=parseFloat(document.getElementById('loadSlider').value);
  comps[tuneKey].value=comps[tuneKey].minVal+(tp/100)*(comps[tuneKey].maxVal-comps[tuneKey].minVal);
  comps[loadKey].value=comps[loadKey].minVal+(lp/100)*(comps[loadKey].maxVal-comps[loadKey].minVal);
  document.getElementById('tunePosVal').textContent=tp.toFixed(2)+'%';
  document.getElementById('loadPosVal').textContent=lp.toFixed(2)+'%';
  document.getElementById('tuneCapValDisp').textContent=fmtCompVal(comps[tuneKey].value,'C');
  document.getElementById('loadCapValDisp').textContent=fmtCompVal(comps[loadKey].value,'C');
  if(AppState.selectedRef===tuneKey) updateInspector(tuneKey);
  if(AppState.selectedRef===loadKey) updateInspector(loadKey);
  runSimulation();
}

/* ── Component selection ── */
function selectComponent(ref){
  AppState.selectedRef=ref;
  drawSchematic();
  updateInspector(ref);
  document.querySelectorAll('#componentTableBody tr').forEach(tr=>{
    tr.className=tr.dataset.ref===ref?'row-selected':'';
  });
}

/* ── Inspector ── */
function updateInspector(ref){
  const comp=getComps()[ref];
  if(!comp) return;
  /* Internal ref key (always shown in hidden field) */
  document.getElementById('inspectorRef').value=ref;
  /* Editable label */
  document.getElementById('inspectorLabel').value=comp.label||ref;
  /* Parasitic checkbox */
  document.getElementById('inspectorParasitic').checked=!!comp.parasitic;

  const isCap=comp.type.startsWith('C');
  const isVar=comp.type.endsWith('_Var');
  const unitSel=document.getElementById('inspectorUnit');
  if((isCap&&(unitSel.value==='uH'||unitSel.value==='nH'))||(!isCap&&(unitSel.value==='pF'||unitSel.value==='nF')))
    unitSel.value=isCap?'pF':'uH';
  const scale={pF:1e12,nF:1e9,uH:1e6,nH:1e9}[unitSel.value]||1;
  document.getElementById('inspectorValue').value=(comp.value*scale).toFixed(3);
  document.querySelectorAll('.var-limit-field').forEach(el=>el.style.display=isVar?'flex':'none');
  if(isVar){
    document.getElementById('inspectorMin').value=(comp.minVal*scale).toFixed(3);
    document.getElementById('inspectorMax').value=(comp.maxVal*scale).toFixed(3);
  }
  document.getElementById('inspectorMaxV').value=comp.maxV.toFixed(0);
  document.getElementById('inspectorMaxI').value=comp.maxI.toFixed(1);
}

function applyInspectorChange(){
  const ref=document.getElementById('inspectorRef').value;
  const comp=getComps()[ref];
  if(!comp) return;

  /* Label update */
  const newLabel=document.getElementById('inspectorLabel').value.trim();
  if(newLabel) comp.label=newLabel;

  /* Parasitic flag */
  comp.parasitic=document.getElementById('inspectorParasitic').checked;

  /* Value */
  const unit=document.getElementById('inspectorUnit').value;
  const mult={pF:1e-12,nF:1e-9,uH:1e-6,nH:1e-9}[unit]||1;
  const val=parseFloat(document.getElementById('inspectorValue').value);
  if(!isNaN(val)) comp.value=val*mult;
  if(comp.type.endsWith('_Var')){
    const mn=parseFloat(document.getElementById('inspectorMin').value);
    const mx=parseFloat(document.getElementById('inspectorMax').value);
    if(!isNaN(mn)) comp.minVal=mn*mult;
    if(!isNaN(mx)) comp.maxVal=mx*mult;
    comp.value=Math.max(comp.minVal,Math.min(comp.maxVal,comp.value));
  }
  const maxV=parseFloat(document.getElementById('inspectorMaxV').value);
  const maxI=parseFloat(document.getElementById('inspectorMaxI').value);
  if(!isNaN(maxV)) comp.maxV=maxV;
  if(!isNaN(maxI)) comp.maxI=maxI;

  updateSlidersFromValues();
  runSimulation();
}

/* ── Set Z_L from current tuning position ────────────────
   현재 C_Load / C_Tune 위치에서 Zin = Zs* (공액매칭) 이
   되도록 하는 부하 임피던스 Z_L 을 역산하여 zlReal/zlImag
   입력 필드에 기입한다.

   ABCD 행렬에서:   Zin = (A·Z_L + B) / (C·Z_L + D)
   → 매칭 조건:     Zin = Zs (순저항의 경우 Zs* = Zs)
   → 역산:          Z_L = (Zs·D - B) / (A - Zs·C)           */
/* ── Set Z_L from current tuning position ────────────────
   3-stage pipeline for maximum accuracy:

   Stage 1 — ABCD inverse:
     Solve Z_L = (Zs·D − B) / (A − Zs·C) analytically.
     Gives a mathematically exact answer assuming ideal
     component values — fast and close.

   Stage 2 — Auto Match (Nelder-Mead):
     Use the inverse result as Z_L, then immediately run
     Auto Match to let C_Load / C_Tune self-correct for
     any parasitic coupling and slider quantisation error.
     This removes the residual Γ that the analytic inverse
     cannot eliminate.

   Stage 3 — Re-run simulation with corrected values.       */
function setZLFromCurrentPoint() {
  const comps  = getComps();
  const freqHz = readFreq();
  const omega  = 2 * Math.PI * freqHz;
  const zSrc   = readZs();

  /* ── Stage 1: analytic ABCD inverse ── */
  const steps = buildSteps(comps, omega);
  let total = ABCD.identity();
  for (const s of steps) {
    const m = s.type === 'series'
      ? ABCD.series(s.getZ(omega))
      : ABCD.shunt(s.getY(omega));
    total = m.mul(total);
  }
  const Zt  = zSrc;                          /* target Zin = Zs (real) */
  const num = Zt.mul(total.d).sub(total.b);
  const den = total.a.sub(Zt.mul(total.c));
  const ZL  = num.div(den);

  /* Write Z_L into input fields (6 decimal places for precision) */
  document.getElementById('zlReal').value = ZL.re.toFixed(6);
  document.getElementById('zlImag').value = ZL.im.toFixed(6);

  /* ── Stage 2: Auto Match to absorb residual error ── */
  /* Save current C positions as warm-start for Nelder-Mead */
  const { tuneKey, loadKey } = getTuneLoadKeys(comps);
  autoMatch(freqHz, zSrc, ZL, comps);

  /* ── Stage 3: update UI and redraw ── */
  updateSlidersFromValues();
  runSimulation();
}

/* ── Compute 4-corner extreme impedances ─────────────────
   Sweeps C_Load × C_Tune at their min/max corners to find
   the matching range boundary on the Smith chart.          */
function computeExtremes(freqHz, zSrc, comps) {
  const { tuneKey, loadKey } = getTuneLoadKeys(comps);
  if (!tuneKey || !loadKey) return null;
  const tC = comps[tuneKey], lC = comps[loadKey];
  if (!tC.minVal || !lC.minVal) return null;

  const zoutAt = (tv, lv) => {
    const c = JSON.parse(JSON.stringify(comps));
    c[tuneKey].value = tv; c[loadKey].value = lv;
    return solveNetwork(freqHz, 1, zSrc, new Complex(50,0), c).Zout;
  };

  const LL = zoutAt(tC.minVal, lC.minVal);  /* Tune-Low,  Load-Low  */
  const LH = zoutAt(tC.minVal, lC.maxVal);  /* Tune-Low,  Load-High */
  const HL = zoutAt(tC.maxVal, lC.minVal);  /* Tune-High, Load-Low  */
  const HH = zoutAt(tC.maxVal, lC.maxVal);  /* Tune-High, Load-High */

  const allRe = [LL.re, LH.re, HL.re, HH.re];
  const allIm = [LL.im, LH.im, HL.im, HH.im];
  return {
    LL, LH, HL, HH,
    rMin: Math.min(...allRe), rMax: Math.max(...allRe),
    xMin: Math.min(...allIm), xMax: Math.max(...allIm)
  };
}

/* ── C_Load sweep (fixed C_Tune at current) ─────────────── */
function sweepLoad(freqHz, zSrc, comps, N=60) {
  const { tuneKey, loadKey } = getTuneLoadKeys(comps);
  if (!tuneKey || !loadKey) return [];
  const tC = comps[tuneKey], lC = comps[loadKey];
  if (!lC.minVal) return [];
  const pts = [];
  for (let i=0; i<=N; i++) {
    const lv = lC.minVal + (lC.maxVal-lC.minVal)*(i/N);
    const c  = JSON.parse(JSON.stringify(comps));
    c[loadKey].value = lv;
    pts.push(solveNetwork(freqHz,1,zSrc,new Complex(50,0),c).Zout);
  }
  return pts;
}

/* ── C_Tune sweep (fixed C_Load at current) ─────────────── */
function sweepTune(freqHz, zSrc, comps, N=60) {
  const { tuneKey, loadKey } = getTuneLoadKeys(comps);
  if (!tuneKey || !loadKey) return [];
  const tC = comps[tuneKey], lC = comps[loadKey];
  if (!tC.minVal) return [];
  const pts = [];
  for (let i=0; i<=N; i++) {
    const tv = tC.minVal + (tC.maxVal-tC.minVal)*(i/N);
    const c  = JSON.parse(JSON.stringify(comps));
    c[tuneKey].value = tv;
    pts.push(solveNetwork(freqHz,1,zSrc,new Complex(50,0),c).Zout);
  }
  return pts;
}

/* ── Auto-match ── */
function triggerAutoMatch(){
  autoMatch(readFreq(),readZs(),readZl(),getComps());
  updateSlidersFromValues();
  runSimulation();
}

/* ── Sweep range ── */
function setSweep(btn){
  AppState.sweepMult=parseInt(btn.dataset.mult);
  document.querySelectorAll('.sweep-btn').forEach(b=>b.classList.toggle('active',b===btn));
  runSimulation();
}

/* ── Component table ── */
function updateComponentTable(comps,calc){
  const tbody=document.getElementById('componentTableBody');
  tbody.innerHTML='';
  for(const ref in comps){
    const comp=comps[ref];
    const c=calc[ref]||{vrms:0,irms:0,pLoss:0};
    const vOvr=c.vrms>comp.maxV, iOvr=c.irms>comp.maxI;
    const vNear=!vOvr&&c.vrms>comp.maxV*0.8, iNear=!iOvr&&c.irms>comp.maxI*0.8;
    const tr=document.createElement('tr');
    tr.dataset.ref=ref;
    tr.className=ref===AppState.selectedRef?'row-selected':'';
    if(comp.parasitic) tr.classList.add('parasitic-row');
    tr.onclick=()=>selectComponent(ref);
    const dispRef=comp.label||ref;
    tr.innerHTML=`
      <td class="ref-cell${comp.parasitic?' para-cell':''}">${dispRef}</td>
      <td class="${vOvr?'over-limit':vNear?'near-limit':''}">${c.vrms.toFixed(1)}</td>
      <td class="${iOvr?'over-limit':iNear?'near-limit':''}">${c.irms.toFixed(3)}</td>
      <td>${(c.vrms*Math.SQRT2).toFixed(1)}</td>
      <td>${comp.maxV.toLocaleString()}</td>
      <td>${comp.maxI.toLocaleString()}</td>
      <td>${c.pLoss.toFixed(3)}</td>`;
    tbody.appendChild(tr);
  }
}

/* ── Main simulation runner ── */
function runSimulation(){
  const comps=getComps();
  const freqHz=readFreq(),pFwd=readPower(),zSrc=readZs(),zLoad=readZl();
  const sol=solveNetwork(freqHz,pFwd,zSrc,zLoad,comps);
  sol.contour = document.getElementById('chkContour')?.checked
    ? getTuningContour(freqHz, zSrc, comps) : [];

  /* Conjugate contour: take Zout boundary → conjugate each point
     → represents the Z_L range that this matcher CAN match        */
  sol.conjContour = document.getElementById('chkConjContour')?.checked
    ? getTuningContour(freqHz, zSrc, comps).map(z => new Complex(z.re, -z.im))
    : [];

  /* C_Load / C_Tune independent sweeps for Smith chart */
  sol.loadSweep = document.getElementById('chkLoadSweep')?.checked ? sweepLoad(freqHz,zSrc,comps) : [];
  sol.tuneSweep = document.getElementById('chkTuneSweep')?.checked ? sweepTune(freqHz,zSrc,comps) : [];

  /* 4-corner extreme impedances */
  const ext = computeExtremes(freqHz,zSrc,comps);

  document.getElementById('resZin').textContent   =sol.Zin.toString(2)+' Ω';
  document.getElementById('resZout').textContent  =sol.Zout.toString(2)+' Ω';
  document.getElementById('resGamma').textContent =sol.Gamma.mag().toFixed(4)+' ∠ '+(sol.Gamma.arg()*180/Math.PI).toFixed(1)+'°';

  /* Z_L polar form: |Z_L| ∠ θ° */
  const zlMag = Math.sqrt(zLoad.re*zLoad.re + zLoad.im*zLoad.im);
  const zlAng = Math.atan2(zLoad.im, zLoad.re) * 180 / Math.PI;
  const zlPolarEl = document.getElementById('resZLPolar');
  if(zlPolarEl) zlPolarEl.textContent = zlMag.toFixed(2)+' Ω ∠ '+zlAng.toFixed(1)+'°';

  const vswr=sol.vswr;
  const vswrEl=document.getElementById('resVswr'),pRefEl=document.getElementById('resPRef');
  vswrEl.textContent=isFinite(vswr)?vswr.toFixed(3):'∞';
  pRefEl.textContent=sol.pRef.toFixed(2)+' W';
  const vc=vswr<=1.05?'res-val good':vswr<=1.5?'res-val warn':'res-val danger';
  vswrEl.className=vc; pRefEl.className=vc;

  const {tuneKey}=getTuneLoadKeys(comps);

  /* Extreme impedances */
  if (ext) {
    const fmt = z => `${z.re.toFixed(1)} ${z.im>=0?'+':'-'} j${Math.abs(z.im).toFixed(1)} Ω`;
    document.getElementById('resZLL').textContent = fmt(ext.LL);
    document.getElementById('resZLH').textContent = fmt(ext.LH);
    document.getElementById('resZHL').textContent = fmt(ext.HL);
    document.getElementById('resZHH').textContent = fmt(ext.HH);
    document.getElementById('resRRange').textContent = `${ext.rMin.toFixed(1)} ~ ${ext.rMax.toFixed(1)} Ω`;
    document.getElementById('resXRange').textContent = `${ext.xMin.toFixed(1)} ~ ${ext.xMax.toFixed(1)} Ω`;
  }

  const badge=document.getElementById('statusBadge'),stxt=document.getElementById('statusText');
  if(vswr<=1.05){badge.className='status-badge matched';stxt.textContent='MATCHED';}
  else{badge.className='status-badge unmatched';stxt.textContent='UNMATCHED';}

  drawSchematic();
  updateComponentTable(comps,sol.compCalc);
  updateInspector(AppState.selectedRef);
  startSmithAnimation(sol,zSrc);
  drawS11(freqHz,zSrc,zLoad,comps,AppState.sweepMult);
}

/* ════════════════════════════════════════════════════════
   PANEL RESIZER
════════════════════════════════════════════════════════ */
function initResizers(){
  setupColResizer('col-resize-lc','appContainer',0,2);
  setupColResizer('col-resize-cr','appContainer',2,4);
  setupRowResizer('row-resize-ct','centerPanel',0,2);
  setupRowResizer('row-resize-rt','rightPanel',0,2);
}

function setupColResizer(handleId,containerId,colA,colB){
  const handle=document.getElementById(handleId);
  const container=document.getElementById(containerId);
  if(!handle||!container) return;
  let startX,startWidths;
  handle.addEventListener('mousedown',e=>{
    e.preventDefault(); startX=e.clientX;
    startWidths=getComputedStyle(container).gridTemplateColumns.split(' ').map(parseFloat);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    handle.classList.add('dragging');
  });
  function onMove(e){
    const dx=e.clientX-startX;
    const cols=[...startWidths];
    cols[colA]=Math.max(160,cols[colA]+dx);
    cols[colB]=Math.max(160,cols[colB]-dx);
    container.style.gridTemplateColumns=cols.map(w=>w+'px').join(' ');
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    handle.classList.remove('dragging');
    setTimeout(runSimulation,50);
  }
}

function setupRowResizer(handleId,containerId,rowA,rowB){
  const handle=document.getElementById(handleId);
  const container=document.getElementById(containerId);
  if(!handle||!container) return;
  let startY,startHeights;
  handle.addEventListener('mousedown',e=>{
    e.preventDefault(); startY=e.clientY;
    startHeights=getComputedStyle(container).gridTemplateRows.split(' ').map(parseFloat);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    handle.classList.add('dragging');
  });
  function onMove(e){
    const dy=e.clientY-startY;
    const rows=[...startHeights];
    rows[rowA]=Math.max(140,rows[rowA]+dy);
    rows[rowB]=Math.max(60, rows[rowB]-dy);
    container.style.gridTemplateRows=rows.map(h=>h+'px').join(' ');
  }
  function onUp(){
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    handle.classList.remove('dragging');
    setTimeout(runSimulation,50);
  }
}

/* ── Init ── */
window.addEventListener('load',()=>{
  document.querySelectorAll('.mode-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===getMode()));
  AppState.selectedRef=getTuneLoadKeys(getComps()).loadKey||Object.keys(getComps())[0];
  updateSlidersFromValues();
  document.getElementById('chkContour')?.addEventListener('change',runSimulation);
  document.getElementById('chkConjContour')?.addEventListener('change',runSimulation);
  document.getElementById('chkTrajectory')?.addEventListener('change',runSimulation);
  document.getElementById('chkLoadSweep')?.addEventListener('change',runSimulation);
  document.getElementById('chkTuneSweep')?.addEventListener('change',runSimulation);
  initResizers();
  setTimeout(runSimulation,60);
  let _rt;
  window.addEventListener('resize',()=>{clearTimeout(_rt);_rt=setTimeout(runSimulation,80);});
});