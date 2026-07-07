import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, baht } from '../api.js';
import { Stars } from '../lib.jsx';

export default function Projects() {
  const nav = useNavigate();
  const [data, setData] = useState({ rows: [], total_value: 0 });
  const [f, setF] = useState({ search: '', stage: '', customer_id: '', team: '', owner: '', priority: '' });
  const [meta, setMeta] = useState({ customers: [], stages: [], types: [], users: [], teams: [] });
  const [show, setShow] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function load() { api('/projects', { params: { ...f, limit: 100 } }).then(setData).catch(() => {}); }
  useEffect(() => { load(); }, [f.stage, f.customer_id, f.team, f.owner, f.priority]);
  useEffect(() => { Promise.all([api('/customers', { params: { limit: 300 } }), api('/meta/pipeline-stages'), api('/meta/lookups'), api('/meta/users'), api('/meta/teams')])
    .then(([c, s, lk, u, t]) => setMeta({ customers: c.rows, stages: s.rows, types: lk.project_type, users: u.rows, teams: t.rows })).catch(() => {}); }, []);
  async function move(p, dir) { const next = Math.min(8, Math.max(1, (p.stage_seq || 1) + dir)); const st = meta.stages.find(s => s.seq === next); if (st) { await api('/projects/' + p.id, { method: 'PUT', body: { stage_id: st.id, is_open: next < 8 } }); load(); } }
  return (
    <div>
      <h1 className="page">โครงการ</h1>
      <div className="cards">
        <div className="card"><div className="label">มูลค่ารวม</div><div className="value" style={{ fontSize: 18 }}>{baht(data.total_value)}</div></div>
        <div className="card"><div className="label">จำนวนโครงการ</div><div className="value">{data.rows.length}</div></div>
        <div className="card"><div className="label">เปิดอยู่</div><div className="value">{data.rows.filter(p => p.is_open).length}</div></div>
      </div>
      <div className="toolbar">
        <input placeholder="ค้นหา รหัส/ชื่อโครงการ" value={f.search} onChange={e => set('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <select value={f.stage} onChange={e => set('stage', e.target.value)}><option value="">สถานะ: ทั้งหมด</option>{meta.stages.map(s => <option key={s.id} value={s.id}>{s.seq}. {s.name}</option>)}</select>
        <select value={f.customer_id} onChange={e => set('customer_id', e.target.value)}><option value="">ลูกค้า: ทั้งหมด</option>{meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={f.team} onChange={e => set('team', e.target.value)}><option value="">ทีม: ทั้งหมด</option>{meta.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select value={f.owner} onChange={e => set('owner', e.target.value)}><option value="">ผู้รับผิดชอบ: ทั้งหมด</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select>
        <select value={f.priority} onChange={e => set('priority', e.target.value)}><option value="">ความสำคัญ: ทั้งหมด</option>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'][p - 1]}</option>)}</select>
        <button className="btn green" style={{ marginLeft: 'auto' }} onClick={() => setShow(true)}>+ สร้างโครงการ</button>
      </div>
      <div className="panel">
        <table><thead><tr><th>รหัส</th><th>โครงการ</th><th>ลูกค้า</th><th>สำคัญ</th><th>กิจกรรม</th><th>วันเริ่ม-สิ้นสุด</th><th>สถานะ (ไปป์ไลน์)</th><th>มูลค่า</th><th>ผู้รับผิดชอบ</th><th>เลื่อน</th></tr></thead>
          <tbody>{data.rows.map(p => (
            <tr key={p.id}><td>{p.code}</td><td><a onClick={() => nav('/projects/' + p.id)}><b>{p.name}</b></a></td><td>{p.customer_name}</td>
              <td><Stars n={p.priority_id} /></td><td>{p.activity_count}</td><td className="muted">{(p.start_date || '').slice(0, 10)} - {(p.end_date || '').slice(0, 10)}</td>
              <td><span className={'pill ' + (p.is_open ? 'blue' : 'green')}>{p.stage_seq}. {p.stage_name}</span></td><td>{baht(p.estimated_value)}</td><td>{p.owner_name}</td>
              <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm ghost" onClick={() => move(p, -1)}>◀</button> <button className="btn sm" onClick={() => move(p, 1)}>▶</button></td></tr>))}
            {!data.rows.length && <tr><td colSpan="10" className="muted">ไม่มีโครงการ</td></tr>}
          </tbody></table>
      </div>
      {show && <ProjectModal meta={meta} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}
function ProjectModal({ meta, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', customer_id: '', project_type_id: '', stage_id: meta.stages[0]?.id || '', estimated_value: '', start_date: '', end_date: '', priority_id: 3, owner_user_id: '', owner_team_id: '', place_name: '', reference_no: '', note: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  async function save() {
    if (!f.name) return setErr('กรอกชื่อโครงการ');
    try { await api('/projects', { method: 'POST', body: { ...f, customer_id: f.customer_id || null, project_type_id: f.project_type_id || null, owner_user_id: f.owner_user_id || null, owner_team_id: f.owner_team_id || null, estimated_value: +f.estimated_value || 0, is_open: true } }); onSaved(); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>สร้างโครงการใหม่</h3>
      <label>ชื่อโครงการ *</label><input value={f.name} onChange={e => set('name', e.target.value)} />
      <div className="row"><div><label>ลูกค้า</label><select value={f.customer_id} onChange={e => set('customer_id', e.target.value)}><option value="">-</option>{meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label>ประเภทโครงการ</label><select value={f.project_type_id} onChange={e => set('project_type_id', e.target.value)}><option value="">-</option>{meta.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div>
      <div className="row"><div><label>ชื่อสถานที่</label><input value={f.place_name} onChange={e => set('place_name', e.target.value)} /></div><div><label>Reference No.</label><input value={f.reference_no} onChange={e => set('reference_no', e.target.value)} /></div></div>
      <div className="row"><div><label>สถานะเริ่มต้น</label><select value={f.stage_id} onChange={e => set('stage_id', e.target.value)}>{meta.stages.map(s => <option key={s.id} value={s.id}>{s.seq}. {s.name}</option>)}</select></div>
        <div><label>ความสำคัญ</label><select value={f.priority_id} onChange={e => set('priority_id', +e.target.value)}>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'][p - 1]}</option>)}</select></div></div>
      <div className="row"><div><label>มูลค่า</label><input type="number" value={f.estimated_value} onChange={e => set('estimated_value', e.target.value)} /></div>
        <div><label>วันเริ่ม</label><input type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} /></div>
        <div><label>วันสิ้นสุด</label><input type="date" value={f.end_date} onChange={e => set('end_date', e.target.value)} /></div></div>
      <div className="row"><div><label>ทีม</label><select value={f.owner_team_id} onChange={e => set('owner_team_id', e.target.value)}><option value="">-</option>{meta.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label>ผู้รับผิดชอบ</label><select value={f.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}><option value="">-</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div></div>
      <label>บันทึกเพิ่มเติม</label><textarea rows="2" value={f.note} onChange={e => set('note', e.target.value)} />
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn ghost" onClick={onClose}>ยกเลิก</button><button className="btn green" onClick={save}>บันทึก</button></div>
    </div></div>
  );
}
