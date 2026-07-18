
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

const IND = '#FF4B26', BLU = '#FF9269', TEAL = '#1A191D', VIO = '#FFC5AC', SKY = '#8A8790', GRN = '#34D399';
const kfmt = (n) => { n = Number(n) || 0; if (n >= 1e6) return '฿' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K'; return '฿' + Math.round(n); };
const ATYPES = ['โทรติดตาม', 'นัดหมาย', 'เข้าพบ/นำเสนอ', 'ส่งสัญญา', 'ติดตามชำระเงิน', 'อื่นๆ'];

function sparkEmpty(H) { return <svg viewBox={`0 0 220 ${H}`} style={{ width: '100%', height: H }}><line x1="4" y1={H - 8} x2="216" y2={H - 8} stroke="rgba(120,130,170,.22)" strokeWidth="2" strokeLinecap="round" /></svg>; }
function nums(data) { return (data || []).map(x => Number(x && x.value !== undefined ? x.value : x) || 0); }

function DotWave({ data }) { const v=nums(data); if (v.length < 2 || v.every(x=>!x)) return sparkEmpty(58); const W=220,H=58,mx=Math.max(1,...v),mn=Math.min(...v); const xs=i=>4+i/(v.length-1)*(W-8), ys=x=>H-8-((x-mn)/((mx-mn)||1))*(H-16); const pts=v.map((x,i)=>[xs(i),ys(x)]); const ln=smoothPath(pts); const ar=`${ln} L ${xs(v.length-1).toFixed(1)} ${H} L ${xs(0).toFixed(1)} ${H} Z`; return <svg viewBox="0 0 220 58" style={{ width: '100%', height: 58 }}><defs><linearGradient id="swg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={IND} stopOpacity="0.35" /><stop offset="1" stopColor={IND} stopOpacity="0.03" /></linearGradient></defs><path d={ar} fill="url(#swg)" /><path d={ln} fill="none" stroke={IND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx={xs(v.length-1)} cy={ys(v[v.length-1])} r="3.2" fill="#fff" stroke={IND} strokeWidth="2" /></svg>; }
function DotGrid({ data }) { const v=nums(data); if (!v.length || v.every(x=>!x)) return sparkEmpty(58); const W=220,H=58,mx=Math.max(1,...v),bw=Math.max(6,(W-8)/v.length-4),gap=v.length>1?(W-8-bw*v.length)/(v.length-1):0; return <svg viewBox="0 0 220 58" style={{ width: '100%', height: 58 }}><defs><linearGradient id="dgb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BLU} /><stop offset="1" stopColor={BLU} stopOpacity="0.4" /></linearGradient></defs>{v.map((x,i)=>{const h=(x/mx)*(H-8);return <rect key={i} x={(4+i*(bw+gap)).toFixed(1)} y={(H-h).toFixed(1)} width={bw} height={h.toFixed(1)} rx="4" fill="url(#dgb)" />;})}</svg>; }
function AreaMini({ data }) { const v = nums(data); if (v.length < 2 || v.every(x=>!x)) return sparkEmpty(56); const W = 220, H = 56, mx = Math.max(1, ...v); const xs = i => (v.length === 1 ? W / 2 : i / (v.length - 1) * W), ys = x => H - 4 - (x / mx) * (H - 10); const ln = v.map((x, i) => `${i ? 'L' : 'M'} ${xs(i).toFixed(1)} ${ys(x).toFixed(1)}`).join(' '); const ar = `M 0 ${H} ` + v.map((x, i) => `L ${xs(i).toFixed(1)} ${ys(x).toFixed(1)}`).join(' ') + ` L ${W} ${H} Z`; return <svg viewBox="0 0 220 56" style={{ width: '100%', height: 56 }}><defs><linearGradient id="amg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={TEAL} stopOpacity="0.5" /><stop offset="1" stopColor={TEAL} stopOpacity="0.05" /></linearGradient></defs><path d={ar} fill="url(#amg)" /><path d={ln} fill="none" stroke={TEAL} strokeWidth="2" /></svg>; }
function DotLine({ data }) { const v=nums(data); if (v.length < 2 || v.every(x=>!x)) return sparkEmpty(58); const W=220,H=58,mx=Math.max(1,...v),mn=Math.min(...v); const xs=i=>4+i/(v.length-1)*(W-8), ys=x=>H-8-((x-mn)/((mx-mn)||1))*(H-16); const pts=v.map((x,i)=>[xs(i),ys(x)]); const ln=smoothPath(pts); return <svg viewBox="0 0 220 58" style={{ width: '100%', height: 58 }}><path d={ln} fill="none" stroke={VIO} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{pts.map((p,i)=><circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="2.3" fill={VIO} />)}</svg>; }
function BarsMini({ data }) { const v = nums(data); if (!v.length || v.every(x=>!x)) return sparkEmpty(56); const H = 56, mx = Math.max(1,...v), bw = Math.max(6,(220-8)/v.length-6); return <svg viewBox="0 0 220 56" style={{ width: '100%', height: 56 }}><defs><linearGradient id="bmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={TEAL} /><stop offset="1" stopColor={GRN} stopOpacity="0.6" /></linearGradient></defs>{v.map((x, i) => { const h = (x / mx) * (H - 8); return <rect key={i} x={4 + i * (bw + 6)} y={H - h} width={bw} height={h} rx="4" fill="url(#bmg)" />; })}</svg>; }
function Gauge({ value }) { const cx = 100, cy = 100, r = 78; const a = deg => (180 - deg * 1.8) * Math.PI / 180; const pt = (deg, rr) => [cx + rr * Math.cos(a(deg)), cy - rr * Math.sin(a(deg))]; const arc = (d0, d1, rr) => { const [x0, y0] = pt(d0, rr), [x1, y1] = pt(d1, rr); return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rr} ${rr} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; }; const val = Math.max(0, Math.min(100, value)); const [nx, ny] = pt(val, r - 12); return <svg viewBox="0 0 200 116" style={{ width: '100%', height: 90 }}><path d={arc(0, 100, r)} fill="none" stroke="rgba(99,102,241,.14)" strokeWidth="12" strokeLinecap="round" /><path d={arc(0, val, r)} fill="none" stroke={IND} strokeWidth="12" strokeLinecap="round" /><line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" /><circle cx={cx} cy={cy} r="5" fill="#1E293B" /></svg>; }

function Donut({ segments }) { const tot = segments.reduce((a, s) => a + s.v, 0) || 1; const cx = 78, cy = 78, rO = 64, rI = 42; let ang = -90; const arcs = []; segments.forEach((s, i) => { const frac = s.v / tot, a0 = ang * Math.PI / 180, a1 = (ang + frac * 360) * Math.PI / 180; ang += frac * 360; const lg = frac > 0.5 ? 1 : 0; const x0 = cx + rO * Math.cos(a0), y0 = cy + rO * Math.sin(a0), x1 = cx + rO * Math.cos(a1), y1 = cy + rO * Math.sin(a1), xi1 = cx + rI * Math.cos(a1), yi1 = cy + rI * Math.sin(a1), xi0 = cx + rI * Math.cos(a0), yi0 = cy + rI * Math.sin(a0); arcs.push(<path key={i} d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rO} ${rO} 0 ${lg} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${xi1.toFixed(1)} ${yi1.toFixed(1)} A ${rI} ${rI} 0 ${lg} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z`} fill={s.c} />); }); return <svg viewBox="0 0 156 156" style={{ width: 150, height: 150, flexShrink: 0 }}>{arcs}<text x="78" y="74" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1E293B">{kfmt(tot)}</text><text x="78" y="92" textAnchor="middle" fontSize="10" fill="#8891B0">รวม</text></svg>; }

function smoothPath(pts) { if (pts.length < 2) return ''; let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6; d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; } return d; }
function Funnel({ stages }) { if (!stages.length) return <div className="empty">—</div>; const s = stages.slice(0, 6); const W = 500, H = 190, cy = 116, pad = 10, maxc = Math.max(1, ...s.map(x => x.cnt)), maxH = 62; const xp = s.map((_, i) => pad + i * (W - pad * 2) / Math.max(1, s.length - 1)); const hh = s.map(x => Math.max(4, (x.cnt / maxc) * maxH)); const topPts = xp.map((x, i) => [x, cy - hh[i]]), botPts = xp.map((x, i) => [x, cy + hh[i]]).reverse(); const fpath = `${smoothPath(topPts)} L ${botPts[0][0].toFixed(1)} ${botPts[0][1].toFixed(1)} ${smoothPath(botPts).replace(/^M [^C]+/, '')} Z`; return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}><defs><linearGradient id="fgr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={IND} /><stop offset="0.5" stopColor={SKY} /><stop offset="1" stopColor={TEAL} /></linearGradient></defs><path d={fpath} fill="url(#fgr)" opacity="0.92" />{s.map((x, i) => (<g key={i}><line x1={xp[i]} y1="46" x2={xp[i]} y2={(cy + hh[i]).toFixed(1)} stroke="rgba(99,102,241,.28)" strokeDasharray="3 3" /><text x={xp[i]} y="22" textAnchor="middle" fontSize="9.5" fill="#8891B0">{x.name.length > 12 ? x.name.slice(0, 11) + '…' : x.name}</text><text x={xp[i]} y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1E293B">{x.cnt}</text></g>))}</svg>; }

function Hexagon({ metrics }) { const cx = 90, cy = 92, r = 66; const ang = i => (-90 + i * 60) * Math.PI / 180; const ring = f => metrics.map((_, i) => `${(cx + r * f * Math.cos(ang(i))).toFixed(1)},${(cy + r * f * Math.sin(ang(i))).toFixed(1)}`).join(' '); const poly = metrics.map((m, i) => { const f = Math.max(0.05, m.v / 100); return `${(cx + r * f * Math.cos(ang(i))).toFixed(1)},${(cy + r * f * Math.sin(ang(i))).toFixed(1)}`; }).join(' '); const avg = Math.round(metrics.reduce((a, m) => a + m.v, 0) / metrics.length); return <svg viewBox="0 0 180 184" style={{ width: '100%', height: 'auto', maxWidth: 220, display: 'block', margin: '0 auto' }}>{[0.4, 0.7, 1].map((f, i) => <polygon key={i} points={ring(f)} fill="none" stroke="rgba(99,102,241,.14)" />)}{metrics.map((_, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(ang(i))} y2={cy + r * Math.sin(ang(i))} stroke="rgba(99,102,241,.1)" />)}<polygon points={poly} fill="rgba(99,102,241,.28)" stroke={IND} strokeWidth="2" /><circle cx={cx} cy={cy} r="22" fill="rgba(255,255,255,.7)" /><text x={cx} y={cy - 1} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1E293B">{avg}</text><text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#8891B0">ภาพรวม</text>{metrics.map((m, i) => { const lx = cx + (r + 12) * Math.cos(ang(i)), ly = cy + (r + 12) * Math.sin(ang(i)); return <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" fontSize="8" fontWeight="600" fill="#4A5578">{m.v}</text>; })}</svg>; }

const BADGE = { i: 'ib-green', b: 'ib-blue', a: 'ib-amber', r: 'ib-red', p: 'ib-purple' };
const IC = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  coins: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  trophy: 'M6 9a6 6 0 0 0 12 0V3H6z M6 5H3v2a3 3 0 0 0 3 3 M18 5h3v2a3 3 0 0 1-3 3 M9 21h6 M12 15v6',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  gauge: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M13.4 12.6L19 7 M4 20a8 8 0 1 1 16 0z',
};
function Stat({ label, value, sub, subUp, badge, icon, chart, live }) {
  return (<div className="card"><div className="card-top"><span className="label">{label}{live && <span style={{ marginLeft: 6, fontSize: 10, color: '#FF4B26', fontWeight: 700 }}>● Live</span>}</span>
    <span className={'ico-badge ' + BADGE[badge]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={IC[icon]} /></svg></span></div>
    <div className="value">{value}</div><div className={'delta ' + (subUp ? 'up' : 'down')}>{subUp ? '↑' : '↓'} {sub}</div><div style={{ marginTop: 6 }}>{chart}</div></div>);
}

// ── reference-style chart components ──
const PAL2 = ['#FF4B26', '#1A191D', '#FF9269', '#8A8790', '#FFC5AC', '#E11D48'];
function RSpline({ vals }) {
  const a = (vals && vals.length ? vals : [1, 1]).map(Number);
  const W = 200, H = 64, mn = Math.min(...a), mx = Math.max(...a), rng = mx - mn || 1;
  const xs = i => (a.length === 1 ? W / 2 : i * W / (a.length - 1));
  const ys = v => 8 + (1 - (v - mn) / rng) * (H - 16);
  const pts = a.map((v, i) => [xs(i), ys(v)]);
  let dd = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { const p1 = pts[i], p2 = pts[i + 1], m = (p1[0] + p2[0]) / 2; dd += ` C ${m} ${p1[1]} ${m} ${p2[1]} ${p2[0]} ${p2[1]}`; }
  const last = pts[pts.length - 1];
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 52 }} preserveAspectRatio="none">
    <defs><linearGradient id="dspg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
    <path d={`${dd} L ${last[0]} ${H} L ${pts[0][0]} ${H} Z`} fill="url(#dspg)" />
    <path d={dd} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <path d={`M ${last[0]} ${last[1]} C ${last[0] + 16} ${last[1]} ${last[0] + 20} ${last[1] - 6} ${W} ${last[1] - 8}`} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="2 4" opacity=".5" />
    <circle cx={last[0]} cy={last[1]} r="3.6" fill="#fff" />
  </svg>;
}
function RMiniBars({ vals }) {
  const a = (vals && vals.length ? vals : [1]).map(Number).slice(-7);
  const mx = Math.max(1, ...a), peak = a.reduce((b, v, i) => v > a[b] ? i : b, 0);
  return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 52 }}>
    {a.map((v, i) => <div key={i} style={{ flex: '1 1 0', maxWidth: 18, height: Math.max(8, Math.round(v / mx * 100)) + '%', borderRadius: 4, background: i === peak ? '#FF4B26' : 'rgba(26,25,29,.18)' }} />)}
  </div>;
}
function RSegBar({ won, open }) {
  const tot = (won + open) || 1, wp = Math.round(won / tot * 100);
  return <div>
    <div style={{ height: 38, background: 'rgba(0,0,0,.18)', borderRadius: 10, display: 'flex', alignItems: 'center', padding: 6, gap: 4 }}>
      <div style={{ height: '100%', background: '#fff', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', width: wp + '%', minWidth: 34 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#1A191D' }}>{wp}%</span></div>
      <div style={{ height: '100%', background: '#1A191D', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{100 - wp}%</span></div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginTop: 8, color: 'rgba(255,255,255,.9)' }}><span>● ปิดได้ {won}</span><span>● เปิดอยู่ {open}</span></div>
  </div>;
}
function RStriped({ rows }) {
  const [hv, setHv] = useState(null);
  const data = (rows || []).slice(-12);
  const max = Math.max(1, ...data.map(r => +r.value));
  if (!data.length) return <div className="empty">—</div>;
  const peak = data.reduce((b, r, i) => +r.value > +data[b].value ? i : b, 0);
  const gap = data.length > 7 ? 8 : 16;
  return <div style={{ flex: 1, minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap, flex: 1, minHeight: 160, borderBottom: '2px solid #ECEAEF' }}>
      {data.map((r, i) => { const total = Math.max(9, Math.round(+r.value / max * 100)), hot = i === peak, on = hv === i;
        return <div key={i} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)} style={{ flex: '1 1 0', maxWidth: 44, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
          {on && <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', background: '#1A191D', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 9, whiteSpace: 'nowrap', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>{kfmt(+r.value)}</div>}
          <div style={{ width: '100%', height: total + '%', minHeight: 9, display: 'flex', flexDirection: 'column', transition: 'height .2s' }}>
            <div style={{ height: '32%', borderRadius: '6px 6px 0 0', backgroundColor: (hot || on) ? 'rgba(255,75,38,.12)' : '#F1EFF3', backgroundImage: (hot || on) ? 'repeating-linear-gradient(45deg,rgba(255,75,38,.5) 0 3px,transparent 3px 7px)' : 'repeating-linear-gradient(45deg,rgba(26,25,29,.26) 0 3px,transparent 3px 7px)' }} />
            <div style={{ height: '68%', minHeight: 5, borderRadius: '0 0 3px 3px', background: (hot || on) ? 'linear-gradient(180deg,#FF7A4D,#FF4B26)' : '#1A191D' }} />
          </div>
        </div>; })}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap, marginTop: 8 }}>
      {data.map((r, i) => <span key={i} style={{ flex: '1 1 0', maxWidth: 44, textAlign: 'center', fontSize: 10, color: '#8A8790', fontWeight: 600 }}>{(r.month || '').slice(2)}</span>)}
    </div>
  </div>;
}
function RDonut({ items }) {
  const [hv, setHv] = useState(null);
  const arcs = items.filter(x => x.v > 0).slice(0, 6);
  const legend = items.slice(0, 12);
  const tot = items.reduce((a, s) => a + s.v, 0) || 1;
  const R = 38, C = 2 * Math.PI * R; let off = 0;
  const segs = arcs.map((s, i) => { const len = s.v / tot * C, o = -off; off += len; return { ...s, dash: `${len} ${C - len}`, off: o }; });
  const cur = hv != null ? arcs[hv] : arcs[0];
  return <div>
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '6px 0 14px' }}>
      <svg width="160" height="160" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <defs><pattern id="dstp" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="4" stroke="#FF4B26" strokeWidth="1.4" /></pattern></defs>
        {segs.map((s, i) => <circle key={i} cx="50" cy="50" r={R} fill="transparent" stroke={i === 2 ? 'url(#dstp)' : PAL2[i % PAL2.length]} strokeWidth="11" strokeDasharray={s.dash} strokeDashoffset={s.off} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)} style={{ cursor: 'pointer', transition: 'opacity .2s', opacity: hv == null || hv === i ? 1 : .45 }} />)}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>สัดส่วน</span>
        <span style={{ fontSize: 20, fontWeight: 800 }}>{cur ? Math.round(cur.v / tot * 100) : 0}%</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.name : ''}</span>
      </div>
    </div>
    <div>{legend.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: i === 2 ? '#FF4B26' : PAL2[i % PAL2.length], flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
      <b>{kfmt(s.v)}</b></div>)}</div>
  </div>;
}

const A_STATUS = { done: ['green'], pending: ['orange'] };
export default function Dashboard() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [d, setD] = useState(null);
  const [rep, setRep] = useState(null);
  const [acts, setActs] = useState([]);
  const [custs, setCusts] = useState([]);
  const [from, setFrom] = useState(() => new Date().getFullYear() + '-01-01');
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rwin, setRwin] = useState(null);
  const [rmon, setRmon] = useState(null);
  const [rown, setRown] = useState(null);
  useEffect(() => {
    api('/meta/dashboard').then(setD).catch(() => {});
    api('/reports/summary').then(setRep).catch(() => {});
    api('/activities', { params: { limit: 80, sort: 'due' } }).then(r => setActs(r.rows)).catch(() => {});
    api('/customers', { params: { limit: 100 } }).then(r => setCusts(r.rows)).catch(() => {});
  }, []);
  function loadRate() {
    const params = { from, to };
    api('/rates/report/winrate', { params }).then(setRwin).catch(() => setRwin(null));
    api('/rates/report/monthly', { params }).then(r => setRmon(r.rows || [])).catch(() => setRmon(null));
    api('/rates/report/sales-volume', { params }).then(r => setRown(r.rows || [])).catch(() => setRown(null));
  }
  useEffect(() => { loadRate(); }, []); // eslint-disable-line
  const monthly = rep?.monthly || [];
  if (!d) return <div className="empty">{t('กำลังโหลด...')}</div>;

  const win = (rwin && rwin.total != null)
    ? { winRate: rwin.total > 0 ? Math.round(rwin.won / rwin.total * 100) : 0, won: rwin.won, open: Math.max(0, (rwin.total || 0) - (rwin.won || 0)), won_value: +rwin.won_value || 0, total: rwin.total || 0, total_value: +rwin.total_value || 0 }
    : { ...(rep?.win || { winRate: 0, won: 0, open: 0 }), won_value: 0, total: 0, total_value: 0 };
  const chartSeries = (rmon && rmon.length) ? rmon : monthly;
  const ownersRaw = ((rown && rown.length)
    ? rown.map(o => ({ name: o.name || o.fullname || t('ไม่ระบุเซลส์'), v: +o.revenue }))
    : (rep?.byOwner || []).map(o => ({ name: o.name, v: (+o.won_value + +o.open_value) }))).sort((a, b) => b.v - a.v);
  const dc = [IND, BLU, VIO, TEAL, SKY];
  const donutSeg = ownersRaw.slice(0, 4).map((o, i) => ({ ...o, c: dc[i] }));
  if (ownersRaw.length > 4) donutSeg.push({ name: 'อื่นๆ', v: ownersRaw.slice(4).reduce((a, o) => a + o.v, 0), c: dc[4] });
  const donutTot = ownersRaw.reduce((a, o) => a + o.v, 0);
  const fRaw = (d.funnel || []).map(f => ({ name: f.name, cnt: f.cnt })); let acc = 0; const fCum = [];
  for (let i = fRaw.length - 1; i >= 0; i--) { acc += fRaw[i].cnt; fCum[i] = { name: fRaw[i].name, cnt: acc }; }
  const funnel = fCum.filter(x => x.cnt > 0).slice(0, 6);
  const teams = (rep?.byTeam || []).map(x => ({ name: x.name, v: +x.value })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  const maxTeam = Math.max(1, ...teams.map(x => x.v));
  const abu = rep?.activityByUser || []; const doneSum = abu.reduce((a, x) => a + x.done, 0), pendSum = abu.reduce((a, x) => a + x.pending, 0), overSum = abu.reduce((a, x) => a + x.overdue, 0);
  const onTime = doneSum + overSum ? Math.round(doneSum / (doneSum + overSum) * 100) : 0;
  const regularPct = d.customers.total ? Math.round(((custs.filter(c => c.lifecycle_stage === 'regular').length) / d.customers.total) * 100) : 0;
  const avgPerBk = win.won ? win.won_value / win.won : 0;
  const monthsActive = (rmon || []).filter(m => +m.value > 0).length;
  const hexMetrics = [
    { k: 'อัตรายืนยัน', v: Math.min(100, win.winRate) },
    { k: 'มูลค่าเฉลี่ย', v: Math.min(100, Math.round(avgPerBk / 80)) },
    { k: 'ยอดรวม', v: Math.min(100, Math.round((win.total_value || 0) / 100000)) },
    { k: 'จำนวนบุ๊กกิ้ง', v: Math.min(100, Math.round((win.won || 0) / 15)) },
    { k: 'เซลส์มียอด', v: Math.min(100, ownersRaw.length * 10) },
    { k: 'เดือนมียอด', v: Math.round(monthsActive / 12 * 100) },
  ];
  const hexAvg = Math.round(hexMetrics.reduce((a, m) => a + m.v, 0) / hexMetrics.length);
  const typeCounts = ATYPES.map((n, i) => ({ n, c: acts.filter(a => a.activity_type === i).length })).filter(x => x.c > 0).sort((a, b) => b.c - a.c).slice(0, 4);
  const typeTot = typeCounts.reduce((a, x) => a + x.c, 0) || 1;
  const bubbleColors = [IND, TEAL, BLU, VIO];
  const recent = acts.slice(0, 5);
  const riskScore = c => { let s = 40; if (c.lifecycle_stage === 'regular') s += 40; else if (c.lifecycle_stage === 'new') s += 25; else if (c.lifecycle_stage === 'target') s += 15; s += (c.priority_id || 0) * 4; if (c.last_activity_date) s += 8; return Math.max(12, Math.min(96, s)); };
  const risk = custs.map(c => ({ ...c, score: riskScore(c) })).sort((a, b) => a.score - b.score).slice(0, 5);
  const riskLabel = s => s < 35 ? ['เสี่ยงสูง', '#BE123C'] : s < 55 ? ['ห่างหาย', '#B45309'] : s < 75 ? ['เฝ้าระวัง', '#B45309'] : ['ปกติ', '#1A9E6E'];
  const scoreColor = s => s < 35 ? '#F43F5E' : s < 55 ? '#F59E0B' : s < 75 ? '#F59E0B' : '#FF4B26';
  const aiText = win.winRate >= 50
    ? `อัตราปิดการขายอยู่ที่ ${win.winRate}% — ทีมทำได้ดี เน้นดูแลดีลที่เปิดอยู่ ${d.projects.open} รายการให้ปิดต่อเนื่อง`
    : `มีดีลเปิดอยู่ ${d.projects.open} รายการ มูลค่า ${kfmt(d.projects.pipeline_value)} — เร่งติดตามงานค้าง ${d.activities.pending} รายการเพื่อเพิ่มอัตราปิด`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div><h1 className="page">{t('แผงบริหาร')}</h1><div className="page-sub">{t('ภาพรวมการขายแบบเรียลไทม์')} · {t('บริษัท เลิฟ ไอแลนด์ จำกัด')}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '7px 11px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>📅 <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, width: 'auto', minWidth: 0, padding: 0, color: 'var(--ink)' }} /></div>
          <div style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '7px 11px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>→ <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, width: 'auto', minWidth: 0, padding: 0, color: 'var(--ink)' }} /></div>
          <button className="btn" onClick={loadRate}>{t('ดูข้อมูล')}</button>
        </div>
      </div>

      <style>{`@media(max-width:820px){.hero3{grid-template-columns:1fr!important}}`}</style>
      <div className="hero3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#1C1B1F', color: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 10px 30px rgba(28,27,35,.18)' }}>
          <div style={{ fontSize: 12, color: '#A0A0A8', fontWeight: 600 }}>{t('ปิดการขายแล้ว')} <span style={{ fontSize: 10, color: '#34D399', fontWeight: 700 }}>● Live</span></div>
          <div style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 2px' }}>{kfmt(win.won_value)}</div>
          <div style={{ fontSize: 11, color: '#A0A0A8' }}>{win.won} {t('ดีล')}</div>
          <div style={{ marginTop: 10 }}><RSpline vals={chartSeries.map(m => +m.value)} /></div>
        </div>
        <div style={{ background: '#FF4B26', color: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 12px 30px rgba(255,75,38,.28)' }}>
          <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>{t('อัตราชนะ (Win rate)')}</div>
          <div style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 2px' }}>{win.winRate}%</div>
          <div style={{ fontSize: 11, opacity: .82 }}>{win.won} {t('ปิดได้')} · {kfmt(win.won_value)}</div>
          <div style={{ marginTop: 14 }}><RSegBar won={win.won} open={win.open} /></div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{t('มูลค่ารวม (Booking)')}</div>
          <div style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 2px' }}>{kfmt(win.total_value)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{win.total} {t('บุ๊กกิ้ง')}</div>
          <div style={{ marginTop: 14 }}><RMiniBars vals={chartSeries.map(m => +m.value)} /></div>
        </div>
      </div>
      <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
        <Stat label={t('เอเจ้นท์ทั้งหมด')} value={d.customers.total} sub={`${t('ใหม่')} +${d.customers.new}`} subUp badge="b" icon="users" />
        <Stat label={t('ยอดเฉลี่ย/บุ๊กกิ้ง')} value={kfmt(win.won ? win.won_value / win.won : 0)} sub={`${win.won} ${t('บุ๊กกิ้ง')}`} subUp badge="p" icon="target" />
        <Stat label={t('งานติดตามค้าง')} value={d.activities.pending} sub={`${d.activities.overdue} ${t('เกินกำหนด')}`} subUp={d.activities.overdue === 0} badge="r" icon="clock" />
        <Stat label={t('สุขภาพการขาย')} value={hexAvg} sub={`${win.winRate}% ${t('ยืนยัน')}`} subUp badge="p" icon="gauge" />
      </div>
      <div className="grid-2-1" style={{ marginBottom: 16 }}>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head"><h3>{t('ยอดรายเดือน')}</h3><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#1A191D', marginRight: 5 }} />{t('ยอดขายจริง')}</span></div>
          <RStriped rows={chartSeries} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t('ยอดตามผู้รับผิดชอบ')}</h3></div>
          {ownersRaw.length ? <RDonut items={ownersRaw} /> : <div className="empty">{t('ยังไม่มีข้อมูล')}</div>}
        </div>
      </div>

      <div className="grid-2-1" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-head"><h3>{t('ประเภทกิจกรรม')}</h3></div>
          {typeCounts.length ? (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, padding: '6px 0' }}>
            {typeCounts.map((x, i) => { const sz = 46 + Math.round(x.c / typeTot * 70); return (<div key={i} style={{ width: sz, height: sz, borderRadius: '50%', background: bubbleColors[i], color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{Math.round(x.c / typeTot * 100)}%</span><span style={{ fontSize: 8, opacity: .9, textAlign: 'center', lineHeight: 1.1, padding: '0 4px' }}>{x.n}</span></div>); })}
          </div>) : <div className="empty">{t('ยังไม่มีข้อมูล')}</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t('งานติดตามล่าสุด')}</h3><a onClick={() => nav('/activities')} style={{ fontSize: 13 }}>{t('ดูทั้งหมด →')}</a></div>
          {recent.length ? recent.map(a => (<div key={a.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(99,102,241,.08)' }}>
            <span className={'pill ' + (A_STATUS[a.status] ? A_STATUS[a.status][0] : 'gray')} style={{ marginTop: 2 }}>{a.status === 'done' ? t('เสร็จ') : t('รอ')}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.customer_name || '-'}</div><div style={{ fontSize: 12, color: '#8891B0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.detail}</div></div>
            <span style={{ fontSize: 11, color: '#94A0BE', whiteSpace: 'nowrap' }}>{(a.due_at || '').slice(5, 10)}</span></div>)) : <div className="empty">{t('ยังไม่มีงานติดตาม')}</div>}
        </div>
      </div>

      <div className="panel" style={{ background: 'linear-gradient(135deg,#FF5C36,#FF8A5C)', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>AI Insight</div><div style={{ fontSize: 13.5, lineHeight: 1.6, opacity: .96 }}>{aiText}</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{t('เอเจ้นท์ที่ต้องดูแล')}</h3><a onClick={() => nav('/customers')} style={{ fontSize: 13 }}>{t('ดูทั้งหมด →')}</a></div>
        <table>
          <thead><tr><th>{t('เอเจ้นท์')}</th><th>{t('คะแนนสุขภาพ')}</th><th>{t('สถานะ')}</th><th>{t('กิจกรรมล่าสุด')}</th><th>{t('ความเสี่ยง')}</th></tr></thead>
          <tbody>{risk.length ? risk.map(c => { const rl = riskLabel(c.score); return (<tr key={c.id}>
            <td><b>{c.name}</b></td>
            <td><span style={{ display: 'inline-block', minWidth: 34, textAlign: 'center', padding: '2px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12, background: scoreColor(c.score) + '22', color: scoreColor(c.score) }}>{c.score}</span></td>
            <td><span style={{ display: 'inline-block', width: 90, height: 8, borderRadius: 6, background: 'rgba(26,25,29,.08)' }}><span style={{ display: 'block', height: 8, width: c.score + '%', borderRadius: 6, background: scoreColor(c.score) }} /></span></td>
            <td className="muted">{(c.last_activity_date || '').slice(0, 10) || '-'}</td>
            <td><span style={{ color: rl[1], fontWeight: 700, fontSize: 12.5 }}>{rl[0]}</span></td></tr>); }) : <tr><td colSpan="5" className="empty">{t('ยังไม่มีข้อมูล')}</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
