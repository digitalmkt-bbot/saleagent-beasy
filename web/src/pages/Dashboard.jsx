
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const kfmt = (n) => { n = Number(n) || 0; if (n >= 1e6) return '฿' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K'; return '฿' + Math.round(n); };

function AreaChart({ data, lang }) {
  const MON = lang === 'en' ? EN_MON : TH_MON;
  const mlabel = (m) => MON[(parseInt((m || '').slice(5, 7), 10) || 1) - 1];
  if (!data || !data.length) return <div className="empty">{lang === 'en' ? 'No sales data yet' : 'ยังไม่มีข้อมูลยอดขาย'}</div>;
  const d = data.slice(-12);
  const W = 640, H = 220, padL = 48, padR = 14, padT = 14, padB = 28;
  const maxV = Math.max(1, ...d.map(x => x.value));
  const xat = (i) => padL + (d.length === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR) / (d.length - 1)));
  const yat = (v) => padT + (1 - v / maxV) * (H - padT - padB);
  const base = H - padB;
  const line = d.map((x, i) => `${i ? 'L' : 'M'} ${xat(i).toFixed(1)} ${yat(x.value).toFixed(1)}`).join(' ');
  const area = `M ${xat(0).toFixed(1)} ${base} ` + d.map((x, i) => `L ${xat(i).toFixed(1)} ${yat(x.value).toFixed(1)}`).join(' ') + ` L ${xat(d.length - 1).toFixed(1)} ${base} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => { const y = padT + (1 - g) * (H - padT - padB); return (
        <g key={i}><line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#EEF2F6" strokeWidth="1" />
          <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#9AA5B5">{kfmt(maxV * g)}</text></g>); })}
      <path d={area} fill="#12B981" fillOpacity="0.10" />
      <path d={line} fill="none" stroke="#12B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {d.map((x, i) => <circle key={i} cx={xat(i)} cy={yat(x.value)} r="3.2" fill="#fff" stroke="#12B981" strokeWidth="2" />)}
      {d.map((x, i) => <text key={i} x={xat(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#9AA5B5">{mlabel(x.month)}</text>)}
    </svg>
  );
}

const BADGE = { green: 'ib-green', blue: 'ib-blue', amber: 'ib-amber', red: 'ib-red', purple: 'ib-purple' };
const IC = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  coins: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  trophy: 'M6 9a6 6 0 0 0 12 0V3H6z M6 5H3v2a3 3 0 0 0 3 3 M18 5h3v2a3 3 0 0 1-3 3 M9 21h6 M12 15v6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
};
function Stat({ label, value, sub, subCls, badge, icon }) {
  return (
    <div className="card">
      <div className="card-top"><span className="label">{label}</span>
        <span className={'ico-badge ' + BADGE[badge]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={IC[icon]} /></svg></span></div>
      <div className="value">{value}</div>
      <div className={'delta' + (subCls ? ' ' + subCls : '')}>{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [d, setD] = useState(null);
  const [rep, setRep] = useState(null);
  const [acts, setActs] = useState([]);
  const [period, setPeriod] = useState('year');
  useEffect(() => {
    api('/meta/dashboard').then(setD).catch(() => {});
    api('/reports/summary').then(setRep).catch(() => {});
    api('/activities', { params: { limit: 6, sort: 'priority' } }).then(r => setActs(r.rows)).catch(() => {});
  }, []);

  const monthly = useMemo(() => {
    const all = rep?.monthly || [];
    const now = new Date(); const y = String(now.getFullYear()); const m = now.getMonth();
    if (period === 'all') return all;
    if (period === 'year') return all.filter(x => (x.month || '').startsWith(y));
    if (period === 'month') return all.filter(x => x.month === `${y}-${String(m + 1).padStart(2, '0')}`);
    if (period === 'quarter') { const q = Math.floor(m / 3); return all.filter(x => { if (!(x.month || '').startsWith(y)) return false; const mm = parseInt(x.month.slice(5, 7), 10) - 1; return Math.floor(mm / 3) === q; }); }
    return all;
  }, [rep, period]);

  if (!d) return <div className="empty">{t('กำลังโหลด...')}</div>;
  const owners = (rep?.byOwner || []).filter(o => (+o.won_value + +o.open_value) > 0).slice(0, 5);
  const maxOwner = Math.max(1, ...owners.map(o => +o.won_value + +o.open_value));
  const funnel = (d.funnel || []).filter(f => f.cnt > 0);
  const maxF = Math.max(1, ...funnel.map(f => f.cnt));
  const A_STATUS = { done: [t('เสร็จ'), 'green'], pending: [t('รอดำเนินการ'), 'orange'] };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="page">{t('แผงบริหาร')}</h1>
          <div className="page-sub">{t('ภาพรวมการขายแบบเรียลไทม์')} · {t('บริษัท เลิฟ ไอแลนด์ จำกัด')}</div>
        </div>
        <span className="period-sel">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="year">{t('ปีนี้')}</option>
            <option value="quarter">{t('ไตรมาสนี้')}</option>
            <option value="month">{t('เดือนนี้')}</option>
            <option value="all">{t('ทั้งหมด')}</option>
          </select>
        </span>
      </div>

      <div className="cards">
        <Stat label={t('ลูกค้าทั้งหมด')} value={d.customers.total} sub={`${t('ใหม่')} +${d.customers.new}`} subCls="up" badge="green" icon="users" />
        <Stat label={t('มูลค่าไปป์ไลน์')} value={kfmt(d.projects.pipeline_value)} sub={`${t('เปิดอยู่')} ${d.projects.open} ${t('โครงการ')}`} badge="blue" icon="coins" />
        <Stat label={t('ปิดการขายแล้ว')} value={kfmt(d.projects.won_value)} sub={rep ? `Win rate ${rep.win.winRate}%` : '—'} subCls="up" badge="amber" icon="trophy" />
        <Stat label={t('งานติดตามค้าง')} value={d.activities.pending} sub={`${d.activities.overdue} ${t('เกินกำหนด')}`} subCls={d.activities.overdue ? 'down' : ''} badge="red" icon="clock" />
      </div>

      <div className="grid-2-1">
        <div className="panel">
          <div className="panel-head"><h3>{t('ยอดตามเดือน')}</h3>
            <div className="chart-legend"><span><span className="dot" style={{ background: '#12B981' }} />{t('มูลค่าโครงการ')}</span></div></div>
          <AreaChart data={monthly} lang={lang} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t('Top ผู้ทำยอด')}</h3></div>
          {owners.length ? owners.map((o, i) => { const total = +o.won_value + +o.open_value; return (
            <div className="stage" key={i}>
              <span style={{ width: 84, flexShrink: 0, color: '#5A6678', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
              <span className="bartrack"><span className="bar" style={{ width: Math.round(total / maxOwner * 100) + '%', background: ['#12B981', '#3B82C4', '#6E6FCB', '#E0972B', '#2BB6D6'][i % 5] }} /></span>
              <span style={{ width: 52, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>{kfmt(total)}</span>
            </div>); }) : <div className="empty">{t('ยังไม่มีข้อมูล')}</div>}
        </div>
      </div>

      <div className="grid-1-2">
        <div className="panel">
          <div className="panel-head"><h3>{t('ไปป์ไลน์การขาย')}</h3></div>
          {funnel.length ? funnel.map((f, i) => (
            <div className="stage" key={i}>
              <span style={{ width: 120, flexShrink: 0, color: '#5A6678', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
              <span className="bartrack"><span className="bar" style={{ width: Math.round(f.cnt / maxF * 100) + '%' }} /></span>
              <span style={{ width: 22, textAlign: 'right', fontWeight: 600 }}>{f.cnt}</span>
            </div>)) : <div className="empty">{t('ยังไม่มีโครงการในไปป์ไลน์')}</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><h3>{t('งานติดตามล่าสุด')}</h3>
            <a onClick={() => nav('/activities')} style={{ fontSize: 13 }}>{t('ดูทั้งหมด →')}</a></div>
          <table>
            <thead><tr><th>{t('ลูกค้า')}</th><th>{t('รายละเอียด')}</th><th>{t('กำหนด')}</th><th>{t('ผู้รับผิดชอบ')}</th><th>{t('สถานะ')}</th></tr></thead>
            <tbody>
              {acts.length ? acts.map(a => { const st = A_STATUS[a.status] || ['-', 'gray']; return (
                <tr key={a.id}>
                  <td><b>{a.customer_name || '-'}</b></td><td>{a.detail}</td>
                  <td className="muted">{(a.due_at || '').slice(0, 10) || '-'}</td><td>{a.assignee_name || '-'}</td>
                  <td><span className={'pill ' + st[1]}>{st[0]}</span></td>
                </tr>); }) : <tr><td colSpan="5" className="empty">{t('ยังไม่มีงานติดตาม')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
