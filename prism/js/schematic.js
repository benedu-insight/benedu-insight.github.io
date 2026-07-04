/* ═══════════════════════════════════════════════════════════
   schematic.js — RF Matcher Engine v3.6
   • Dynamic viewBox per topology
   • Generous component spacing — no label overlap
   • Shunt SG=18px gap below rail
   • SVG centered in container via CSS (align/justify: center)
   Benedu Insight © 2025
═══════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════
   SYMBOL LIBRARY
══════════════════════════════════════════════ */

/* Resistor (IEC rect): H span=28, V span=28 */
function symR(x,y,horiz=true,cls='sch-body'){
  if(horiz) return `
    <line x1="${x}" y1="${y}" x2="${x+5}" y2="${y}" class="${cls}"/>
    <rect x="${x+5}" y="${y-5}" width="18" height="10" rx="2" class="${cls} sch-fill"/>
    <line x1="${x+23}" y1="${y}" x2="${x+28}" y2="${y}" class="${cls}"/>`;
  return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y+5}" class="${cls}"/>
    <rect x="${x-5}" y="${y+5}" width="10" height="18" rx="2" class="${cls} sch-fill"/>
    <line x1="${x}" y1="${y+23}" x2="${x}" y2="${y+28}" class="${cls}"/>`;
}

/* Capacitor (IEC 2-plate): H span=16, V span=16 */
function symC(x,y,horiz=true,cls='sch-body'){
  if(horiz){const mx=x+8; return `
    <line x1="${x}" y1="${y}" x2="${mx-2}" y2="${y}" class="${cls}"/>
    <line x1="${mx-2}" y1="${y-7}" x2="${mx-2}" y2="${y+7}" class="${cls}"/>
    <line x1="${mx+2}" y1="${y-7}" x2="${mx+2}" y2="${y+7}" class="${cls}"/>
    <line x1="${mx+2}" y1="${y}" x2="${x+16}" y2="${y}" class="${cls}"/>`;}
  const my=y+8; return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${my-2}" class="${cls}"/>
    <line x1="${x-7}" y1="${my-2}" x2="${x+7}" y2="${my-2}" class="${cls}"/>
    <line x1="${x-7}" y1="${my+2}" x2="${x+7}" y2="${my+2}" class="${cls}"/>
    <line x1="${x}" y1="${my+2}" x2="${x}" y2="${y+16}" class="${cls}"/>`;
}

/* Variable capacitor (ANSI diagonal arrow) */
function symVC(x,y,horiz=true,cls='sch-body'){
  const base=symC(x,y,horiz,cls);
  if(horiz){const cx=x+8,cy=y; return base+`
    <line x1="${cx-7}" y1="${cy+8}" x2="${cx+7}" y2="${cy-8}" class="sch-var-arrow"/>
    <polygon points="${cx+7},${cy-8} ${cx+2},${cy-5} ${cx+4},${cy-2}" class="sch-var-head"/>`;}
  const cx=x,cy=y+8; return base+`
    <line x1="${cx-8}" y1="${cy+7}" x2="${cx+8}" y2="${cy-7}" class="sch-var-arrow"/>
    <polygon points="${cx+8},${cy-7} ${cx+3},${cy-4} ${cx+5},${cy-1}" class="sch-var-head"/>`;
}

/* Inductor (3 arcs): H span=32, V span=32 */
function symL(x,y,horiz=true,cls='sch-body'){
  const r=5;
  if(horiz) return `
    <line x1="${x}" y1="${y}" x2="${x+2}" y2="${y}" class="${cls}"/>
    <path d="M${x+2} ${y} a${r} ${r} 0 0 1 ${r*2} 0" class="${cls}"/>
    <path d="M${x+2+r*2} ${y} a${r} ${r} 0 0 1 ${r*2} 0" class="${cls}"/>
    <path d="M${x+2+r*4} ${y} a${r} ${r} 0 0 1 ${r*2} 0" class="${cls}"/>
    <line x1="${x+2+r*6}" y1="${y}" x2="${x+32}" y2="${y}" class="${cls}"/>`;
  return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y+2}" class="${cls}"/>
    <path d="M${x} ${y+2} a${r} ${r} 0 0 0 0 ${r*2}" class="${cls}"/>
    <path d="M${x} ${y+2+r*2} a${r} ${r} 0 0 0 0 ${r*2}" class="${cls}"/>
    <path d="M${x} ${y+2+r*4} a${r} ${r} 0 0 0 0 ${r*2}" class="${cls}"/>
    <line x1="${x}" y1="${y+2+r*6}" x2="${x}" y2="${y+32}" class="${cls}"/>`;
}

/* AC Source: top=(cx,cy-18) bot=(cx,cy+18)
   Zs label positioned to the LEFT of the circle */
function symAC(cx,cy){return `
  <line x1="${cx}" y1="${cy-18}" x2="${cx}" y2="${cy-12}" class="sch-body"/>
  <circle cx="${cx}" cy="${cy}" r="12" class="sch-ac-circle"/>
  <path d="M${cx-5} ${cy} Q${cx-2.5} ${cy-5},${cx} ${cy} T${cx+5} ${cy}" class="sch-ac-sine"/>
  <line x1="${cx}" y1="${cy+12}" x2="${cx}" y2="${cy+18}" class="sch-body"/>
  <text x="${cx-16}" y="${cy-2}" text-anchor="end" class="sch-node-ref">Zs</text>`;}
function symGND(x,y){return `
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y+6}" class="sch-gnd"/>
  <line x1="${x-8}" y1="${y+6}" x2="${x+8}" y2="${y+6}" class="sch-gnd"/>
  <line x1="${x-5}" y1="${y+10}" x2="${x+5}" y2="${y+10}" class="sch-gnd"/>
  <line x1="${x-2}" y1="${y+14}" x2="${x+2}" y2="${y+14}" class="sch-gnd"/>`;}

/* Junction dot */
function symJunc(x,y){return `<circle cx="${x}" cy="${y}" r="2.8" class="sch-junction"/>`;}

/* Z_L as parallel R||L||C, w=86, h=66 */
function symZL(bx,by,rStr,xStr){
  const w=86,h=66,cx=bx+w/2;
  const b1=by+12,b2=by+h-12;
  let s=`<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="5" class="sch-load-box" style="stroke-width:0.7;stroke-dasharray:3,3;"/>`;
  s+=`<line x1="${bx+8}" y1="${b1}" x2="${bx+w-8}" y2="${b1}" class="sch-load-inner"/>`;
  s+=`<line x1="${bx+8}" y1="${b2}" x2="${bx+w-8}" y2="${b2}" class="sch-load-inner"/>`;
  s+=`<line x1="${cx}" y1="${by}" x2="${cx}" y2="${b1}" class="sch-load-inner"/>`;
  s+=`<line x1="${cx}" y1="${b2}" x2="${cx}" y2="${by+h}" class="sch-load-inner"/>`;
  /* R branch */
  const rx=bx+14;
  s+=`<line x1="${rx}" y1="${b1}" x2="${rx}" y2="${b1+2}" class="sch-load-inner"/>`;
  s+=symR(rx,b1+2,false,'sch-load-inner');
  s+=`<line x1="${rx}" y1="${b1+30}" x2="${rx}" y2="${b2}" class="sch-load-inner"/>`;
  /* L branch */
  const lx=bx+43;
  s+=`<line x1="${lx}" y1="${b1}" x2="${lx}" y2="${b1+2}" class="sch-load-inner"/>`;
  s+=symL(lx,b1+2,false,'sch-load-inner');
  s+=`<line x1="${lx}" y1="${b1+34}" x2="${lx}" y2="${b2}" class="sch-load-inner"/>`;
  /* C branch */
  const ccx=bx+72;
  s+=`<line x1="${ccx}" y1="${b1}" x2="${ccx}" y2="${b1+4}" class="sch-load-inner"/>`;
  s+=symC(ccx,b1+4,false,'sch-load-inner');
  s+=`<line x1="${ccx}" y1="${b1+20}" x2="${ccx}" y2="${b2}" class="sch-load-inner"/>`;
  /* Labels */
  s+=`<text x="${cx}" y="${by-6}" text-anchor="middle" class="sch-load-label">Z_L</text>`;
  s+=`<text x="${bx+4}" y="${by+h+12}" text-anchor="start" class="sch-load-val">${rStr}</text>`;
  s+=`<text x="${bx+4}" y="${by+h+22}" text-anchor="start" class="sch-load-val">${xStr}</text>`;
  return s;
}

/* Component group wrapper */
function compG(ref,symbolSvg,lblX,lblY,valX,valY,anchor='middle'){
  const comps=getComps(),comp=comps[ref]||{};
  const isSel=ref===(window.AppState&&window.AppState.selectedRef);
  const isPara=!!comp.parasitic;
  const dispRef=comp.label||ref;
  const cls=['sch-comp',isSel?'selected':'',isPara?'parasitic':''].filter(Boolean).join(' ');
  return `
<g class="${cls}" onclick="selectComponent('${ref}')">
  ${symbolSvg}
  <text x="${lblX}" y="${lblY}" text-anchor="${anchor}" class="sch-ref">${dispRef}</text>
  <text x="${valX}" y="${valY}" text-anchor="${anchor}" class="sch-val" id="schVal_${ref}"></text>
</g>`;
}

function updateSchValLabels(comps){
  for(const ref in comps){
    const el=document.getElementById('schVal_'+ref);
    if(!el) continue;
    const c=comps[ref];
    el.textContent=c.type.startsWith('C')?fmtCompVal(c.value,'C'):fmtCompVal(c.value,'L');
  }
}

function zlStrs(){
  const r=parseFloat(document.getElementById('zlReal').value)||0;
  const x=parseFloat(document.getElementById('zlImag').value)||0;
  return [r.toFixed(1)+' Ω',(x>=0?'+':'')+x.toFixed(1)+' jΩ'];
}

/* ══════════════════════════════════════════════════════════
   LAYOUT CONSTANTS
   RY  = 80   : horizontal rail Y (series wire)
   GY  = 220  : GND rail Y
   SY  = 148  : AC source center Y
   SG  = 18   : gap below rail before shunt symbol starts
   GAP = 20   : wire gap between series components

   Series component widths:
     symL span = 32
     symVC/C span = 16
     symR span = 28

   Each draw fn returns { svg:string, W:number, H:number }
   viewBox is set dynamically in drawSchematic()
══════════════════════════════════════════════════════════ */
const _RY=80, _GY=220, _SY=148, _SG=18, _GAP=20;
const _MR=16; /* right margin after Z_L */

/* ════════════════════════════════════════════════════════
   REVERSE-L
   X layout (all series, left→right):
     SX=44   : AC source
     AX=90   : Node A (junction → shunt C1/Lpr1)
     L2X=AX+GAP=110    span=32 → right=142
     W_C2=BX+GAP       span=16
     CX = after C2     → Cpr shunt
     LOUTX = CX+GAP    span=32
     DX = after Lpr_out → wire → Z_L
   Shunt branches hang down from their node.
════════════════════════════════════════════════════════ */
function drawRevL(comps){
  const RY=_RY, GY=_GY, SG=_SG, GAP=_GAP;
  const RAIL='#C8D0DA';
  let s='';

  /* AC Source */
  const SX=44, SY=_SY;
  s+=`<g class="sch-comp">${symAC(SX,SY)}</g>`;
  s+=`<line x1="${SX}" y1="${SY-18}" x2="${SX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=`<line x1="${SX}" y1="${SY+18}" x2="${SX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(SX,GY);

  /* Node A */
  const AX=94;
  s+=`<line x1="${SX}" y1="${RY}" x2="${AX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=symJunc(AX,RY);

  /* Shunt: C1 series Lpr1, hanging from Node A */
  s+=`<line x1="${AX}" y1="${RY}" x2="${AX}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('C1', symVC(AX,RY+SG,false),
    AX-24, RY+SG+10,  /* ref label left of symbol */
    AX-24, RY+SG+20);
  s+=`<line x1="${AX}" y1="${RY+SG+16}" x2="${AX}" y2="${RY+SG+24}" class="sch-wire"/>`;
  s+=compG('Lpr1', symL(AX,RY+SG+24,false),
    AX+16, RY+SG+38,
    AX+16, RY+SG+48, 'start');
  s+=`<line x1="${AX}" y1="${RY+SG+56}" x2="${AX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(AX,GY);

  /* L2 — series */
  const L2X = AX + GAP;
  s+=`<line x1="${AX}" y1="${RY}" x2="${L2X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('L2', symL(L2X,RY,true),
    L2X+16, RY-18,
    L2X+16, RY-9);
  const BX = L2X+32;
  s+=symJunc(BX,RY);

  /* C2 (Tune) — series */
  const C2X = BX + GAP;
  s+=`<line x1="${BX}" y1="${RY}" x2="${C2X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('C2', symVC(C2X,RY,true),
    C2X+8, RY-18,
    C2X+8, RY-9);
  const CX = C2X+16;
  /* Extra wire gap so Cpr label doesn't crowd C2 */
  const CPR_X = CX + GAP;
  s+=`<line x1="${CX}" y1="${RY}" x2="${CPR_X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=symJunc(CPR_X,RY);

  /* Cpr — shunt from CPR_X */
  s+=`<line x1="${CPR_X}" y1="${RY}" x2="${CPR_X}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('Cpr', symC(CPR_X,RY+SG,false),
    CPR_X+18, RY+SG+10,
    CPR_X+18, RY+SG+20, 'start');
  s+=`<line x1="${CPR_X}" y1="${RY+SG+16}" x2="${CPR_X}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(CPR_X,GY);

  /* Lpr_out — series */
  const LOUTX = CPR_X + GAP;
  s+=`<line x1="${CPR_X}" y1="${RY}" x2="${LOUTX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('Lpr_out', symL(LOUTX,RY,true),
    LOUTX+16, RY-18,
    LOUTX+16, RY-9);
  const DX = LOUTX+32;
  s+=symJunc(DX,RY);

  /* Z_L block */
  const ZLW=12;
  s+=`<line x1="${DX}" y1="${RY}" x2="${DX+ZLW}" y2="${RY}" class="sch-wire-hi"/>`;
  const ZLX=DX+ZLW;
  const [rStr,xStr]=zlStrs();
  s+=symZL(ZLX, RY-8, rStr, xStr);
  const ZL_CX=ZLX+43, ZL_R=ZLX+86;
  s+=`<line x1="${ZL_CX}" y1="${RY+58}" x2="${ZL_CX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(ZL_CX,GY);

  /* Background rail & GND bus — exactly to circuit edge */
  s+=`<line x1="${SX}" y1="${RY}" x2="${ZL_R}" y2="${RY}" stroke="${RAIL}" stroke-width="0.5" stroke-dasharray="2,5" opacity=".35"/>`;
  s+=`<line x1="${SX}" y1="${GY}" x2="${ZL_CX}" y2="${GY}" stroke="${RAIL}" stroke-width="0.5" opacity=".35"/>`;

  const W=ZL_R+_MR, H=GY+22;
  return { svg:s, W, H };
}

/* ════════════════════════════════════════════════════════
   L-TYPE  (Standard)
   Zs → L2(series) → C2(Tune,series) → C1(Load,shunt)
       → Lpr_out(parasitic,series) → Z_L
════════════════════════════════════════════════════════ */
function drawLtype(comps){
  const RY=_RY,GY=_GY,SG=_SG,GAP=_GAP,RAIL='#C8D0DA';
  let s='';
  const SX=44,SY=_SY;
  s+=`<g class="sch-comp">${symAC(SX,SY)}</g>`;
  s+=`<line x1="${SX}" y1="${SY-18}" x2="${SX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=`<line x1="${SX}" y1="${SY+18}" x2="${SX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(SX,GY);

  /* L2 series */
  const L2X=84;
  s+=`<line x1="${SX}" y1="${RY}" x2="${L2X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('L2', symL(L2X,RY,true), L2X+16,RY-18, L2X+16,RY-9);
  const AX=L2X+32; s+=symJunc(AX,RY);

  /* C2 Tune series — gap wire before */
  const C2X=AX+GAP;
  s+=`<line x1="${AX}" y1="${RY}" x2="${C2X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('C2', symVC(C2X,RY,true), C2X+8,RY-18, C2X+8,RY-9);
  const BX=C2X+16;

  /* Extra gap wire between C2 and C1 junction */
  const C1_NODE=BX+GAP*2;
  s+=`<line x1="${BX}" y1="${RY}" x2="${C1_NODE}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=symJunc(C1_NODE,RY);

  /* C1 Load shunt — labels to right, value has room */
  s+=`<line x1="${C1_NODE}" y1="${RY}" x2="${C1_NODE}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('C1', symVC(C1_NODE,RY+SG,false),
    C1_NODE+18, RY+SG+10,
    C1_NODE+18, RY+SG+21, 'start');
  s+=`<line x1="${C1_NODE}" y1="${RY+SG+16}" x2="${C1_NODE}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(C1_NODE,GY);

  /* Lpr_out — parasitic series inductor between C1 node and Z_L */
  const LOUTX=C1_NODE+GAP*2;
  s+=`<line x1="${C1_NODE}" y1="${RY}" x2="${LOUTX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('Lpr_out', symL(LOUTX,RY,true),
    LOUTX+16, RY-18,
    LOUTX+16, RY-9);
  const DX=LOUTX+32;
  s+=symJunc(DX,RY);

  /* Z_L */
  const ZLX=DX+GAP;
  s+=`<line x1="${DX}" y1="${RY}" x2="${ZLX}" y2="${RY}" class="sch-wire-hi"/>`;
  const [rStr,xStr]=zlStrs();
  s+=symZL(ZLX,RY-8,rStr,xStr);
  const ZL_CX=ZLX+43,ZL_R=ZLX+86;
  s+=`<line x1="${ZL_CX}" y1="${RY+58}" x2="${ZL_CX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(ZL_CX,GY);
  s+=`<line x1="${SX}" y1="${RY}" x2="${ZL_R}" y2="${RY}" stroke="${RAIL}" stroke-width="0.5" stroke-dasharray="2,5" opacity=".35"/>`;
  s+=`<line x1="${SX}" y1="${GY}" x2="${ZL_CX}" y2="${GY}" stroke="${RAIL}" stroke-width="0.5" opacity=".35"/>`;
  return { svg:s, W:ZL_R+_MR, H:GY+22 };
}

/* ════════════════════════════════════════════════════════
   PI-TYPE  (Standard @ 13.56 MHz)
   Zs → Lpar1(20nH,기생,series) → C1(Tune,shunt)
      → L1(500nH,series) → C2(Load,shunt)
      → Lpar2(20nH,기생,series) → Z_L
════════════════════════════════════════════════════════ */
function drawPitype(comps){
  const RY=_RY,GY=_GY,SG=_SG,GAP=_GAP,RAIL='#C8D0DA';
  let s='';
  const SX=44,SY=_SY;
  s+=`<g class="sch-comp">${symAC(SX,SY)}</g>`;
  s+=`<line x1="${SX}" y1="${SY-18}" x2="${SX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=`<line x1="${SX}" y1="${SY+18}" x2="${SX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(SX,GY);

  /* Lpar1 — parasitic series (소스 → C1 사이) */
  const LP1X=72;
  s+=`<line x1="${SX}" y1="${RY}" x2="${LP1X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('Lpar1', symL(LP1X,RY,true), LP1X+16,RY-18, LP1X+16,RY-9);
  /* extra gap after Lpar1 so it doesn't crowd C1 */
  const AX=LP1X+32+GAP; s+=symJunc(AX,RY);
  s+=`<line x1="${LP1X+32}" y1="${RY}" x2="${AX}" y2="${RY}" class="sch-wire-hi"/>`;

  /* C1 Tune shunt */
  s+=`<line x1="${AX}" y1="${RY}" x2="${AX}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('C1', symVC(AX,RY+SG,false), AX+18,RY+SG+10, AX+18,RY+SG+20,'start');
  s+=`<line x1="${AX}" y1="${RY+SG+16}" x2="${AX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(AX,GY);

  /* L1 series (고정) */
  const L1X=AX+GAP;
  s+=`<line x1="${AX}" y1="${RY}" x2="${L1X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('L1', symL(L1X,RY,true), L1X+16,RY-18, L1X+16,RY-9);
  /* extra gap after L1 so C2 label has room */
  const BX=L1X+32+GAP; s+=symJunc(BX,RY);
  s+=`<line x1="${L1X+32}" y1="${RY}" x2="${BX}" y2="${RY}" class="sch-wire-hi"/>`;

  /* C2 Load shunt */
  s+=`<line x1="${BX}" y1="${RY}" x2="${BX}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('C2', symVC(BX,RY+SG,false), BX+18,RY+SG+10, BX+18,RY+SG+20,'start');
  s+=`<line x1="${BX}" y1="${RY+SG+16}" x2="${BX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(BX,GY);

  /* Lpar2 — parasitic series (C2 → Z_L 사이) */
  const LP2X=BX+GAP;
  s+=`<line x1="${BX}" y1="${RY}" x2="${LP2X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('Lpar2', symL(LP2X,RY,true), LP2X+16,RY-18, LP2X+16,RY-9);
  const DX=LP2X+32; s+=symJunc(DX,RY);

  /* Z_L */
  const ZLX=DX+GAP;
  s+=`<line x1="${DX}" y1="${RY}" x2="${ZLX}" y2="${RY}" class="sch-wire-hi"/>`;
  const [rStr,xStr]=zlStrs();
  s+=symZL(ZLX,RY-8,rStr,xStr);
  const ZL_CX=ZLX+43,ZL_R=ZLX+86;
  s+=`<line x1="${ZL_CX}" y1="${RY+58}" x2="${ZL_CX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(ZL_CX,GY);
  s+=`<line x1="${SX}" y1="${RY}" x2="${ZL_R}" y2="${RY}" stroke="${RAIL}" stroke-width="0.5" stroke-dasharray="2,5" opacity=".35"/>`;
  s+=`<line x1="${SX}" y1="${GY}" x2="${ZL_CX}" y2="${GY}" stroke="${RAIL}" stroke-width="0.5" opacity=".35"/>`;
  return { svg:s, W:ZL_R+_MR, H:GY+22 };
}

/* ════════════════════════════════════════════════════════
   T-TYPE  (Standard 7-element per datasheet)
   Zs → C1(parasitic,shunt) → L1(par,series) → C2(Load,series)
       → L2(shunt) → C3(Tune,series) → L3(par,series) → C4(par,shunt) → Z_L
════════════════════════════════════════════════════════ */
function drawTtype(comps){
  const RY=_RY,GY=_GY,SG=_SG,GAP=_GAP,RAIL='#C8D0DA';
  let s='';
  const SX=44,SY=_SY;
  s+=`<g class="sch-comp">${symAC(SX,SY)}</g>`;
  s+=`<line x1="${SX}" y1="${SY-18}" x2="${SX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=`<line x1="${SX}" y1="${SY+18}" x2="${SX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(SX,GY);

  /* Node A: C1 parasitic shunt (fixed cap, not variable) */
  const AX=84;
  s+=`<line x1="${SX}" y1="${RY}" x2="${AX}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=symJunc(AX,RY);
  s+=`<line x1="${AX}" y1="${RY}" x2="${AX}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('C1', symC(AX,RY+SG,false), AX+18,RY+SG+10, AX+18,RY+SG+20,'start');
  s+=`<line x1="${AX}" y1="${RY+SG+16}" x2="${AX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(AX,GY);

  /* L1 parasitic series */
  const L1X=AX+GAP;
  s+=`<line x1="${AX}" y1="${RY}" x2="${L1X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('L1', symL(L1X,RY,true), L1X+16,RY-18, L1X+16,RY-9);
  const BX=L1X+32; s+=symJunc(BX,RY);

  /* C2 Load series */
  const C2X=BX+GAP;
  s+=`<line x1="${BX}" y1="${RY}" x2="${C2X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('C2', symVC(C2X,RY,true), C2X+8,RY-18, C2X+8,RY-9);
  /* extra gap so L2 shunt label doesn't crowd C2 */
  const CX=C2X+16+GAP; s+=symJunc(CX,RY);
  s+=`<line x1="${C2X+16}" y1="${RY}" x2="${CX}" y2="${RY}" class="sch-wire-hi"/>`;

  /* Node CX: L2 shunt */
  s+=`<line x1="${CX}" y1="${RY}" x2="${CX}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('L2', symL(CX,RY+SG,false), CX+18,RY+SG+14, CX+18,RY+SG+24,'start');
  s+=`<line x1="${CX}" y1="${RY+SG+32}" x2="${CX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(CX,GY);

  /* C3 Tune series */
  const C3X=CX+GAP;
  s+=`<line x1="${CX}" y1="${RY}" x2="${C3X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('C3', symVC(C3X,RY,true), C3X+8,RY-18, C3X+8,RY-9);
  const DX=C3X+16; s+=symJunc(DX,RY);

  /* L3 parasitic series */
  const L3X=DX+GAP;
  s+=`<line x1="${DX}" y1="${RY}" x2="${L3X}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=compG('L3', symL(L3X,RY,true), L3X+16,RY-18, L3X+16,RY-9);
  const EX=L3X+32; s+=symJunc(EX,RY);

  /* C4 parasitic shunt — extra gap wire before Z_L so label has room */
  const C4_NODE=EX+GAP;
  s+=`<line x1="${EX}" y1="${RY}" x2="${C4_NODE}" y2="${RY}" class="sch-wire-hi"/>`;
  s+=symJunc(C4_NODE,RY);
  s+=`<line x1="${C4_NODE}" y1="${RY}" x2="${C4_NODE}" y2="${RY+SG}" class="sch-wire"/>`;
  s+=compG('C4', symC(C4_NODE,RY+SG,false), C4_NODE+18,RY+SG+10, C4_NODE+18,RY+SG+20,'start');
  s+=`<line x1="${C4_NODE}" y1="${RY+SG+16}" x2="${C4_NODE}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(C4_NODE,GY);

  /* Z_L — extra gap so C4 right-label clears the box */
  const ZLX=C4_NODE+GAP*2;
  s+=`<line x1="${C4_NODE}" y1="${RY}" x2="${ZLX}" y2="${RY}" class="sch-wire-hi"/>`;
  const [rStr,xStr]=zlStrs();
  s+=symZL(ZLX,RY-8,rStr,xStr);
  const ZL_CX=ZLX+43,ZL_R=ZLX+86;
  s+=`<line x1="${ZL_CX}" y1="${RY+58}" x2="${ZL_CX}" y2="${GY}" class="sch-wire"/>`;
  s+=symGND(ZL_CX,GY);
  s+=`<line x1="${SX}" y1="${RY}" x2="${ZL_R}" y2="${RY}" stroke="${RAIL}" stroke-width="0.5" stroke-dasharray="2,5" opacity=".35"/>`;
  s+=`<line x1="${SX}" y1="${GY}" x2="${ZL_CX}" y2="${GY}" stroke="${RAIL}" stroke-width="0.5" opacity=".35"/>`;
  return { svg:s, W:ZL_R+_MR, H:GY+22 };
}

/* ── Main draw dispatcher ── */
function drawSchematic(){
  const svg=document.getElementById('schematicSvg');
  const comps=getComps();
  let result;
  switch(getMode()){
    case 'reverse_l': result=drawRevL(comps);   break;
    case 'ltype':     result=drawLtype(comps);  break;
    case 'pitype':    result=drawPitype(comps); break;
    case 'ttype':     result=drawTtype(comps);  break;
    default:          result=drawRevL(comps);
  }
  /* Dynamic viewBox = exact circuit bounding box */
  svg.setAttribute('viewBox', `0 0 ${result.W} ${result.H}`);
  svg.innerHTML=result.svg;
  updateSchValLabels(comps);
}