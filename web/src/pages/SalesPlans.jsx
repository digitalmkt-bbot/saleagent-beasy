import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

export const PLAN_STATUS = {
  draft: ['ร่าง', 'gray'], submitted: ['ส่งแล้ว', 'blue'], pending_review: ['รอตรวจสอบ', 'orange'],
  revision_required: ['ต้องแก้ไข', 'red'], approved: ['อนุมัติแล้ว', 'green'], in_progress: ['กำลังดำเนินการ', 'blue'],
  completed: ['เสร็จสิ้น', 'purple'], closed: ['ปิดแล้ว', 'gray'], cancelled: ['ยกเลิก', 'red'],
};

export default function SalesPlans() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ search: '', status: '', user_id: '', team_id: '', month: '', year: '' });
  const [meta, setMeta] = useState({ users: [], teams: [] });
  const [show, setShow] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function load() { api('/sales-plans', { params: { ...f, limit: 200 } }).then(d => setRows(d.rows)).catch(() => {}); }
  useEffect(() => { load(); }, [f.status, f.user_id, f.team_id, f.month, f.year]);
  useEffect(() => { Promise.all([api('/meta/users'), api('/meta/teams')]).then(([u, tm]) => setMeta({ users: u.rows, teams: tm.rows })).catch(() => {}); }, []);

  const kpi = {
    total: rows.length,
    submitted: rows.filter(r => ['submitted', 'pending_review'].includes(r.status)).length,
    approved: rows.filter(r => ['approved', 'in_progress', 'completed', 'closed'].includes(r.status)).length,
    revision: rows.filter(r => r.status === 'revision_required').length,
    avg: rows.length ? Math.round(rows.reduce((s, r) => s + (r.completion_pct || 0), 0) / rows.length) : 0,
  };
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div>
      <h1 className="page">{t('แผนการขายรายสัปดาห์')}</h1>
      <div className="cards">
        <div className="card"><div className="label">{t('แผนทั้งหมด')}</div><div className="value">{kpi.total}</div></div>
        <div className="card"><div className="label">{t('รอตรวจสอบ')}</div><div className="value">{kpi.submitted}</div></div>
        <div className="card"><div className="label">{t('อนุมัติแล้ว')}</div><div className="value">{kpi.approved}</div></div>
        <div className="card"><div className="label">{t('ต้องแก้ไข')}</div><div className="value">{kpi.revision}</div></div>
        <div className="card"><div className="label">{t('ความสำเร็จเฉลี่ย')}</div><div className="value">{kpi.avg}%</div></div>
      </div>
      <div className="toolbar">
        <input placeholder={t('ค้นหา เลขที่แผน/พนักงาน')} value={f.search} onChange={e => set('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <select value={f.status} onChange={e => set('status', e.target.value)}><option value="">{t('สถานะ: ทั้งหมด')}</option>{Object.entries(PLAN_STATUS).map(([k, v]) => <option key={k} value={k}>{t(v[0])}</option>)}</select>
        <select value={f.user_id} onChange={e => set('user_id', e.target.value)}><option value="">{t('พนักงาน: ทั้งหมด')}</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select>
        <select value={f.team_id} onChange={e => set('team_id', e.target.value)}><option value="">{t('ทีม: ทั้งหมด')}</option>{meta.teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={f.month} onChange={e => set('month', e.target.value)}><option value="">{t('เดือน: ทั้งหมด')}</option>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select>
        <select value={f.year} onChange={e => set('year', e.target.value)}><option value="">{t('ปี: ทั้งหมด')}</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <button className="btn green" style={{ marginLeft: 'auto' }} onClick={() => setShow(true)}>{t('+ สร้างแผนสัปดาห์')}</button>
      </div>
      <div className="panel">
        <table><thead><tr>
          <th>{t('เลขที่แผน')}</th><th>{t('พนักงาน')}</th><th>{t('ทีม')}</th><th>{t('สัปดาห์')}</th><th>{t('ช่วงวันที่')}</th>
          <th>{t('วางแผน')}</th><th>{t('ทำแล้ว')}</th><th>{t('สำเร็จ')}</th><th>{t('ลูกค้าใหม่')}</th><th>{t('Proposal')}</th><th>{t('Booking')}</th><th>{t('สถานะ')}</th>
        </tr></thead>
        <tbody>{rows.map(p => (
          <tr key={p.id}>
            <td><a onClick={() => nav('/sales-plans/' + p.id)}><b>{p.plan_number}</b></a></td>
            <td>{p.user_name}</td><td>{p.team_name}</td><td>W{p.week_number}/{p.year}</td>
            <td className="muted">{(p.start_date || '').slice(0, 10)} → {(p.end_date || '').slice(0, 10)}</td>
            <td>{p.planned_count}</td><td>{p.done_count}</td>
            <td><b>{p.completion_pct}%</b></td>
            <td>{p.new_customer_count}</td><td>{p.proposal_count}</td><td>{p.booking_count}</td>
            <td><span className={'pill ' + (PLAN_STATUS[p.status]?.[1] || 'gray')}>{t(PLAN_STATUS[p.status]?.[0] || p.status)}</span></td>
          </tr>))}
          {!rows.length && <tr><td colSpan="12" className="muted">{t('ยังไม่มีแผนการขาย')}</td></tr>}
        </tbody></table>
      </div>
      {show && <CreateModal meta={meta} t={t} onClose={() => setShow(false)} onSaved={(id) => { setShow(false); nav('/sales-plans/' + id); }} />}
    </div>
  );
}

function mondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay() || 7; d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}
function CreateModal({ meta, t, onClose, onSaved }) {
  const [f, setF] = useState({ start_date: mondayOf(), manager_id: '', team_id: '', note: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  async function save() {
    try {
      const r = await api('/sales-plans', { method: 'POST', body: { ...f, manager_id: f.manager_id || null, team_id: f.team_id || null } });
      onSaved(r.id);
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>{t('สร้างแผนการขายรายสัปดาห์')}</h3>
      <label>{t('วันเริ่มต้นสัปดาห์ (จันทร์)')}</label><input type="date" value={f.start_date} onChange={e => set('start_date', mondayOf(e.target.value))} />
      <div className="row">
        <div><label>{t('ทีม')}</label><select value={f.team_id} onChange={e => set('team_id', e.target.value)}><option value="">-</option>{meta.teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><label>{t('ผู้จัดการ (ผู้ตรวจสอบ)')}</label><select value={f.manager_id} onChange={e => set('manager_id', e.target.value)}><option value="">-</option>{meta.users.filter(u => ['admin', 'manager', 'executive'].includes(String(u.role).toLowerCase())).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div>
      </div>
      <label>{t('หมายเหตุประจำสัปดาห์')}</label><textarea rows="2" value={f.note} onChange={e => set('note', e.target.value)} />
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>{t('ยกเลิก')}</button><button className="btn green" onClick={save}>{t('สร้างแผน')}</button>
      </div>
    </div></div>
  );
}
