import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getToken } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { PLAN_STATUS } from './SalesPlans.jsx';

const DAYS = [
  [1, 'จันทร์', 'Mon'], [2, 'อังคาร', 'Tue'], [3, 'พุธ', 'Wed'], [4, 'พฤหัสบดี', 'Thu'],
  [5, 'ศุกร์', 'Fri'], [6, 'เสาร์', 'Sat'], [7, 'อาทิตย์', 'Sun'],
];
const ACT_STATUS = {
  planned: ['วางแผน', 'gray'], confirmed: ['ยืนยัน', 'blue'], in_progress: ['กำลังทำ', 'blue'],
  completed: ['เสร็จ', 'green'], partially_completed: ['เสร็จบางส่วน', 'orange'], rescheduled: ['เลื่อน', 'orange'],
  cancelled: ['ยกเลิก', 'red'], no_show: ['ไม่มา', 'red'], overdue: ['เกินกำหนด', 'red'],
};
const RESULT_TYPES = ['No Contact', 'Contacted', 'Interested', 'Not Interested', 'Follow-up Required', 'Appointment Created',
  'Proposal Requested', 'Proposal Sent', 'Negotiating', 'Waiting for Decision', 'New Prospect Created',
  'Site Inspection Scheduled', 'Booking Created', 'Booking Closed', 'Lost', 'Cancelled', 'Other'];
const INTEREST = ['High', 'Medium', 'Low'];
const TARGET_LABEL = {
  sales_calls: 'Sales Calls', sales_visits: 'Sales Visits', new_prospect: 'New Prospect',
  proposal_sent: 'Proposal Sent', site_inspection: 'Site Inspection', booking_closed: 'Booking Closed',
};
const TSTATUS = {
  not_started: ['ยังไม่เริ่ม', 'gray'], below_target: ['ต่ำกว่าเป้า', 'red'], on_track: ['กำลังไปได้ดี', 'blue'],
  minimum_achieved: ['ถึงขั้นต่ำ', 'orange'], target_achieved: ['ถึงเป้า', 'green'], exceeded_target: ['เกินเป้า', 'purple'],
};
const dstr = (d) => (d || '').slice(0, 10);
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

export default function SalesPlanDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [meta, setMeta] = useState({ segments: [], markets: [], types: [], objectives: [], customers: [], users: [] });
  const [actModal, setActModal] = useState(null);   // {activity} or {day} for new
  const [resModal, setResModal] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => api('/sales-plans/' + id).then(setPlan).catch(e => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([api('/sales-segments'), api('/markets'), api('/sales-activity-types'), api('/sales-objectives'),
      api('/customers', { params: { limit: 500 } }), api('/meta/users')])
      .then(([s, m, a, o, c, u]) => setMeta({ segments: s.rows, markets: m.rows, types: a.rows, objectives: o.rows, customers: c.rows, users: u.rows }))
      .catch(() => {});
  }, []);

  if (!plan) return <div className="page-sub" style={{ padding: 20 }}>{err || t('กำลังโหลด...')}</div>;

  const isManager = ['admin', 'manager', 'executive'].includes(String(user?.role || '').toLowerCase());
  const canEdit = ['draft', 'revision_required'].includes(plan.status);
  const sc = PLAN_STATUS[plan.status] || ['', 'gray'];

  async function act(url, body) { try { await api(url, { method: 'POST', body: body || {} }); await load(); } catch (e) { alert(e.message); } }
  function exportCsv() {
    const head = ['Day', 'Date', 'Client', 'Segment', 'Market', 'Activity', 'Objective', 'Expected', 'Actual', 'Status', 'Next Action'];
    const lines = [head.join(',')];
    for (const a of plan.activities) {
      const row = [DAYS.find(d => d[0] === a.day_of_week)?.[2] || '', dstr(a.activity_date), a.customer_name || a.client_name || '',
        a.segment_name || '', a.market_code || '', a.activity_type_name || '', a.objective_name || a.objective_detail || '',
        a.expected_result || '', a.actual_result || '', a.status, a.next_action || ''];
      lines.push(row.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = plan.plan_number + '.csv'; a.click();
  }
  async function exportXls() {
    try {
      const BASE = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(BASE + '/sales-plans/' + id + '/export.xls', { headers: { Authorization: 'Bearer ' + getToken() } });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = plan.plan_number + '.xls'; a.click();
    } catch (e) { alert(e.message); }
  }
  function printPdf() {
    const days = DAYS.map(([dow, th]) => {
      const rows = plan.activities.filter(a => a.day_of_week === dow).map(a =>
        `<tr><td>${a.start_time || ''}</td><td>${a.customer_name || a.client_name || '-'}</td><td>${a.segment_name || ''}</td><td>${a.market_code || ''}</td><td>${a.activity_type_name || ''}</td><td>${a.objective_name || a.objective_detail || ''}</td><td>${a.expected_result || ''}</td><td>${a.actual_result || ''}</td><td>${a.status}</td></tr>`).join('');
      return `<tr><td colspan="9" style="background:#f3f4f6;font-weight:700">${th} — ${addDays(plan.start_date, dow - 1)}</td></tr>${rows || '<tr><td colspan=9 style="color:#999">-</td></tr>'}`;
    }).join('');
    const tgt = plan.targets.map(t => `<tr><td>${t.target_type}</td><td>${Math.round(t.minimum_target)}–${Math.round(t.full_target)}</td><td>${Math.round(t.actual_value)}</td><td>${Math.round(t.achievement_percentage)}%</td><td>${t.target_status}</td></tr>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${plan.plan_number}</title><meta charset="utf-8"><style>
      body{font-family:Tahoma,sans-serif;font-size:12px;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:18px 0 6px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px} th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:11px}
      th{background:#FF6B35;color:#fff} .meta{color:#555;margin-bottom:10px}</style></head><body>
      <h1>Weekly Sales Activity Plan — ${plan.plan_number}</h1>
      <div class="meta">${plan.user_name || ''} · ${plan.team_name || ''} · W${plan.week_number}/${plan.year} · ${dstr(plan.start_date)} → ${dstr(plan.end_date)}</div>
      <h2>Weekly Target</h2><table><tr><th>KPI</th><th>Min–Full</th><th>Actual</th><th>%</th><th>Status</th></tr>${tgt}</table>
      <h2>Weekly Activities</h2><table><tr><th>Time</th><th>Client</th><th>Segment</th><th>Market</th><th>Activity</th><th>Objective</th><th>Expected</th><th>Actual</th><th>Status</th></tr>${days}</table>
      <h2>Summary</h2><div>${(plan.summary || '-')}</div>
      </body></html>`);
    w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 300);
  }

  return (
    <div>
      {/* ===== ส่วนที่ 1: Plan Header ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a onClick={() => nav('/sales-plans')} className="muted" style={{ cursor: 'pointer' }}>← {t('แผนการขาย')}</a>
        <h1 className="page" style={{ margin: 0 }}>{plan.plan_number}</h1>
        <span className={'pill ' + sc[1]}>{t(sc[0])}</span>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="cards" style={{ marginBottom: 6 }}>
          <div className="card"><div className="label">{t('พนักงาน')}</div><div className="value" style={{ fontSize: 15 }}>{plan.user_name}</div></div>
          <div className="card"><div className="label">{t('ทีม')}</div><div className="value" style={{ fontSize: 15 }}>{plan.team_name || '-'}</div></div>
          <div className="card"><div className="label">{t('ผู้ตรวจสอบ')}</div><div className="value" style={{ fontSize: 15 }}>{plan.manager_name || '-'}</div></div>
          <div className="card"><div className="label">{t('สัปดาห์')}</div><div className="value" style={{ fontSize: 15 }}>W{plan.week_number}/{plan.year}</div></div>
          <div className="card"><div className="label">{t('ช่วงวันที่')}</div><div className="value" style={{ fontSize: 14 }}>{dstr(plan.start_date)} → {dstr(plan.end_date)}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canEdit && <button className="btn green" onClick={() => act('/sales-plans/' + id + '/submit')}>{t('ส่งให้ตรวจสอบ')}</button>}
          {isManager && ['submitted', 'pending_review'].includes(plan.status) && <>
            <button className="btn green" onClick={() => act('/sales-plans/' + id + '/approve')}>{t('อนุมัติ')}</button>
            <button className="btn" onClick={() => { const c = prompt(t('ความคิดเห็น/สิ่งที่ต้องแก้')); if (c !== null) act('/sales-plans/' + id + '/request-revision', { comment: c }); }}>{t('ขอให้แก้ไข')}</button>
          </>}
          {['approved', 'in_progress'].includes(plan.status) && <button className="btn" onClick={() => act('/sales-plans/' + id + '/complete')}>{t('ปิดสรุปสัปดาห์')}</button>}
          {plan.status === 'completed' && isManager && <button className="btn" onClick={() => act('/sales-plans/' + id + '/close')}>{t('ปิดแผน')}</button>}
          <button className="btn ghost" onClick={() => act('/sales-plans/' + id + '/duplicate')}>{t('ทำซ้ำสัปดาห์ถัดไป')}</button>
          <button className="btn ghost" onClick={exportXls}>{t('ส่งออก Excel')}</button>
          <button className="btn ghost" onClick={printPdf}>{t('พิมพ์ / PDF')}</button>
          <button className="btn ghost" onClick={exportCsv}>CSV</button>
          {(isManager || canEdit) && <button className="btn ghost" style={{ marginLeft: 'auto', color: '#dc2626' }}
            onClick={async () => { if (confirm(t('ลบแผน') + ' ' + plan.plan_number + ' ?\n' + t('การลบจะลบกิจกรรมและข้อมูลทั้งหมดของแผนนี้ด้วย'))) { try { await api('/sales-plans/' + id, { method: 'DELETE' }); nav('/sales-plans'); } catch (e) { alert(e.message); } } }}>
            {t('ลบแผน')}</button>}
        </div>
      </div>

      {/* ===== ส่วนที่ 3: Weekly Target (KPI) ===== */}
      <h3 className="page-sub" style={{ marginTop: 20 }}>{t('เป้าหมายรายสัปดาห์')}</h3>
      <div className="cards">
        {plan.targets.map(tg => {
          const pct = Math.min(100, Math.round(tg.achievement_percentage || 0));
          const ts = TSTATUS[tg.target_status] || ['', 'gray'];
          return (
            <div className="card" key={tg.id}>
              <div className="label">{TARGET_LABEL[tg.target_type] || tg.target_type}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '2px 0 6px' }}>
                <span className="value" style={{ fontSize: 20 }}>{Math.round(tg.actual_value)}</span>
                <span className="muted" style={{ fontSize: 12 }}>/ {Math.round(tg.minimum_target)}–{Math.round(tg.full_target)}</span>
              </div>
              <div className="bartrack"><div className="bar" style={{ width: pct + '%' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                <span className={'pill ' + ts[1]}>{t(ts[0])}</span>
                <span className="muted">{Math.round(tg.achievement_percentage || 0)}% · {t('น้ำหนัก')} {Math.round(tg.weight_percentage)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== ส่วนที่ 2: Weekly Activity Table ===== */}
      <h3 className="page-sub" style={{ marginTop: 20 }}>{t('ตารางกิจกรรมรายสัปดาห์')}</h3>
      {DAYS.map(([dow, th, en]) => {
        const date = addDays(plan.start_date, dow - 1);
        const acts = plan.activities.filter(a => a.day_of_week === dow);
        return (
          <div className="panel" key={dow} style={{ marginBottom: 12 }}>
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>{t(th)} <span className="muted">{date}</span></b>
              {canEdit && <button className="btn sm green" onClick={() => setActModal({ day: dow, date })}>{t('+ เพิ่มกิจกรรม')}</button>}
            </div>
            <table><thead><tr>
              <th>{t('เวลา')}</th><th>{t('ลูกค้า/บริษัท')}</th><th>Segment</th><th>Market</th><th>{t('กิจกรรม')}</th>
              <th>{t('วัตถุประสงค์')}</th><th>{t('ผลคาดหวัง')}</th><th>{t('ผลจริง')}</th><th>{t('สถานะ')}</th><th></th>
            </tr></thead>
            <tbody>
              {acts.map(a => {
                const as = ACT_STATUS[a.status] || ['', 'gray'];
                return (
                  <tr key={a.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{a.all_day ? t('ทั้งวัน') : (a.start_time || '')}</td>
                    <td><b>{a.customer_name || a.client_name || '-'}</b>{a.contact_person ? <div className="muted" style={{ fontSize: 12 }}>{a.contact_person}</div> : null}</td>
                    <td>{a.segment_name || '-'}</td><td>{a.market_code || '-'}</td>
                    <td>{a.activity_type_name || '-'}</td>
                    <td className="muted">{a.objective_name || a.objective_detail || '-'}</td>
                    <td className="muted">{a.expected_result || '-'}</td>
                    <td>{a.actual_result || <span className="muted">-</span>}{a.result_type ? <div><span className="pill blue" style={{ fontSize: 11 }}>{a.result_type}</span></div> : null}</td>
                    <td><span className={'pill ' + as[1]}>{t(as[0])}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm" onClick={() => setResModal(a)}>{t('ผล')}</button>{' '}
                      {canEdit && <><button className="btn sm ghost" onClick={() => setActModal({ activity: a })}>{t('แก้ไข')}</button>{' '}
                        <button className="btn sm ghost" onClick={() => { if (confirm(t('ลบกิจกรรมนี้?'))) api('/sales-plan-activities/' + a.id, { method: 'DELETE' }).then(load); }}>✕</button></>}
                    </td>
                  </tr>
                );
              })}
              {!acts.length && <tr><td colSpan="10" className="muted">{t('ไม่มีกิจกรรม')}</td></tr>}
            </tbody></table>
          </div>
        );
      })}

      {/* ===== ส่วนที่ 4: Review & Weekly Summary ===== */}
      <ReviewSection plan={plan} t={t} onSaved={load} />

      {actModal && <ActivityModal ctx={actModal} planId={id} meta={meta} t={t} onClose={() => setActModal(null)} onSaved={() => { setActModal(null); load(); }} />}
      {resModal && <ResultModal activity={resModal} t={t} onClose={() => setResModal(null)} onSaved={() => { setResModal(null); load(); }} />}
    </div>
  );
}

function ReviewSection({ plan, t, onSaved }) {
  const [f, setF] = useState({ summary: plan.summary || '', issues: plan.issues || '', opportunities: plan.opportunities || '', next_week_plan: plan.next_week_plan || '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [saved, setSaved] = useState(false);
  async function save() { try { await api('/sales-plans/' + plan.id, { method: 'PUT', body: f }); setSaved(true); setTimeout(() => setSaved(false), 2000); onSaved(); } catch (e) { alert(e.message); } }
  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <div className="panel-head"><b>{t('สรุปและทบทวนประจำสัปดาห์')}</b></div>
      <div style={{ padding: 12 }}>
        <div className="row">
          <div><label>{t('สรุปผลประจำสัปดาห์')}</label><textarea rows="3" value={f.summary} onChange={e => set('summary', e.target.value)} /></div>
          <div><label>{t('ปัญหาที่พบ')}</label><textarea rows="3" value={f.issues} onChange={e => set('issues', e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>{t('โอกาสทางการขาย / ลูกค้าที่ต้องติดตาม')}</label><textarea rows="3" value={f.opportunities} onChange={e => set('opportunities', e.target.value)} /></div>
          <div><label>{t('แผนสำหรับสัปดาห์ถัดไป')}</label><textarea rows="3" value={f.next_week_plan} onChange={e => set('next_week_plan', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button className="btn green" onClick={save}>{t('บันทึกสรุป')}</button>
          {saved && <span className="muted">{t('บันทึกแล้ว')}</span>}
        </div>
        {plan.reviews?.length ? (
          <div style={{ marginTop: 16 }}>
            <b>{t('ประวัติการอนุมัติ/ตรวจสอบ')}</b>
            <table style={{ marginTop: 6 }}><thead><tr><th>{t('เวลา')}</th><th>{t('ผู้ทำ')}</th><th>{t('การกระทำ')}</th><th>{t('สถานะ')}</th><th>{t('ความคิดเห็น')}</th></tr></thead>
              <tbody>{plan.reviews.map(r => (
                <tr key={r.id}><td className="muted">{(r.created_at || '').slice(0, 16).replace('T', ' ')}</td><td>{r.reviewer_name}</td><td>{r.action}</td>
                  <td className="muted">{r.previous_status} → {r.new_status}</td><td>{r.comment || '-'}</td></tr>))}
              </tbody></table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActivityModal({ ctx, planId, meta, t, onClose, onSaved }) {
  const a = ctx.activity || {};
  const [f, setF] = useState({
    activity_date: a.activity_date ? a.activity_date.slice(0, 10) : (ctx.date || ''),
    start_time: a.start_time || '', end_time: a.end_time || '', all_day: a.all_day || false,
    customer_id: a.customer_id || '', client_name: a.client_name || '', contact_person: a.contact_person || '',
    phone: a.phone || '', email: a.email || '',
    primary_segment_id: a.primary_segment_id || '', primary_market_id: a.primary_market_id || '',
    activity_type_id: a.activity_type_id || '', objective_type_id: a.objective_type_id || '',
    objective_detail: a.objective_detail || '', expected_result: a.expected_result || '',
    expected_value: a.expected_value || '', expected_pax: a.expected_pax || '', priority_id: a.priority_id || 3,
    location: a.location || '',
  });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  async function save() {
    const body = {
      ...f, customer_id: f.customer_id || null, primary_segment_id: f.primary_segment_id || null,
      primary_market_id: f.primary_market_id || null, activity_type_id: f.activity_type_id || null,
      objective_type_id: f.objective_type_id || null, expected_value: +f.expected_value || 0, expected_pax: +f.expected_pax || 0,
      segments: f.primary_segment_id ? [+f.primary_segment_id] : [], markets: f.primary_market_id ? [+f.primary_market_id] : [],
    };
    try {
      if (a.id) await api('/sales-plan-activities/' + a.id, { method: 'PUT', body });
      else await api('/sales-plans/' + planId + '/activities', { method: 'POST', body });
      onSaved();
    } catch (e) { setErr(e.message); }
  }
  const PR = ['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'];
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>{a.id ? t('แก้ไขกิจกรรม') : t('เพิ่มกิจกรรม')}</h3>
      <div className="row">
        <div><label>{t('วันที่')}</label><input type="date" value={f.activity_date} onChange={e => set('activity_date', e.target.value)} /></div>
        <div><label>{t('เวลาเริ่ม')}</label><input type="time" value={f.start_time} onChange={e => set('start_time', e.target.value)} /></div>
        <div><label>{t('เวลาสิ้นสุด')}</label><input type="time" value={f.end_time} onChange={e => set('end_time', e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label>{t('ลูกค้าในระบบ')}</label><select value={f.customer_id} onChange={e => set('customer_id', e.target.value)}><option value="">- {t('หรือกรอกชื่อชั่วคราว')} -</option>{meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label>{t('ชื่อชั่วคราว (ยังไม่สร้าง)')}</label><input value={f.client_name} onChange={e => set('client_name', e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label>{t('ผู้ติดต่อ')}</label><input value={f.contact_person} onChange={e => set('contact_person', e.target.value)} /></div>
        <div><label>{t('โทรศัพท์')}</label><input value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label>Email</label><input value={f.email} onChange={e => set('email', e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label>Segment</label><select value={f.primary_segment_id} onChange={e => set('primary_segment_id', e.target.value)}><option value="">-</option>{meta.segments.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}</select></div>
        <div><label>Market</label><select value={f.primary_market_id} onChange={e => set('primary_market_id', e.target.value)}><option value="">-</option>{meta.markets.map(m => <option key={m.id} value={m.id}>{m.market_code} · {m.country_name}</option>)}</select></div>
      </div>
      <div className="row">
        <div><label>{t('กิจกรรม')}</label><select value={f.activity_type_id} onChange={e => set('activity_type_id', e.target.value)}><option value="">-</option>{meta.types.map(x => <option key={x.id} value={x.id}>{x.name_en}</option>)}</select></div>
        <div><label>{t('วัตถุประสงค์')}</label><select value={f.objective_type_id} onChange={e => set('objective_type_id', e.target.value)}><option value="">-</option>{meta.objectives.map(o => <option key={o.id} value={o.id}>{o.name_en}</option>)}</select></div>
      </div>
      <label>{t('รายละเอียดวัตถุประสงค์')}</label><input value={f.objective_detail} onChange={e => set('objective_detail', e.target.value)} />
      <label>{t('ผลลัพธ์ที่คาดหวัง')}</label><input value={f.expected_result} onChange={e => set('expected_result', e.target.value)} />
      <div className="row">
        <div><label>{t('มูลค่าคาดหวัง')}</label><input type="number" value={f.expected_value} onChange={e => set('expected_value', e.target.value)} /></div>
        <div><label>{t('จำนวน Pax')}</label><input type="number" value={f.expected_pax} onChange={e => set('expected_pax', e.target.value)} /></div>
        <div><label>{t('ความสำคัญ')}</label><select value={f.priority_id} onChange={e => set('priority_id', +e.target.value)}>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{t(PR[p - 1])}</option>)}</select></div>
      </div>
      <label>{t('สถานที่')}</label><input value={f.location} onChange={e => set('location', e.target.value)} />
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>{t('ยกเลิก')}</button><button className="btn green" onClick={save}>{t('บันทึก')}</button>
      </div>
    </div></div>
  );
}

function ResultModal({ activity, t, onClose, onSaved }) {
  const a = activity;
  const [f, setF] = useState({
    result_type: a.result_type || '', actual_result: a.actual_result || '', customer_feedback: a.customer_feedback || '',
    interest_level: a.interest_level || '', next_action: a.next_action || '', next_follow_up_at: a.next_follow_up_at ? a.next_follow_up_at.slice(0, 10) : '',
    estimated_deal_value: a.estimated_deal_value || '', estimated_pax: a.estimated_pax || '', closing_probability: a.closing_probability || '',
    status: a.status === 'planned' ? 'completed' : a.status, internal_note: a.internal_note || '',
  });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  async function save() {
    try {
      await api('/sales-plan-activities/' + a.id + '/result', { method: 'POST', body: { ...f, estimated_deal_value: +f.estimated_deal_value || 0, estimated_pax: +f.estimated_pax || 0, closing_probability: f.closing_probability === '' ? null : +f.closing_probability } });
      onSaved();
    } catch (e) { setErr(e.message); }
  }
  async function quick(url, body) { try { await api(url, { method: 'POST', body: body || {} }); alert(t('ทำรายการสำเร็จ')); onSaved(); } catch (e) { alert(e.message); } }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
      <h3 style={{ marginTop: 0 }}>{t('บันทึกผลกิจกรรม')} — {a.customer_name || a.client_name}</h3>
      <div className="row">
        <div><label>{t('ผลลัพธ์ (Result Type)')}</label><select value={f.result_type} onChange={e => set('result_type', e.target.value)}><option value="">-</option>{RESULT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <div><label>{t('สถานะกิจกรรม')}</label><select value={f.status} onChange={e => set('status', e.target.value)}>{Object.entries(ACT_STATUS).map(([k, v]) => <option key={k} value={k}>{t(v[0])}</option>)}</select></div>
      </div>
      <label>{t('รายละเอียดผลลัพธ์')}</label><textarea rows="2" value={f.actual_result} onChange={e => set('actual_result', e.target.value)} />
      <label>{t('Feedback ลูกค้า')}</label><textarea rows="2" value={f.customer_feedback} onChange={e => set('customer_feedback', e.target.value)} />
      <div className="row">
        <div><label>{t('ระดับความสนใจ')}</label><select value={f.interest_level} onChange={e => set('interest_level', e.target.value)}><option value="">-</option>{INTEREST.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
        <div><label>{t('โอกาสปิด (%)')}</label><input type="number" value={f.closing_probability} onChange={e => set('closing_probability', e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label>{t('มูลค่าดีลประเมิน')}</label><input type="number" value={f.estimated_deal_value} onChange={e => set('estimated_deal_value', e.target.value)} /></div>
        <div><label>Pax</label><input type="number" value={f.estimated_pax} onChange={e => set('estimated_pax', e.target.value)} /></div>
      </div>
      <label>{t('การดำเนินการถัดไป (Next Action)')}</label><input value={f.next_action} onChange={e => set('next_action', e.target.value)} />
      <label>{t('วันติดตามครั้งถัดไป')}</label><input type="date" value={f.next_follow_up_at} onChange={e => set('next_follow_up_at', e.target.value)} />
      <label>{t('บันทึกภายใน')}</label><textarea rows="2" value={f.internal_note} onChange={e => set('internal_note', e.target.value)} />
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => { const name = prompt(t('ชื่อลูกค้า/บริษัทใหม่'), a.client_name || ''); if (name) quick('/sales-plan-activities/' + a.id + '/create-prospect', { name }); }}>{t('+ สร้าง Prospect')}</button>
        <button className="btn sm ghost" onClick={() => quick('/sales-plan-activities/' + a.id + '/create-proposal', { grand_total: +f.estimated_deal_value || 0 })}>{t('+ สร้าง Proposal')}</button>
        <button className="btn sm ghost" onClick={() => quick('/sales-plan-activities/' + a.id + '/create-task')}>{t('+ สร้าง Task ติดตาม')}</button>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>{t('ปิดหน้าต่าง')}</button><button className="btn green" onClick={save}>{t('บันทึกผล')}</button>
      </div>
    </div></div>
  );
}
