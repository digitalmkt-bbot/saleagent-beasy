
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

const IND = '#6366F1', BLU = '#3B82F6', TEAL = '#14B8A6', VIO = '#8B5CF6', SKY = '#38BDF8', GRN = '#34D399';
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
  return (<div className="card"><div className="card-top"><span className="label">{label}{live && <span style={{ marginLeft: 6, fontSize: 10, color: '#0F766E', fontWeight: 700 }}>● Live</span>}</span>
    <span className={'ico-badge ' + BADGE[badge]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={IC[icon]} /></svg></span></div>
    <div className="value">{value}</div><div className={'delta ' + (subUp ? 'up' : 'down')}>{subUp ? '↑' : '↓'} {sub}</div><div style={{ marginTop: 6 }}>{chart}</div></div>);
}

const A_STATUS = { done: ['green'], pending: ['orange'] };
export default function Dashboard() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [d, setD] = useState(null);
  const [rep, setRep] = useState(null);
  const [acts, setActs] = useState([]);
  const [custs, setCusts] = useState([]);
  const [period, setPeriod] = useState('year');
  const [rwin, setRwin] = useState(null);
  const [rmon, setRmon] = useState(null);
  const [rown, setRown] = useState(null);
  useEffect(() => {
    api('/meta/dashboard').then(setD).catch(() => {});
    api('/reports/summary').then(setRep).catch(() => {});
    api('/activities', { params: { limit: 80, sort: 'due' } }).then(r => setActs(r.rows)).catch(() => {});
    api('/customers', { params: { limit: 100 } }).then(r => setCusts(r.rows)).catch(() => {});
  }, []);
  useEffect(() => {
    const now = new Date(), y = now.getFullYear(), pad = n => String(n).padStart(2, '0'), to = now.toISOString().slice(0, 10);
    let params = { from: `${y}-01-01`, to };
    if (period === 'month') params = { from: `${y}-${pad(now.getMonth() + 1)}-01`, to };
    else if (period === 'quarter') params = { from: `${y}-${pad(Math.floor(now.getMonth() / 3) * 3 + 1)}-01`, to };
    else if (period === 'all') params = {};
    api('/rates/report/winrate', { params }).then(setRwin).catch(() => setRwin(null));
    api('/rates/report/monthly', { params }).then(r => setRmon(r.rows || [])).catch(() => setRmon(null));
    api('/rates/report/sales-volume', { params }).then(r => setRown(r.rows || [])).catch(() => setRown(null));
  }, [period]);
  const monthly = useMemo(() => {
    const all = rep?.monthly || []; const now = new Date(); const y = String(now.getFullYear()); const m = now.getMonth();
    if (period === 'all') return all; if (period === 'year') return all.filter(x => (x.month || '').startsWith(y));
    if (period === 'month') return all.filter(x => x.month === `${y}-${String(m + 1).padStart(2, '0')}`);
    const q = Math.floor(m / 3); return all.filter(x => (x.month || '').startsWith(y) && Math.floor((parseInt(x.month.slice(5, 7), 10) - 1) / 3) === q);
  }, [rep, period]);
  if (!d) return <div className="empty">{t('กำลังโหลด...')}</div>;

  const win = (rwin && rwin.total != null)
    ? { winRate: rwin.total > 0 ? Math.round(rwin.won / rwin.total * 100) : 0, won: rwin.won, open: Math.max(0, (rwin.total || 0) - (rwin.won || 0)), won_value: +rwin.won_value || 0, total: rwin.total || 0, total_value: +rwin.total_value || 0 }
    : { ...(rep?.win || { winRate: 0, won: 0, open: 0 }), won_value: 0, total: 0, total_value: 0 };
  const chartSeries = (rmon && rmon.length) ? rmon : monthly;
  const ownersRaw = ((rown && rown.length)
    ? rown.map(o => ({ name: o.name || o.fullname || t('ไม่ระบุเซลส์'), v: +o.revenue }))
    : (rep?.byOwner || []).map(o => ({ name: o.name, v: (+o.won_value + +o.open_value) }))).filter(o => o.v > 0).sort((a, b) => b.v - a.v);
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
  const riskLabel = s => s < 35 ? ['เสี่ยงสูง', '#BE123C'] : s < 55 ? ['ห่างหาย', '#B45309'] : s < 75 ? ['เฝ้าระวัง', '#B45309'] : ['ปกติ', '#0F766E'];
  const scoreColor = s => s < 35 ? '#F43F5E' : s < 55 ? '#F59E0B' : s < 75 ? '#F59E0B' : '#14B8A6';
  const aiText = win.winRate >= 50
    ? `อัตราปิดการขายอยู่ที่ ${win.winRate}% — ทีมทำได้ดี เน้นดูแลดีลที่เปิดอยู่ ${d.projects.open} รายการให้ปิดต่อเนื่อง`
    : `มีดีลเปิดอยู่ ${d.projects.open} รายการ มูลค่า ${kfmt(d.projects.pipeline_value)} — เร่งติดตามงานค้าง ${d.activities.pending} รายการเพื่อเพิ่มอัตราปิด`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div><h1 className="page">{t('แผงบริหาร')}</h1><div className="page-sub">{t('ภาพรวมการขายแบบเรียลไทม์')} · {t('บริษัท เลิฟ ไอแลนด์ จำกัด')}</div></div>
        <span className="period-sel"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <select value={period} onChange={e => setPeriod(e.target.value)}><option value="year">{t('ปีนี้')}</option><option value="quarter">{t('ไตรมาสนี้')}</option><option value="month">{t('เดือนนี้')}</option><option value="all">{t('ทั้งหมด')}</option></select></span>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <Stat label={t('ปิดการขายแล้ว')} value={kfmt(win.won_value)} sub={`${win.won} ${t('ดีล')}`} subUp badge="i" icon="trophy" chart={<DotWave data={chartSeries} />} live />
        <Stat label={t('เอเจ้นท์ทั้งหมด')} value={d.customers.total} sub={`${t('ใหม่')} +${d.customers.new}`} subUp badge="b" icon="users" chart={<DotGrid data={monthly} />} />
        <Stat label={t('มูลค่ารวม (Booking)')} value={kfmt(win.total_value)} sub={`${win.total} ${t('บุ๊กกิ้ง')}`} subUp badge="a" icon="coins" chart={<AreaMini data={chartSeries} />} />
        <Stat label={t('ยอดเฉลี่ย/บุ๊กกิ้ง')} value={kfmt(win.won ? win.won_value / win.won : 0)} sub={`${win.won} ${t('บุ๊กกิ้ง')}`} subUp badge="p" icon="target" chart={<DotLine data={chartSeries} />} />
        <Stat label={t('งานติดตามค้าง')} value={d.activities.pending} sub={`${d.activities.overdue} ${t('เกินกำหนด')}`} subUp={d.activities.overdue === 0} badge="r" icon="clock" chart={<BarsMini data={monthly} />} />
        <Stat label={t('สุขภาพการขาย')} value={hexAvg} sub={`${win.winRate}% ${t('ยืนยัน')}`} subUp badge="p" icon="gauge" chart={<Gauge value={hexAvg} />} />
      </div>

      <div className="grid-glass-3">
        <div className="panel">
          <div className="panel-head"><h3>{t('ยอดตามผู้รับผิดชอบ')}</h3></div>
          {donutSeg.length ? (<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Donut segments={donutSeg} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{donutSeg.map((s, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '10px 0' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div><div style={{ color: '#8891B0', fontSize: 11 }}>{kfmt(s.v)}</div></div>
              <span style={{ color: '#4A5578', fontWeight: 700, flexShrink: 0 }}>{Math.round(s.v / (donutTot || 1) * 100)}%</span></div>))}</div></div>) : <div className="empty">{t('ยังไม่มีข้อมูล')}</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t('ไปป์ไลน์การขาย')}</h3></div>
          {funnel.length ? <Funnel stages={funnel} /> : <div className="empty">{t('ยังไม่มีกลุ่มเป้าหมายในไปป์ไลน์')}</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t('สุขภาพการขาย')}</h3></div>
          <Hexagon metrics={hexMetrics} />
          <div style={{ marginTop: 8, fontSize: 12 }}>{hexMetrics.map((m, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#4A5578' }}><span><span style={{ width: 7, height: 7, borderRadius: '50%', background: [IND, BLU, TEAL, GRN, VIO, SKY][i], display: 'inline-block', marginRight: 6 }} />{m.k}</span><b>{m.v}</b></div>))}</div>
        </div>
      </div>

      <div className="grid-glass-3">
        <div className="panel">
          <div className="panel-head"><h3>{t('ยอดขายตามทีม')}</h3></div>
          {teams.length ? teams.map((x, i) => (<div key={i} style={{ margin: '11px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}><span style={{ color: '#4A5578', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span><b>{kfmt(x.v)}</b></div>
            <span style={{ display: 'block', background: 'rgba(99,102,241,.1)', borderRadius: 6, height: 8 }}><span style={{ display: 'block', height: 8, width: Math.round(x.v / maxTeam * 100) + '%', background: [IND, BLU, VIO, TEAL, SKY][i % 5], borderRadius: 6 }} /></span></div>)) : <div className="empty">{t('ยังไม่มีข้อมูล')}</div>}
        </div>
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

      <div className="panel" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.92),rgba(129,140,248,.85))', color: '#fff', border: 'none' }}>
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
            <td><span style={{ display: 'inline-block', width: 90, height: 8, borderRadius: 6, background: 'rgba(99,102,241,.1)' }}><span style={{ display: 'block', height: 8, width: c.score + '%', borderRadius: 6, background: scoreColor(c.score) }} /></span></td>
            <td className="muted">{(c.last_activity_date || '').slice(0, 10) || '-'}</td>
            <td><span style={{ color: rl[1], fontWeight: 700, fontSize: 12.5 }}>{rl[0]}</span></td></tr>); }) : <tr><td colSpan="5" className="empty">{t('ยังไม่มีข้อมูล')}</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
