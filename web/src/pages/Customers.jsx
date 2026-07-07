import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { LIFE, Stars } from '../lib.jsx';

export default function Customers() {
  const nav = useNavigate();
  const [data, setData] = useState({ rows: [], stats: {} });
  const [tab, setTab] = useState('list');
  const [f, setF] = useState({ search: '', lifecycle: '', team: '', owner: '', tag: '', priority: '' });
  const [meta, setMeta] = useState({ users: [], teams: [], tags: [] });
  const [show, setShow] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function load() { api('/customers', { params: { ...f, sort: tab === 'rank' ? 'rank' : '', limit: 100 } }).then(setData).catch(() => {}); }
  useEffect(() => { load(); }, [f.lifecycle, f.team, f.owner, f.tag, f.priority, tab]);
  useEffect(() => { Promise.all([api('/meta/users'), api('/meta/teams'), api('/tags', { params: { scope: 'customer' } })]).then(([u, t, tg]) => setMeta({ users: u.rows, teams: t.rows, tags: tg.rows })).catch(() => {}); }, []);
  const s = data.stats || {};
  return (
    <div>
      <h1 className="page">ลูกค้า</h1>
      <div className="tabs">
        <div className={'tab' + (tab === 'list' ? ' active' : '')} onClick={() => setTab('list')}>รายการลูกค้า</div>
        <div className={'tab' + (tab === 'rank' ? ' active' : '')} onClick={() => setTab('rank')}>ลำดับลูกค้า</div>
      </div>
      <div className="cards">
        {[['total', 'ลูกค้าทั้งหมด'], ['target', 'เป้าหมาย'], ['new', 'ใหม่'], ['regular', 'ประจำ'], ['lapsed', 'ห่างหาย'], ['followed', 'ติดตามอยู่']].map(([k, l]) =>
          <div className="card" key={k}><div className="label">{l}</div><div className="value">{s[k] || 0}</div></div>)}
      </div>
      <div className="toolbar">
        <input placeholder="ค้นหา ชื่อ/ผู้ติดต่อ/เลขภาษี" value={f.search} onChange={e => set('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <select value={f.lifecycle} onChange={e => set('lifecycle', e.target.value)}><option value="">สถานะ: ทั้งหมด</option>{Object.entries(LIFE).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
        <select value={f.team} onChange={e => set('team', e.target.value)}><option value="">ทีม: ทั้งหมด</option>{meta.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select value={f.owner} onChange={e => set('owner', e.target.value)}><option value="">ผู้รับผิดชอบ: ทั้งหมด</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select>
        <select value={f.tag} onChange={e => set('tag', e.target.value)}><option value="">แท็ก: ทั้งหมด</option>{meta.tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select value={f.priority} onChange={e => set('priority', e.target.value)}><option value="">ความสำคัญ: ทั้งหมด</option>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'][p - 1]}</option>)}</select>
        <button className="btn green" style={{ marginLeft: 'auto' }} onClick={() => setShow(true)}>+ สร้างลูกค้า</button>
      </div>
      <div className="panel">
        <table><thead><tr><th>สถานะ</th><th>ชื่อลูกค้า</th><th>รหัสอ้างอิง</th><th>ผู้ติดต่อ</th><th>สำคัญ</th><th>ผู้รับผิดชอบ</th><th>กิจกรรมล่าสุด</th><th>แท็กกิจกรรม</th></tr></thead>
          <tbody>{data.rows.map(c => { const l = LIFE[c.lifecycle_stage] || ['-', 'gray']; return (
            <tr key={c.id}><td><span className={'pill ' + l[1]}>{l[0]}</span></td>
              <td><a onClick={() => nav('/customers/' + c.id)}><b>{c.name}</b></a></td>
              <td>{c.ref_code}</td><td>{c.primary_contact}</td><td><Stars n={c.priority_id} /></td><td>{c.owner_name}</td>
              <td>{c.last_activity_detail ? <>{c.last_activity_detail} <span className="muted">({(c.last_activity_date || '').slice(0, 10)})</span></> : <span className="muted">-</span>}</td>
              <td>{(c.last_activity_tags || []).map((t, i) => <span key={i} className="pill orange">{t}</span>)}</td></tr>); })}
            {!data.rows.length && <tr><td colSpan="8" className="muted">ไม่พบลูกค้า</td></tr>}
          </tbody></table>
      </div>
      {show && <CustomerModal meta={meta} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function CustomerModal({ meta, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', ref_code: '', tax_id: '', phone: '', email: '', province: 'ภูเก็ต', district: 'เมือง', priority_id: 3, lifecycle_stage: 'target', owner_team_id: '', owner_user_id: '' });
  const [ct, setCt] = useState({ name: '', position: '', phone: '', email: '', chat_id: '' });
  const [br, setBr] = useState({ branch_name: 'สำนักงานใหญ่', address: '' });
  const [tagIds, setTagIds] = useState([]);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = id => setTagIds(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);
  async function save() {
    if (!f.name) return setErr('กรุณากรอกชื่อกิจการ');
    try {
      await api('/customers', { method: 'POST', body: { ...f, owner_user_id: f.owner_user_id || null, owner_team_id: f.owner_team_id || null,
        contacts: ct.name ? [{ ...ct, is_primary: true, chat_channel_id: ct.chat_id ? 1 : null }] : [], branches: br.address ? [{ ...br, province: f.province, district: f.district, is_registered: true }] : [], tag_ids: tagIds } });
      onSaved();
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>สร้างลูกค้าใหม่</h3>
      <div className="row"><div><label>ชื่อกิจการ *</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div><div><label>รหัสอ้างอิง</label><input value={f.ref_code} onChange={e => set('ref_code', e.target.value)} /></div></div>
      <div className="row"><div><label>เลขผู้เสียภาษี</label><input value={f.tax_id} onChange={e => set('tax_id', e.target.value)} /></div><div><label>เบอร์โทร</label><input value={f.phone} onChange={e => set('phone', e.target.value)} /></div><div><label>อีเมล</label><input value={f.email} onChange={e => set('email', e.target.value)} /></div></div>
      <div className="row"><div><label>จังหวัด</label><input value={f.province} onChange={e => set('province', e.target.value)} /></div>
        <div><label>ความสำคัญ</label><select value={f.priority_id} onChange={e => set('priority_id', +e.target.value)}>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'][p - 1]}</option>)}</select></div>
        <div><label>สถานะ</label><select value={f.lifecycle_stage} onChange={e => set('lifecycle_stage', e.target.value)}>{Object.entries(LIFE).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div></div>
      <div className="row"><div><label>ทีม</label><select value={f.owner_team_id} onChange={e => set('owner_team_id', e.target.value)}><option value="">-</option>{meta.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label>ผู้รับผิดชอบ</label><select value={f.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}><option value="">-</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div></div>
      <h4>ผู้ติดต่อหลัก</h4>
      <div className="row"><div><label>ชื่อ</label><input value={ct.name} onChange={e => setCt({ ...ct, name: e.target.value })} /></div><div><label>ตำแหน่ง</label><input value={ct.position} onChange={e => setCt({ ...ct, position: e.target.value })} /></div><div><label>เบอร์โทร</label><input value={ct.phone} onChange={e => setCt({ ...ct, phone: e.target.value })} /></div></div>
      <h4>สาขา/ที่อยู่</h4>
      <div className="row"><div><label>ชื่อสาขา</label><input value={br.branch_name} onChange={e => setBr({ ...br, branch_name: e.target.value })} /></div><div><label>ที่อยู่</label><input value={br.address} onChange={e => setBr({ ...br, address: e.target.value })} /></div></div>
      <label>แท็กลูกค้า</label><div>{meta.tags.map(t => <span key={t.id} className={'chip' + (tagIds.includes(t.id) ? ' on' : '')} onClick={() => toggle(t.id)}>{t.name}</span>)}</div>
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn ghost" onClick={onClose}>ยกเลิก</button><button className="btn green" onClick={save}>บันทึก</button></div>
    </div></div>
  );
}
