import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function lastOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }

export default function SalesPlanReports() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [rep, setRep] = useState(null);
  const [trend, setTrend] = useState([]);
  const [f, setF] = useState({ from: firstOfMonth(), to: lastOfMonth(), team_id: '' });
  const [teams, setTeams] = useState([]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function load() {
    api('/sales-plans/reports', { params: f }).then(setRep).catch(() => {});
    api('/sales-plans/reports/trend').then(d => setTrend(d.rows)).catch(() => {});
  }
  useEffect(() => { load(); }, [f.from, f.to, f.team_id]);
  useEffect(() => { api('/meta/teams').then(d => setTeams(d.rows)).catch(() => {}); }, []);
  if (!rep) return <div className="page-sub" style={{ padding: 20 }}>{t('กำลังโหลด...')}</div>;

  const fn = rep.funnel || {};
  const maxFn = Math.max(fn.total || 0, 1);
  const funnelRows = [['ทั้งหมด', fn.total], ['ติดต่อได้', fn.contacted], ['สนใจ', fn.interested], ['ส่ง Proposal', fn.proposal], ['ปิด Booking', fn.booking]];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <a onClick={() => nav('/sales-plans')} className="muted" style={{ cursor: 'pointer' }}>← {t('แผนการขาย')}</a>
        <h1 className="page" style={{ margin: 0 }}>{t('รายงาน Sales Plan')}</h1>
      </div>
      <div className="toolbar" style={{ marginTop: 12 }}>
        <label className="muted">{t('จาก')}</label><input type="date" value={f.from} onChange={e => set('from', e.target.value)} />
        <label className="muted">{t('ถึง')}</label><input type="date" value={f.to} onChange={e => set('to', e.target.value)} />
        <select value={f.team_id} onChange={e => set('team_id', e.target.value)}><option value="">{t('ทีม: ทั้งหมด')}</option>{teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </div>

      {/* Completion + Funnel */}
      <div className="cards">
        <div className="card"><div className="label">{t('กิจกรรมทั้งหมด')}</div><div className="value">{rep.completion?.total || 0}</div></div>
        <div className="card"><div className="label">{t('เสร็จแล้ว')}</div><div className="value">{rep.completion?.completed || 0}</div></div>
        <div className="card"><div className="label">{t('เกินกำหนด')}</div><div className="value">{rep.completion?.overdue || 0}</div></div>
        <div className="card"><div className="label">{t('ยกเลิก')}</div><div className="value">{rep.completion?.cancelled || 0}</div></div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><b>{t('Conversion Funnel')}</b></div>
        <div style={{ padding: 14 }}>
          {funnelRows.map(([lbl, v]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
              <span style={{ width: 110, fontSize: 13 }}>{t(lbl)}</span>
              <div className="bartrack" style={{ flex: 1 }}><div className="bar" style={{ width: Math.round(((v || 0) / maxFn) * 100) + '%' }} /></div>
              <span style={{ width: 40, textAlign: 'right' }}><b>{v || 0}</b></span>
            </div>
          ))}
        </div>
      </div>

      <ReportTable t={t} title="ผลงานรายบุคคล (by Employee)" cols={['พนักงาน', 'ทีม', 'แผน', 'กิจกรรม', 'เสร็จ', 'ลูกค้าใหม่', 'Proposal', 'Booking', 'มูลค่า Booking']}
        rows={rep.byEmployee.map(r => [r.name, r.team || '-', r.plans, r.activities, r.completed, r.prospects, r.proposals, r.bookings, baht(r.booking_value)])} />

      <ReportTable t={t} title="อันดับพนักงาน (Performance Ranking)" cols={['อันดับ', 'พนักงาน', 'คะแนนเฉลี่ย', 'จำนวนแผน']}
        rows={rep.ranking.map((r, i) => [i + 1, r.name, (r.score ?? 0) + '%', r.plans])} />

      <ReportTable t={t} title="ยอดตามทีม (by Team)" cols={['ทีม', 'แผน', 'กิจกรรม', 'เสร็จ', 'Booking', 'มูลค่า Booking']}
        rows={rep.byTeam.map(r => [r.team, r.plans, r.activities, r.completed, r.bookings, baht(r.booking_value)])} />

      <div className="row" style={{ marginTop: 4 }}>
        <ReportTable t={t} title="ตาม Segment" cols={['Segment', 'กิจกรรม', 'Booking']} rows={rep.bySegment.map(r => [r.segment, r.activities, r.bookings])} half />
        <ReportTable t={t} title="ตาม Market" cols={['Market', 'ประเทศ', 'กิจกรรม', 'Booking']} rows={rep.byMarket.map(r => [r.market, r.country, r.activities, r.bookings])} half />
      </div>

      <ReportTable t={t} title="เทียบรายเดือน (MoM / YoY)" cols={['เดือน', 'ลูกค้าใหม่', 'Proposal', 'Booking', 'มูลค่า Booking']}
        rows={trend.map(r => [r.ym, r.prospects, r.proposals, r.bookings, baht(r.booking_value)])} />
    </div>
  );
}

function ReportTable({ t, title, cols, rows, half }) {
  const el = (
    <div className="panel" style={{ marginTop: 16, ...(half ? { flex: 1 } : {}) }}>
      <div className="panel-head"><b>{t(title)}</b></div>
      <table><thead><tr>{cols.map(c => <th key={c}>{t(c)}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
          {!rows.length && <tr><td colSpan={cols.length} className="muted">{t('ไม่มีข้อมูล')}</td></tr>}
        </tbody></table>
    </div>
  );
  return el;
}
