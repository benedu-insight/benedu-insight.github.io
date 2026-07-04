/* ═══════════════════════════════════════════════════════════
   solver.js — RF Matcher Engine v3.3
   Adds: parasitic flag, label (editable ref name) per component
   Benedu Insight © 2025
═══════════════════════════════════════════════════════════ */
'use strict';

const COMP_SETS = {
  reverse_l: {
    C1:      { type:'C_Load_Var', value:4.6646e-10, minVal:1e-10,  maxVal:9.5e-10,  maxV:5200,  maxI:94,  label:'C1',      parasitic:false },
    Lpr1:    { type:'L',          value:1.0e-8,                                       maxV:12000, maxI:80,  rSeries:0.08,  label:'Lpr_1',   parasitic:true  },
    L2:      { type:'L',          value:5.6e-7,                                       maxV:15000, maxI:100, rSeries:0.15,  label:'L2',      parasitic:false },
    C2:      { type:'C_Tune_Var', value:7.026e-11,  minVal:2e-11,  maxVal:9e-11,    maxV:10000, maxI:54,               label:'C2',      parasitic:false },
    Cpr:     { type:'C',          value:1.0e-11,                                      maxV:10000, maxI:60,  rSeries:0.05,  label:'Cpr_1',   parasitic:true  },
    Lpr_out: { type:'L',          value:5.0e-8,                                       maxV:15000, maxI:100, rSeries:0.05,  label:'Lpr_2',   parasitic:true  }
  },
  /* L-type: Zs → L2(series) → C2(Tune,series) → C1(Load,shunt)
             → Lpr_out(parasitic,series) → Z_L */
  ltype: {
    L2:      { type:'L',          value:3.8e-7,                                  maxV:15000, maxI:100, rSeries:0.1,  label:'L2',      parasitic:false },
    C2:      { type:'C_Tune_Var', value:500e-12, minVal:10e-12, maxVal:1000e-12, maxV:10000, maxI:54,               label:'C2',      parasitic:false },
    C1:      { type:'C_Load_Var', value:100e-12, minVal:5e-12,  maxVal:500e-12,  maxV:5200,  maxI:94,               label:'C1',      parasitic:false },
    Lpr_out: { type:'L',          value:5.0e-8,                                  maxV:15000, maxI:100, rSeries:0.05, label:'Lpr_out', parasitic:true  }
  },
  /* Pi-type (Standard @ 13.56 MHz):
     Zs → Lpar1(20nH,기생) → C1(Load,shunt,50~900pF)
        → L1(500nH,고정)   → C2(Tune,shunt,50~900pF)
        → Lpar2(20nH,기생) → Z_L
     C1 = 소스 측 shunt (Load),  C2 = 부하 측 shunt (Tune) */
  pitype: {
    Lpar1: { type:'L',          value:20e-9,                                    maxV:12000, maxI:120, rSeries:0.01, label:'Lpar1', parasitic:true  },
    C1:    { type:'C_Load_Var', value:300e-12, minVal:50e-12, maxVal:900e-12,  maxV:15000, maxI:100,               label:'C1',    parasitic:false },
    L1:    { type:'L',          value:500e-9,                                   maxV:15000, maxI:100, rSeries:0.05, label:'L1',    parasitic:false },
    C2:    { type:'C_Tune_Var', value:300e-12, minVal:50e-12, maxVal:900e-12,  maxV:15000, maxI:100,               label:'C2',    parasitic:false },
    Lpar2: { type:'L',          value:20e-9,                                    maxV:12000, maxI:120, rSeries:0.01, label:'Lpar2', parasitic:true  }
  },
  /* T-type (standard 7-element per datasheet):
     C1(shunt,parasitic cap) → L1(series,par) → C2(Load,series) → L2(shunt,par) → C3(Tune,series) → L3(series,par) → C4(shunt,par) → Z_L */
  ttype: {
    C1:  { type:'C',          value:1.0e-11,                                  maxV:9000,  maxI:54,  rSeries:0.05, label:'C1',  parasitic:true  },
    L1:  { type:'L',          value:1.0e-8,                                   maxV:12000, maxI:80,  rSeries:0.05, label:'L1',  parasitic:true  },
    C2:  { type:'C_Load_Var', value:100e-12, minVal:5e-12,  maxVal:500e-12,  maxV:9000,  maxI:54,               label:'C2',  parasitic:false },
    L2:  { type:'L',          value:3.8e-7,                                   maxV:15000, maxI:100, rSeries:0.1,  label:'L2',  parasitic:false },
    C3:  { type:'C_Tune_Var', value:500e-12, minVal:10e-12, maxVal:1000e-12, maxV:4800,  maxI:94,               label:'C3',  parasitic:false },
    L3:  { type:'L',          value:1.0e-8,                                   maxV:12000, maxI:80,  rSeries:0.05, label:'L3',  parasitic:true  },
    C4:  { type:'C',          value:1.0e-11,                                  maxV:10000, maxI:60,  rSeries:0.05, label:'C4',  parasitic:true  }
  }
};

let networkMode = 'reverse_l';

function getComps()    { return COMP_SETS[networkMode]; }
function getMode()     { return networkMode; }
function setNetMode(m) { networkMode = m; }

function getTuneLoadKeys(comps) {
  let tk = null, lk = null;
  for (const k in comps) {
    if (comps[k].type === 'C_Tune_Var') tk = k;
    if (comps[k].type === 'C_Load_Var') lk = k;
  }
  return { tuneKey: tk, loadKey: lk };
}

/* ── Build ABCD step list ─────────────────────────────── */
function buildSteps(comps, omega) {
  const steps = [];

  if (networkMode === 'reverse_l') {
    steps.push({ ref:'Lpr_out', type:'series',
      getZ: w => new Complex(comps.Lpr_out.rSeries||0, w*comps.Lpr_out.value) });
    steps.push({ ref:'Cpr', type:'shunt',
      getY: w => new Complex(comps.Cpr.rSeries||0, -1/(w*comps.Cpr.value)).inv() });
    steps.push({ ref:'C2', type:'series',
      getZ: w => new Complex(0, -1/(w*comps.C2.value)) });
    steps.push({ ref:'L2', type:'series',
      getZ: w => new Complex(comps.L2.rSeries||0, w*comps.L2.value) });
    /* Shunt branch: C1 in SERIES with Lpr1 → combined series impedance */
    steps.push({ ref:'ShuntBranch', type:'shunt',
      getY: w => {
        const ZC1   = new Complex(0, -1/(w*comps.C1.value));
        const ZLpr1 = new Complex(comps.Lpr1.rSeries||0, w*comps.Lpr1.value);
        return ZC1.add(ZLpr1).inv();
      }
    });
  } else if (networkMode === 'ltype') {
    /* L-type ABCD chain (load→source):
       Lpr_out series → C1 shunt → C2 series → L2 series */
    steps.push({ ref:'Lpr_out', type:'series',
      getZ: w => new Complex(comps.Lpr_out.rSeries||0, w*comps.Lpr_out.value) });
    steps.push({ ref:'C1', type:'shunt',
      getY: w => new Complex(0, w*comps.C1.value) });
    steps.push({ ref:'C2', type:'series',
      getZ: w => new Complex(0, -1/(w*comps.C2.value)) });
    steps.push({ ref:'L2', type:'series',
      getZ: w => new Complex(comps.L2.rSeries||0, w*comps.L2.value) });

  } else if (networkMode === 'pitype') {
    /* Pi-type ABCD chain (load→source):
       Lpar2(series) → C2(Tune,shunt) → L1(series) → C1(Load,shunt) → Lpar1(series) */
    steps.push({ ref:'Lpar2', type:'series',
      getZ: w => new Complex(comps.Lpar2.rSeries||0, w*comps.Lpar2.value) });
    steps.push({ ref:'C2', type:'shunt',
      getY: w => new Complex(0, w*comps.C2.value) });
    steps.push({ ref:'L1', type:'series',
      getZ: w => new Complex(comps.L1.rSeries||0, w*comps.L1.value) });
    steps.push({ ref:'C1', type:'shunt',
      getY: w => new Complex(0, w*comps.C1.value) });
    steps.push({ ref:'Lpar1', type:'series',
      getZ: w => new Complex(comps.Lpar1.rSeries||0, w*comps.Lpar1.value) });

  } else if (networkMode === 'ttype') {
    /* T-type (standard 7-element, load→source):
       C4(shunt) → L3(series) → C3(Tune,series) → L2(shunt) → C2(Load,series) → L1(series) → C1(Tune,shunt) */
    steps.push({ ref:'C4', type:'shunt',
      getY: w => new Complex(comps.C4.rSeries||0, -1/(w*comps.C4.value)).inv() });
    steps.push({ ref:'L3', type:'series',
      getZ: w => new Complex(comps.L3.rSeries||0, w*comps.L3.value) });
    steps.push({ ref:'C3', type:'series',
      getZ: w => new Complex(0, -1/(w*comps.C3.value)) });
    steps.push({ ref:'L2', type:'shunt',
      getY: w => new Complex(comps.L2.rSeries||0, w*comps.L2.value).inv() });
    steps.push({ ref:'C2', type:'series',
      getZ: w => new Complex(0, -1/(w*comps.C2.value)) });
    steps.push({ ref:'L1', type:'series',
      getZ: w => new Complex(comps.L1.rSeries||0, w*comps.L1.value) });
    steps.push({ ref:'C1', type:'shunt',
      getY: w => new Complex(0, w*comps.C1.value) });
  }
  return steps;
}

/* ── Core network solver ─────────────────────────────── */
function solveNetwork(freqHz, powerFwd, zSrc, zLoad, comps) {
  const omega = 2*Math.PI*freqHz;
  const steps = buildSteps(comps, omega);

  let total = ABCD.identity();
  for (const s of steps) {
    const m = s.type === 'series' ? ABCD.series(s.getZ(omega)) : ABCD.shunt(s.getY(omega));
    total = m.mul(total);
  }

  const Zin  = total.a.mul(zLoad).add(total.b).div(total.c.mul(zLoad).add(total.d));
  const Zout = total.d.mul(zSrc).add(total.b).div(total.c.mul(zSrc).add(total.a));

  const Vs  = 2*Math.sqrt(powerFwd*zSrc.re);
  const Iin = new Complex(Vs,0).div(zSrc.add(Zin));
  const Vin = Iin.mul(Zin);

  const Gamma = Zin.sub(zSrc.conj()).div(Zin.add(zSrc));
  const vswr  = (1+Gamma.mag())/Math.max(1-Gamma.mag(), 1e-9);
  const pRef  = powerFwd*Gamma.mag()*Gamma.mag();

  /* Trajectory — only non-parasitic steps add a waypoint
     (parasitic comps still contribute to Zin calculation,
      but are excluded from the Smith chart path)          */
  const trajectory = [zLoad];
  let currZ = zLoad;
  for (const s of steps) {
    currZ = s.type==='series' ? currZ.add(s.getZ(omega)) : currZ.inv().add(s.getY(omega)).inv();
    const comp = comps[s.ref] || comps['ShuntBranch'];
    const isPara = s.ref === 'ShuntBranch'
      ? false   /* ShuntBranch = C1+Lpr1 combined; treat as main */
      : !!(comp && comp.parasitic);
    if (!isPara) trajectory.push(currZ);
  }

  /* Per-component V/I */
  const compCalc = {};
  let Vcurr = Vin, Icurr = Iin;
  for (let i = steps.length-1; i >= 0; i--) {
    const s = steps[i];
    if (s.type === 'series') {
      const Z     = s.getZ(omega);
      const Vdrop = Icurr.mul(Z);
      compCalc[s.ref] = { vrms:Vdrop.mag()/Math.SQRT2, irms:Icurr.mag()/Math.SQRT2, pLoss:Math.pow(Icurr.mag()/Math.SQRT2,2)*(Z.re||0) };
      Vcurr = Vcurr.sub(Vdrop);
    } else {
      const Y       = s.getY(omega);
      const Ibranch = Vcurr.mul(Y);
      const Zeff    = Y.re ? Y.inv().re : 0;
      compCalc[s.ref] = { vrms:Vcurr.mag()/Math.SQRT2, irms:Ibranch.mag()/Math.SQRT2, pLoss:Math.pow(Ibranch.mag()/Math.SQRT2,2)*Zeff };
      Icurr = Icurr.sub(Ibranch);
    }
  }

  /* Reverse-L: split ShuntBranch into C1 and Lpr1 */
  if (networkMode === 'reverse_l' && compCalc['ShuntBranch']) {
    const vRMS    = compCalc['ShuntBranch'].vrms;
    const iBranch = compCalc['ShuntBranch'].irms;  /* total branch current */
    /* Both C1 and Lpr1 carry the same series current */
    compCalc['C1']   = { vrms: vRMS, irms: iBranch, pLoss: 0 };
    compCalc['Lpr1'] = { vrms: vRMS, irms: iBranch, pLoss: iBranch*iBranch*(comps.Lpr1.rSeries||0) };
    delete compCalc['ShuntBranch'];
  }

  return { Zin, Zout, Gamma, vswr, pRef, compCalc, trajectory };
}

/* ── Tuning contour ──────────────────────────────────── */
function getTuningContour(freqHz, zSrc, comps) {
  const { tuneKey, loadKey } = getTuneLoadKeys(comps);
  if (!tuneKey || !loadKey) return [];
  const tC = comps[tuneKey], lC = comps[loadKey];
  if (!tC.minVal || !lC.minVal) return [];
  const N = 80;
  const cloneAndSolve = (tv, lv) => {
    const c = JSON.parse(JSON.stringify(comps));
    c[tuneKey].value = tv; c[loadKey].value = lv;
    return solveNetwork(freqHz, 1, zSrc, new Complex(50,0), c).Zout;
  };
  const pts = [];
  for (let i=0;i<=N;i++) pts.push(cloneAndSolve(tC.minVal+(tC.maxVal-tC.minVal)*(i/N), lC.minVal));
  for (let i=1;i<=N;i++) pts.push(cloneAndSolve(tC.maxVal, lC.minVal+(lC.maxVal-lC.minVal)*(i/N)));
  for (let i=1;i<=N;i++) pts.push(cloneAndSolve(tC.maxVal-(tC.maxVal-tC.minVal)*(i/N), lC.maxVal));
  for (let i=1;i<N; i++) pts.push(cloneAndSolve(tC.minVal, lC.maxVal-(lC.maxVal-lC.minVal)*(i/N)));
  return pts;
}

/* ── Auto-Match: Nelder-Mead ─────────────────────────── */
function autoMatch(freqHz, zSrc, zLoad, comps) {
  const { tuneKey, loadKey } = getTuneLoadKeys(comps);
  if (!tuneKey || !loadKey) return;
  const tC = comps[tuneKey], lC = comps[loadKey];
  const gammaAt = (tv, lv) => {
    const c = JSON.parse(JSON.stringify(comps));
    c[tuneKey].value=tv; c[loadKey].value=lv;
    return solveNetwork(freqHz,1,zSrc,zLoad,c).Gamma.mag();
  };
  const clamp = p => [Math.max(tC.minVal,Math.min(tC.maxVal,p[0])), Math.max(lC.minVal,Math.min(lC.maxVal,p[1]))];
  const GC=25; let bestT=tC.value,bestL=lC.value,minG=Infinity;
  for (let i=0;i<=GC;i++) for (let j=0;j<=GC;j++) {
    const tv=tC.minVal+(tC.maxVal-tC.minVal)*(i/GC), lv=lC.minVal+(lC.maxVal-lC.minVal)*(j/GC);
    const g=gammaAt(tv,lv); if(g<minG){minG=g;bestT=tv;bestL=lv;}
  }
  const step=(tC.maxVal-tC.minVal)*0.1;
  let simplex=[[bestT,bestL],[bestT+step,bestL],[bestT,bestL+step]];
  let vals=simplex.map(p=>gammaAt(p[0],p[1]));
  for (let iter=0;iter<200;iter++) {
    const ord=[0,1,2].sort((a,b)=>vals[a]-vals[b]);
    const best=simplex[ord[0]],sbest=simplex[ord[1]],worst=simplex[ord[2]];
    if(vals[ord[0]]<1e-5)break;
    const cen=[(best[0]+sbest[0])/2,(best[1]+sbest[1])/2];
    const ref=clamp([cen[0]+(cen[0]-worst[0]),cen[1]+(cen[1]-worst[1])]);
    const refV=gammaAt(...ref);
    if(refV<vals[ord[0]]){
      const exp=clamp([cen[0]+2*(ref[0]-cen[0]),cen[1]+2*(ref[1]-cen[1])]);
      const expV=gammaAt(...exp);
      simplex[ord[2]]=expV<refV?exp:ref; vals[ord[2]]=expV<refV?expV:refV;
    } else if(refV<vals[ord[1]]){
      simplex[ord[2]]=ref; vals[ord[2]]=refV;
    } else {
      const con=clamp([cen[0]+0.5*(worst[0]-cen[0]),cen[1]+0.5*(worst[1]-cen[1])]);
      const conV=gammaAt(...con);
      if(conV<vals[ord[2]]){simplex[ord[2]]=con;vals[ord[2]]=conV;}
      else { for(let k=1;k<3;k++){simplex[ord[k]]=clamp([best[0]+0.5*(simplex[ord[k]][0]-best[0]),best[1]+0.5*(simplex[ord[k]][1]-best[1])]);vals[ord[k]]=gammaAt(...simplex[ord[k]]);}}
    }
  }
  const bi=vals.indexOf(Math.min(...vals));
  comps[tuneKey].value=clamp(simplex[bi])[0];
  comps[loadKey].value=clamp(simplex[bi])[1];
}

/* ── Config Save/Load ────────────────────────────────── */
function saveConfig() {
  const data = { networkMode,
    freqMHz: document.getElementById('freqInput').value,
    powerW:  document.getElementById('fwdPowerInput').value,
    zsReal:  document.getElementById('zsReal').value, zsImag: document.getElementById('zsImag').value,
    zlReal:  document.getElementById('zlReal').value, zlImag: document.getElementById('zlImag').value,
    compSets: COMP_SETS };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'matcher_config.json'});
  a.click(); URL.revokeObjectURL(a.href);
}
function loadConfig(event) {
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if(d.networkMode) networkMode=d.networkMode;
      ['freqMHz','powerW','zsReal','zsImag','zlReal','zlImag'].forEach(k=>{
        const id={'freqMHz':'freqInput','powerW':'fwdPowerInput','zsReal':'zsReal','zsImag':'zsImag','zlReal':'zlReal','zlImag':'zlImag'}[k];
        if(d[k]&&document.getElementById(id)) document.getElementById(id).value=d[k];
      });
      if(d.compSets) for(const mode in d.compSets) if(COMP_SETS[mode]) for(const ref in d.compSets[mode]) if(COMP_SETS[mode][ref]) Object.assign(COMP_SETS[mode][ref],d.compSets[mode][ref]);
      document.querySelectorAll('.mode-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===networkMode));
      const keys=getTuneLoadKeys(getComps());
      window.AppState.selectedRef=keys.loadKey||Object.keys(getComps())[0];
      if(typeof updateSlidersFromValues==='function') updateSlidersFromValues();
      if(typeof runSimulation==='function') runSimulation();
    } catch(err){alert('Invalid config: '+err.message);}
  };
  reader.readAsText(file); event.target.value='';
}