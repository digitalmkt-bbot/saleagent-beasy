import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

const GREEN = '#5BB85B', TEAL = '#3E93A6', TEALC = '#6EA7B4', NAVY = '#16262E';
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const kfmt = (n) => { n = Number(n) || 0; if (n >= 1e6) return '฿' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K'; return '฿' + Math.round(n); };
const smoothPath = (pts) => { if (pts.length < 2) return ''; let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6; d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; } return d; };

function WaveLine({ data, lang }) {
  const MON = lang === 'en' ? EN_MON : TH_MON;
  if (!data || !data.length) return <div className="empty">{lang === 'en' ? 'No sales data yet' : 'ยังไม่มีข้อมูลยอดขาย'}</div>;
  const d = data.slice(-9);
  const W = 660, H = 270, padL = 46, padR = 16, padT = 18, padB = 30, mx = Math.max(1, ...d.map(x => x.value));
  const plotH = H - padT - padB, base = H - padB;
  const xs = i => padL + (d.length === 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (d.length - 1));
  const ys = v => base - (v / mx) * plotH;
  const pts = d.map((x, i) => [xs(i), ys(x.value)]);
  const peak = d.reduce((bi, x, i) => x.value > d[bi].value ? i : bi, 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs><linearGradient id="wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={GREEN} /><stop offset="1" stopColor={TEAL} /></linearGradient>
        <linearGradient id="wa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={GREEN} stopOpacity="0.22" /><stop offset="1" stopColor={TEAL} stopOpacity="0.02" /></linearGradient></defs>
      {[0.2, 0.4, 0.6, 0.8, 1].map((g, i) => { const y = base - g * plotH; return <text key={i} x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#AEB6BC">{Math.round(mx * g / 1000)}K</text>; })}
      <rect x={xs(peak) - 26} y={padT} width="52" height={plotH} rx="14" fill="#DCEFD9" opacity="0.7" />
      <path d={`${smoothPath(pts)} L ${xs(d.length - 1).toFixed(1)} ${base} L ${xs(0).toFixed(1)} ${base} Z`} fill="url(#wa)" />
      <path d={smoothPath(pts)} fill="none" stroke="url(#wl)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={i === peak ? 5 : 3.8} fill="#fff" stroke={i === peak ? GREEN : TEAL} strokeWidth="2.5" />)}
      {d.map((x, i) => <text key={i} x={xs(i).toFixed(1)} y={H - 8} textAnchor="middle" fontSize="10" fill="#8A9099">{MON[(parseInt((x.month || '').slice(5, 7), 10) || 1) - 1]}</text>)}
      <g><rect x={xs(peak) - 46} y={ys(d[peak].value) - 44} width="92" height="34" rx="10" fill={NAVY} />
        <text x={xs(peak) - 38} y={ys(d[peak].value) - 28} fontSize="10" fill="#C7D0D5">{MON[(parseInt((d[peak].month || '').slice(5, 7), 10) || 1) - 1]}</text>
        <text x={xs(peak) - 38} y={ys(d[peak].value) - 15} fontSize="11" fontWeight="800" fill={GREEN}>{kfmt(d[peak].value)}</text><path d={`M ${xs(peak) - 5} ${ys(d[peak].value) - 10} L ${xs(peak) + 5} ${ys(d[peak].value) - 10} L ${xs(peak)} ${ys(d[peak].value) - 4} Z`} fill={NAVY} /></g>
    </svg>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [rep, setRep] = useState(null);
  const [period, setPeriod] = useState('year');
  useEffect(() => { api('/meta/dashboard').then(setD).catch(() => {}); api('/reports/summary').then(setRep).catch(() => {}); }, []);
  const monthly = useMemo(() => {
    const all = rep?.monthly || []; const now = new Date(); const y = String(now.getFullYear()); const m = now.getMonth();
    if (period === 'all') return all; if (period === 'year') return all.filter(x => (x.month || '').startsWith(y));
    if (period === 'month') return all.filter(x => x.month === `${y}-${String(m + 1).padStart(2, '0')}`);
    const q = Math.floor(m / 3); return all.filter(x => (x.month || '').startsWith(y) && Math.floor((parseInt(x.month.slice(5, 7), 10) - 1) / 3) === q);
  }, [rep, period]);
  if (!d) return <div className="empty">{t('กำลังโหลด...')}</div>;

  const win = rep?.win || { winRate: 0, won: 0, open: 0 };
  const totalVal = d.projects.won_value + d.projects.pipeline_value;
  const openPct = totalVal ? Math.round(d.projects.pipeline_value / totalVal * 100) : 0;
  const donePct = totalVal ? Math.round(d.projects.won_value / totalVal * 100) : 0;
  const lastV = monthly.length >= 2 ? +monthly[monthly.length - 1].value : 0;
  const prevV = monthly.length >= 2 ? +monthly[monthly.length - 2].value : 0;
  const growth = prevV ? Math.round((lastV - prevV) / prevV * 100) : 0;
  const name = (user?.name || '').split(' ')[0] || 'ผู้ใช้';
  const dots = [GREEN, TEAL, '#F2A93B', '#8B5CF6'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div><h1 className="page" style={{ color: '#3A4750' }}>{t('ยินดีต้อนรับ')}, <span style={{ color: NAVY }}>{name}!</span> 👋</h1><div className="page-sub" style={{ margin: 0 }}>{t('ภาพรวมการขายแบบเรียลไทม์')}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn ghost" onClick={() => nav('/reports')}><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5" /></svg>{t('รายงาน')}</button>
          <span className="period-sel"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            <select value={period} onChange={e => setPeriod(e.target.value)}><option value="year">{t('ปีนี้')}</option><option value="quarter">{t('ไตรมาสนี้')}</option><option value="month">{t('เดือนนี้')}</option><option value="all">{t('ทั้งหมด')}</option></select></span>
        </div>
      </div>

      <div className="grid3">
        <div className="card">
          <div className="card-top"><div><div className="value">{d.customers.total.toLocaleString()}</div><div className="label" style={{ marginTop: 4 }}>{t('ลูกค้าทั้งหมด')}</div></div>
            <div style={{ display: 'flex', alignItems: 'center' }}>{[GREEN, TEAL, '#F2A93B'].map((c, i) => <span key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i ? -10 : 0 }} />)}<span className="qmark">?</span></div></div>
          <div className="card-link"><a onClick={() => nav('/customers')}>{t('ดูลูกค้าทั้งหมด →')}</a></div>
        </div>
        <div className="card" style={{ background: TEALC, color: '#fff' }}>
          <div className="card-top"><div><div className="value" style={{ color: '#fff' }}>{d.projects.open.toLocaleString()}</div><div style={{ fontSize: 13, opacity: .9, marginTop: 4 }}>{t('ดีลที่เปิดอยู่')}</div></div>
            <div style={{ display: 'flex', alignItems: 'center' }}>{['#8B7CC3', '#F2C94C', '#F2637E'].map((c, i) => <span key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: '2px solid ' + TEALC, marginLeft: i ? -10 : 0 }} />)}<span className="qmark" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}>?</span></div></div>
          <div className="card-link" style={{ borderColor: 'rgba(255,255,255,.25)' }}><a onClick={() => nav('/projects')} style={{ color: '#fff' }}>{t('ดูทั้งหมด →')}</a></div>
        </div>
        <div className="card">
          <div className="card-top"><div><div className="value">{win.winRate}%</div><div className="label" style={{ marginTop: 4 }}>{t('อัตราปิดการขาย')}</div></div>
            <span className="ico-badge ib-amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /></svg></span></div>
          <div className="card-link"><a onClick={() => nav('/reports')}>{t('ดูรายงาน →')}</a></div>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="card metrics-row">
          <div><div className="label">{t('ปิดได้แล้ว')}</div><div className="bignum">{kfmt(d.projects.won_value)}<span className="pill-g">{win.winRate}%</span></div></div>
          <div><div className="label">{t('มูลค่าไปป์ไลน์')}</div><div className="bignum">{kfmt(d.projects.pipeline_value)}<span className="pill-r">{openPct}%</span></div></div>
          <div><div className="label">{t('รวมทั้งหมด')}</div><div className="bignum">{kfmt(totalVal)}<span className="pill-g">{donePct}%</span></div></div>
        </div>
        <div className="card" style={{ background: '#C9E5C4' }}>
          <div className="card-top"><span style={{ fontSize: 13, color: 'var(--green-text)', fontWeight: 600 }}>{t('ความคืบหน้าเป้าหมาย')}</span><span className="pill-solid">{t('ใกล้แล้ว')}</span></div>
          <div style={{ fontSize: 40, fontWeight: 800, marginTop: 16, color: NAVY, letterSpacing: '-1px' }}>{win.winRate}% <span style={{ fontSize: 20 }}>{t('สำเร็จ')}</span></div>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="card">
          <div className="panel-head"><h3>{t('แนวโน้มยอดขายรายเดือน')}</h3></div>
          <WaveLine data={monthly} lang={lang} />
        </div>
        <div className="card" style={{ background: TEALC, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{t('ทำยอดทะลุเป้า')}!</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#B7DCAF', color: 'var(--green-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 19, fontWeight: 800 }}>{(growth >= 0 ? '+' : '') + growth}%</span><span style={{ fontSize: 9 }}>{t('เติบโต')}</span></div>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.92)', color: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 15, fontWeight: 800 }}>{kfmt(d.projects.won_value)}</span><span style={{ fontSize: 9, color: 'var(--muted)' }}>{t('ปิดได้')}</span></div>
          </div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 16, lineHeight: 1.5, maxWidth: '78%' }}>{t('เดือนล่าสุดโตขึ้น')} {(growth >= 0 ? '+' : '') + growth}% — {win.won} {t('ดีล')} {t('ปิดสำเร็จ')}</div>
          <svg viewBox="0 0 24 24" width="70" height="70" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" style={{ position: 'absolute', right: -6, bottom: -8 }}><path d="M6 3h12v4a6 6 0 0 1-12 0z M6 5H3v2a3 3 0 0 0 3 3 M18 5h3v2a3 3 0 0 1-3 3 M9 15h6 M12 12v3 M8 21h8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </div>
  );
}
