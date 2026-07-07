import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { DIR, Stars, today, nowT } from '../lib.jsx';

export default function Activities() {
  const nav = useNavigate();
  const [data, setData] = useState({ rows: [], buckets: {} });
  const [f, setF] = useState({ bucket: 'all', status: '', type: '', team: '', assignee: '', search: '', sort: 'due' });
  const [meta, setMeta] = useState({ users: [], teams: [], stages: [], methods: [], types: [], customers: [], projects: [], atags: [] });
  const [targets, setTargets] = useState([]);
  const [modal, setModal] = useState(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  function load() {
    api('/activities', { params: { bucket: f.bucket, status: f.status, type: f.type, team: f.team, assignee: f.assignee, search: f.search, sort: f.sort, limit: 200 } }).then(setData).catch(() => {});
  }
  useEffect(() => { load(); }, [f.bucket, f.status, f.type, f.team, f.assignee, f.sort]);
  useEffect(() => {
    Promise.all([api('/meta/users'), api('/meta/teams'), api('/meta/pipeline-stages'), api('/meta/lookups'),
      api('/customers', { params: { limit: 300 } }), api('/projects', { params: { limit: 300 } }), api('/tags', { params: { scope: 'activity' } }), api('/meta/targets')])
      .then(([u, t, s, lk, c, p, at, tg]) => { setMeta({ users: u.rows, teams: t.rows, stages: s.rows, methods: lk.contact_method, types: lk.activity_types, customers: c.rows, projects: p.rows, atags: at.rows }); setTargets(tg.rows); }).catch(() => {});
  }, []);

  const b = data.buckets || {};
  const tLabel = { new_customer: 'ลูกค้าใหม่', opportunity: 'โอกาส', sales: 'ยอดขาย', profit: 'กำไร' };
  async function done(id) { await api('/activities/' + id, { method: 'PATCH', body: { status: 'done' } }); load(); }
  async function del(id) { if (confirm('ลบกิจกรรมนี้?')) { await api('/activities/' + id, { method: 'DELETE' }); load(); } }

  return (
    <div>
      <h1 className="page">งานติดตาม</h1>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>เป้าหมายวันนี้</h3>
          <div>
            <select value={f.team} onChange={e => set('team', e.target.value)}><option value="">ทีม: ทั้งหมด</option>{meta.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{' '}
            <select value={f.assignee} onChange={e => set('assignee', e.target.value)}><option value="">ผู้รับผิดชอบ: ทั้งหมด</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select>
          </div>
        </div>
        <div className="cards" style={{ marginTop: 12 }}>
          {targets.map(t => { const pct = Math.min(100, Math.round(t.actual_value / (t.target_value || 1) * 100)); return (
            <div className="card" key={t.id}><div className="label">{tLabel[t.metric] || t.metric}</div>
              <div className="value" style={{ fontSize: 17 }}>{(+t.actual_value).toLocaleString()} / {(+t.target_value).toLocaleString()}</div>
              <div style={{ background: '#eef1f4', borderRadius: 6, height: 8, marginTop: 8 }}><div style={{ width: pct + '%', background: '#4CAE4C', height: 8, borderRadius: 6 }} /></div>
              <div className="muted">{pct}%</div></div>); })}
        </div>
      </div>
      <div className="toolbar">
        <button className="btn green" onClick={() => setModal({})}>+ กิจกรรม</button>
        <input placeholder="ค้นหา รายละเอียด/ลูกค้า/โครงการ" value={f.search} onChange={e => set('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <select value={f.status} onChange={e => set('status', e.target.value)}><option value="">สถานะ: ทั้งหมด</option><option value="pending">รอดำเนินการ</option><option value="done">เสร็จสิ้น</option></select>
        <select value={f.type} onChange={e => set('type', e.target.value)}><option value="">ประเภท: ทั้งหมด</option>{meta.types.map((t, i) => <option key={i} value={i}>{t}</option>)}</select>
        <select value={f.sort} onChange={e => set('sort', e.target.value)}><option value="due">เรียง: กำหนดเวลา</option><option value="priority">เรียง: ความสำคัญ</option></select>
      </div>
      <div className="tabs">
        {[['all', 'ทั้งหมด', b.all], ['today', 'วันนี้', b.today], ['upcoming', 'เร็วๆนี้', b.upcoming], ['overdue', 'เกินกำหนด', b.overdue]].map(([k, l, n]) => (
          <div key={k} className={'tab' + (f.bucket === k ? ' active' : '')} onClick={() => set('bucket', k)}>{l} ({n || 0})</div>))}
      </div>
      <div className="panel">
        <table><thead><tr><th>กำหนด</th><th>ลูกค้า</th><th>โครงการ</th><th>ทิศทาง</th><th>ประเภท</th><th>วิธี</th><th>สำคัญ</th><th>รายละเอียด</th><th>แท็ก</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>{data.rows.map(a => { const d = DIR[a.direction] || ['-', 'gray']; return (
            <tr key={a.id}>
              <td>{(a.due_at || a.activity_at || '').slice(0, 10)}{a.activity_time && <div className="muted">{a.activity_time}</div>}</td>
              <td><a onClick={() => nav('/customers/' + a.customer_id)}>{a.customer_name}</a></td>
              <td>{a.project_id ? <a onClick={() => nav('/projects/' + a.project_id)}>{a.project_name}</a> : ''}</td>
              <td><span className={'pill ' + d[1]}>{d[0]}</span></td><td>{meta.types[a.activity_type]}</td><td>{a.method_name}</td>
              <td><Stars n={a.priority_id} /></td>
              <td style={{ maxWidth: 180 }}>{a.detail}{a.image_url ? ' 📎' : ''}</td>
              <td>{(a.tags || []).map((t, i) => <span key={i} className="pill orange">{t}</span>)}</td>
              <td>{a.assignee_name}</td>
              <td><span className={'pill ' + (a.status === 'done' ? 'green' : 'orange')}>{a.status === 'done' ? 'เสร็จสิ้น' : 'รอ'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}><button className="btn sm ghost" onClick={() => setModal(a)}>แก้ไข</button> {a.status !== 'done' && <button className="btn sm" onClick={() => done(a.id)}>เสร็จ</button>} <button className="btn sm red" onClick={() => del(a.id)}>ลบ</button></td>
            </tr>); }) || null}
            {!data.rows.length && <tr><td colSpan="12" className="muted">ไม่มีงานติดตาม</td></tr>}
          </tbody></table>
      </div>
      {modal && <ActivityModal meta={meta} edit={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={(again) => { setModal(again ? {} : null); load(); }} />}
    </div>
  );
}

function ActivityModal({ meta, edit, onClose, onSaved }) {
  const init = edit || {};
  const [f, setF] = useState({
    customer_id: init.customer_id || '', contact_id: init.contact_id || '', direction: init.direction || 'outbound',
    activity_at: (init.activity_at || today()).slice(0, 10), activity_time: init.activity_time || nowT(),
    contact_method_id: init.contact_method_id || (meta.methods[0] && meta.methods[0].id) || '', activity_type: init.activity_type ?? 0,
    priority_id: init.priority_id || 3, assignee_user_id: init.assignee_user_id || '', project_id: init.project_id || '',
    stage_id: init.stage_id || '', detail: init.detail || '', is_follow_up: init.id ? init.status === 'pending' : true,
    due_at: (init.due_at || today()).slice(0, 10),
  });
  const [contacts, setContacts] = useState([]);
  const [tagIds, setTagIds] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [image, setImage] = useState(init.image_url || null);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { if (!f.customer_id) { setContacts([]); return; } api('/customers/' + f.customer_id).then(c => setContacts(c.contacts || [])).catch(() => {}); }, [f.customer_id]);
  const toggle = (arr, setArr, id) => setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  function readImg(e) { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => setImage(ev.target.result); r.readAsDataURL(file); }
  async function save(again) {
    if (!f.customer_id) return setErr('เลือกลูกค้า');
    const body = { ...f, contact_id: f.contact_id || null, project_id: f.project_id || null, stage_id: f.stage_id || null,
      due_at: f.is_follow_up ? f.due_at : null, status: f.is_follow_up ? 'pending' : 'done', tag_ids: tagIds, mentions, image_url: image };
    try {
      if (edit) await api('/activities/' + edit.id, { method: 'PUT', body });
      else await api('/activities', { method: 'POST', body });
      onSaved(again);
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>{edit ? 'แก้ไขกิจกรรม' : 'สร้างบันทึกกิจกรรม'}</h3>
      <div className="row">
        <div><label>ชื่อกิจการ *</label><select value={f.customer_id} onChange={e => set('customer_id', e.target.value)}><option value="">- เลือกลูกค้า -</option>{meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label>ผู้ติดต่อ</label><select value={f.contact_id} onChange={e => set('contact_id', e.target.value)}><option value="">-</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <label>ทิศทาง</label>
      <div style={{ display: 'flex', gap: 10 }}>{Object.entries(DIR).map(([k, v]) => <div key={k} className={'dirbtn' + (f.direction === k ? ' on' : '')} onClick={() => set('direction', k)}>{v[0]}</div>)}</div>
      <div className="row">
        <div><label>วันที่ *</label><input type="date" value={f.activity_at} onChange={e => set('activity_at', e.target.value)} /></div>
        <div><label>เวลา *</label><input type="time" value={f.activity_time} onChange={e => set('activity_time', e.target.value)} /></div>
        <div><label>วิธีการติดต่อ *</label><select value={f.contact_method_id} onChange={e => set('contact_method_id', e.target.value)}>{meta.methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      </div>
      <div className="row">
        <div><label>ประเภทงานติดตาม</label><select value={f.activity_type} onChange={e => set('activity_type', +e.target.value)}>{meta.types.map((t, i) => <option key={i} value={i}>{t}</option>)}</select></div>
        <div><label>ความสำคัญ</label><select value={f.priority_id} onChange={e => set('priority_id', +e.target.value)}>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'][p - 1]}</option>)}</select></div>
        <div><label>ผู้รับผิดชอบ</label><select value={f.assignee_user_id} onChange={e => set('assignee_user_id', e.target.value)}><option value="">-</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div>
      </div>
      <div className="row">
        <div><label>โครงการ</label><select value={f.project_id} onChange={e => set('project_id', e.target.value)}><option value="">-</option>{meta.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label>สถานะโครงการ</label><select value={f.stage_id} onChange={e => set('stage_id', e.target.value)}><option value="">-</option>{meta.stages.map(s => <option key={s.id} value={s.id}>{s.seq}. {s.name}</option>)}</select></div>
      </div>
      <label>รายละเอียดการติดต่อ</label><textarea rows="3" value={f.detail} onChange={e => set('detail', e.target.value)} />
      <label>@ แท็กเพื่อนร่วมงาน</label><div>{meta.users.map(u => <span key={u.id} className={'chip' + (mentions.includes(u.id) ? ' on' : '')} onClick={() => toggle(mentions, setMentions, u.id)}>@{u.display_name}</span>)}</div>
      <label>แท็กกิจกรรม</label><div>{meta.atags.map(t => <span key={t.id} className={'chip' + (tagIds.includes(t.id) ? ' on' : '')} onClick={() => toggle(tagIds, setTagIds, t.id)}>{t.name}</span>)}</div>
      <label>แนบรูป</label><input type="file" accept="image/*" onChange={readImg} />{image && <div style={{ marginTop: 8 }}><img src={image} style={{ maxHeight: 80, borderRadius: 6 }} /></div>}
      <div className="row" style={{ marginTop: 10, alignItems: 'center' }}>
        <div style={{ flex: '0 0 auto' }}><label style={{ display: 'inline' }}><input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={f.is_follow_up} onChange={e => set('is_follow_up', e.target.checked)} />สร้างงานติดตาม</label></div>
        {f.is_follow_up && <div><label>กำหนดติดตาม</label><input type="date" value={f.due_at} onChange={e => set('due_at', e.target.value)} /></div>}
      </div>
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn" onClick={() => save(false)}>บันทึก</button>
        {!edit && <button className="btn green" onClick={() => save(true)}>บันทึกและไปต่อ</button>}
      </div>
    </div></div>
  );
}
