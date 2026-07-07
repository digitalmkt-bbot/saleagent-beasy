import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [ctags, setCtags] = useState([]);
  const [atags, setAtags] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stages, setStages] = useState([]);
  const [lk, setLk] = useState({});
  function load() {
    api('/tags', { params: { scope: 'customer' } }).then(r => setCtags(r.rows)).catch(() => {});
    api('/tags', { params: { scope: 'activity' } }).then(r => setAtags(r.rows)).catch(() => {});
    api('/meta/users').then(r => setUsers(r.rows)).catch(() => {});
    api('/meta/teams').then(r => setTeams(r.rows)).catch(() => {});
    api('/meta/pipeline-stages').then(r => setStages(r.rows)).catch(() => {});
    api('/meta/lookups').then(setLk).catch(() => {});
  }
  useEffect(() => { load(); }, []);
  async function addTag(scope) { const name = prompt('ชื่อแท็กใหม่'); if (!name) return; await api('/tags', { method: 'POST', body: { name, scope, tag_group: scope === 'customer' ? 'other' : null } }); load(); }
  const groups = ctags.reduce((a, t) => { (a[t.tag_group || 'อื่น ๆ'] = a[t.tag_group || 'อื่น ๆ'] || []).push(t); return a; }, {});
  const gLabel = { source: 'แหล่งที่มา', type: 'ประเภทลูกค้า', grade: 'เกรดลูกค้า', other: 'อื่น ๆ' };
  return (
    <div>
      <h1 className="page">ตั้งค่า</h1>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>ไปป์ไลน์การขาย (8 ขั้น)</h3><ol>{stages.map(s => <li key={s.id}>{s.name}{s.is_won && <span className="pill green" style={{ marginLeft: 8 }}>ปิดการขาย</span>}</li>)}</ol></div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>ทีม & ผู้ใช้งาน</h3>
          {teams.map(t => <div key={t.id} style={{ marginBottom: 8 }}><b>{t.name}</b><div className="muted">{users.filter(u => u.team_id === t.id).map(u => u.display_name + ' (' + u.role + ')').join(', ')}</div></div>)}</div>
      </div>
      <div className="panel"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ marginTop: 0 }}>แท็กลูกค้า</h3><button className="btn ghost sm" onClick={() => addTag('customer')}>+ เพิ่มแท็ก</button></div>
        {Object.entries(groups).map(([g, ts]) => <div key={g} style={{ marginBottom: 10 }}><div className="muted">{gLabel[g] || g}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ts.map(t => <span key={t.id} className="pill blue">{t.name}</span>)}</div></div>)}</div>
      <div className="panel"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ marginTop: 0 }}>แท็กกิจกรรม</h3><button className="btn ghost sm" onClick={() => addTag('activity')}>+ เพิ่มแท็ก</button></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{atags.map(t => <span key={t.id} className="pill orange">{t.name}</span>)}</div></div>
      <div className="panel"><h3 style={{ marginTop: 0 }}>ค่าตั้งต้นอื่น ๆ</h3>
        <div className="muted">วิธีการติดต่อ: {(lk.contact_method || []).map(m => m.name).join(', ')}</div>
        <div className="muted">ประเภทงานติดตาม: {(lk.activity_types || []).join(', ')}</div>
        <div className="muted">ประเภทโครงการ: {(lk.project_type || []).map(t => t.name).join(', ')}</div></div>
    </div>
  );
}
