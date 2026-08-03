import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';

export const PLAN_STATUS = {
  draft: ['ร่าง', 'gray'], submitted: ['ส่งแล้ว', 'blue'], pending_review: ['รอตรวจสอบ', 'orange'],
  revision_required: ['ต้องแก้ไข', 'red'], approved: ['อนุมัติแล้ว', 'green'], in_progress: ['กำลังดำเนินการ', 'blue'],
  completed: ['เสร็จสิ้น', 'purple'], closed: ['ปิดแล้ว', 'gray'], cancelled: ['ยกเลิก', 'red'],
};

export default function SalesPlans() {
  const nav = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = ['admin', 'manager', 'executive'].includes(String(user?.role || '').toLowerCase());
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ search: '', status: '', user_id: '', team_id: '', month: '', year: '' });
  const [meta, setMeta] = useState({ users: [], teams: [] });
  const [show, setShow] = useState(false);
  const [view, setView] = useState('list');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function load() { api('/sales-plans', { params: { ...f, limit: 200 } }).then(d => setRows(d.rows)).catch(() => {}); }
  async function del(p, e) {
    e.stopPropagation();
    if (!confirm(t('ลบแผน') + ' ' + p.plan_number + ' ?\n' + t('การลบจะลบกิจกรรมและข้อมูลทั้งหมดของแผนนี้ด้วย'))) return;
    try { await api('/sales-plans/' + p.id, { method: 'DELETE' }); load(); }
    catch (err) { alert(err.message); }
  }
  const canDelete = (p) => isAdmin || ['draft', 'revision_required'].includes(p.status);
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
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <span className="tabs" style={{ margin: 0, border: 'none' }}>
          {[['list', 'รายการ'], ['kanban', 'Kanban'], ['calendar', 'ปฏิทิน']].map(([k, l]) =>
            <span key={k} className={'tab' + (view === k ? ' active' : '')} onClick={() => setView(k)}>{t(l)}</span>)}
        </span>
        <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => nav('/sales-plan-reports')}>{t('📊 รายงาน')}</button>
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
      {view === 'list' && (
        <div className="panel">
          <table><thead><tr>
            <th>{t('เลขที่แผน')}</th><th>{t('พนักงาน')}</th><th>{t('ทีม')}</th><th>{t('สัปดาห์')}</th><th>{t('ช่วงวันที่')}</th>
            <th>{t('วางแผน')}</th><th>{t('ทำแล้ว')}</th><th>{t('สำเร็จ')}</th><th>{t('ลูกค้าใหม่')}</th><th>{t('Proposal')}</th><th>{t('Booking')}</th><th>{t('สถานะ')}</th><th></th>
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
              <td>{canDelete(p) && <button className="btn sm ghost" title={t('ลบ')} onClick={(e) => del(p, e)}>🗑</button>}</td>
            </tr>))}
            {!rows.length && <tr><td colSpan="13" className="muted">{t('ยังไม่มีแผนการขาย')}</td></tr>}
          </tbody></table>
        </div>
      )}
      {view === 'kanban' && <Kanban rows={rows} t={t} nav={nav} />}
      {view === 'calendar' && <CalendarView t={t} nav={nav} />}
      {show && <CreateModal meta={meta} t={t} isAdmin={isAdmin} onClose={() => setShow(false)} onSaved={(id) => { setShow(false); nav('/sales-plans/' + id); }} />}
    </div>
  );
}

function Kanban({ rows, t, nav }) {
  const cols = Object.keys(PLAN_STATUS);
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {cols.map(st => {
        const items = rows.filter(r => r.status === st);
        const c = PLAN_STATUS[st];
        return (
          <div key={st} style={{ minWidth: 220, flex: '0 0 220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className={'pill ' + c[1]}>{t(c[0])}</span><span className="muted">{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(p => (
                <div key={p.id} className="panel" style={{ padding: 12, cursor: 'pointer' }} onClick={() => nav('/sales-plans/' + p.id)}>
                  <b>{p.plan_number}</b>
                  <div className="muted" style={{ fontSize: 12, margin: '2px 0' }}>{p.user_name} · W{p.week_number}</div>
                  <div className="bartrack" style={{ marginTop: 4 }}><div className="bar" style={{ width: (p.completion_pct || 0) + '%' }} /></div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{p.done_count}/{p.planned_count} · {p.completion_pct}%</div>
                </div>
              ))}
              {!items.length && <div className="muted" style={{ fontSize: 12, padding: 8 }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ t, nav }) {
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [acts, setActs] = useState([]);
  const first = new Date(cur.y, cur.m, 1);
  const last = new Date(cur.y, cur.m + 1, 0);
  useEffect(() => {
    api('/sales-plans/calendar', { params: { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10), limit: 500 } })
      .then(d => setActs(d.rows)).catch(() => {});
  }, [cur.y, cur.m]);
  const byDay = {};
  for (const a of acts) { const k = (a.activity_date || '').slice(0, 10); (byDay[k] = byDay[k] || []).push(a); }
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(cur.y, cur.m, d));
  const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const DOWH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  const shift = (n) => setCur(c => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <button className="btn sm ghost" onClick={() => shift(-1)}>◀</button>
        <b>{MON[cur.m]} {cur.y + 543}</b>
        <button className="btn sm ghost" onClick={() => shift(1)}>▶</button>
        <span className="muted" style={{ marginLeft: 'auto' }}>{acts.length} {t('กิจกรรม')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {DOWH.map(d => <div key={d} className="muted" style={{ textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} style={{ minHeight: 84, border: '1px solid var(--line)', borderRadius: 8, padding: 4, background: d ? 'transparent' : 'transparent', opacity: d ? 1 : 0.3 }}>
            {d && <>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{d.getDate()}</div>
              {(byDay[d.toISOString().slice(0, 10)] || []).slice(0, 4).map(a => (
                <div key={a.id} onClick={() => nav('/sales-plans/' + a.plan_id)} title={(a.customer_name || a.client_name || '') + ' · ' + (a.activity_type_name || '')}
                  style={{ fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'rgba(99,102,241,.10)', borderRadius: 4, padding: '1px 4px', marginBottom: 2 }}>
                  {a.start_time ? a.start_time + ' ' : ''}{a.customer_name || a.client_name || '-'}
                </div>
              ))}
              {(byDay[d.toISOString().slice(0, 10)] || []).length > 4 && <div className="muted" style={{ fontSize: 10 }}>+{byDay[d.toISOString().slice(0, 10)].length - 4}</div>}
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}

function mondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay() || 7; d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}
function CreateModal({ meta, t, isAdmin, onClose, onSaved }) {
  const [f, setF] = useState({ start_date: mondayOf(), user_id: '', manager_id: '', team_id: '', note: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function pickUser(uid) {
    const u = meta.users.find(x => String(x.id) === String(uid));
    setF(p => ({ ...p, user_id: uid, team_id: u && u.team_id ? String(u.team_id) : p.team_id }));
  }
  async function save() {
    try {
      const r = await api('/sales-plans', { method: 'POST', body: { ...f, user_id: f.user_id || null, manager_id: f.manager_id || null, team_id: f.team_id || null } });
      onSaved(r.id);
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>{t('สร้างแผนการขายรายสัปดาห์')}</h3>
      {isAdmin && <><label>{t('พนักงาน (เจ้าของแผน)')}</label>
        <select value={f.user_id} onChange={e => pickUser(e.target.value)}><option value="">{t('— ตัวฉันเอง —')}</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}{u.email ? ' · ' + u.email : ''}</option>)}</select></>}
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
