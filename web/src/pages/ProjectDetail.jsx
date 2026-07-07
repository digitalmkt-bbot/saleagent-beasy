import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, baht } from '../api.js';
import { Stars } from '../lib.jsx';
import { TL } from './CustomerDetail.jsx';

export default function ProjectDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const [p, setP] = useState(null);
  const [stages, setStages] = useState([]);
  function load() { api('/projects/' + id).then(setP).catch(() => {}); }
  useEffect(() => { load(); api('/meta/pipeline-stages').then(r => setStages(r.rows)).catch(() => {}); }, [id]);
  if (!p) return <div>กำลังโหลด...</div>;
  async function move(dir) { const next = Math.min(8, Math.max(1, (p.stage_seq || 1) + dir)); const st = stages.find(s => s.seq === next); if (st) { await api('/projects/' + id, { method: 'PUT', body: { stage_id: st.id, is_open: next < 8 } }); load(); } }
  return (
    <div>
      <span className="back" onClick={() => nav('/projects')}>← กลับรายการโครงการ</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page" style={{ margin: 0 }}>{p.name}</h1>
        <span>{p.stage_seq > 1 && <button className="btn ghost sm" onClick={() => move(-1)}>◀ ถอยขั้น</button>} {p.stage_seq < 8 ? <button className="btn sm" onClick={() => move(1)}>เลื่อนขั้น ▶</button> : <span className="pill green">ปิดการขายแล้ว</span>}</span>
      </div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>ข้อมูลโครงการ</h3><table><tbody>
          <tr><td className="muted">รหัส</td><td>{p.code}</td></tr>
          <tr><td className="muted">ลูกค้า</td><td><a onClick={() => nav('/customers/' + p.customer_id)}>{p.customer_name}</a></td></tr>
          <tr><td className="muted">ประเภท</td><td>{p.type_name || '-'}</td></tr>
          <tr><td className="muted">มูลค่า</td><td>{baht(p.estimated_value)}</td></tr>
          <tr><td className="muted">ระยะเวลา</td><td>{(p.start_date || '').slice(0, 10)} - {(p.end_date || '').slice(0, 10)}</td></tr>
          <tr><td className="muted">ความสำคัญ</td><td><Stars n={p.priority_id} /></td></tr>
          <tr><td className="muted">สถานะ</td><td><span className={'pill ' + (p.is_open ? 'blue' : 'green')}>{p.stage_seq}. {p.stage_name}</span></td></tr>
          <tr><td className="muted">ผู้รับผิดชอบ / ทีม</td><td>{p.owner_name} · {p.team_name}</td></tr>
          <tr><td className="muted">บันทึก</td><td>{p.note || '-'}</td></tr>
        </tbody></table></div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>ไปป์ไลน์</h3>
          {stages.map(s => <div className="stage" key={s.id}><div style={{ width: 20 }}>{s.seq < p.stage_seq ? '✅' : s.seq === p.stage_seq ? '🔵' : '⚪'}</div><div style={{ fontSize: 13, fontWeight: s.seq === p.stage_seq ? 700 : 400 }}>{s.name}</div></div>)}
          <h3>ลูกค้าที่เกี่ยวข้อง</h3><div className="muted">{(p.related || []).length ? p.related.map(r => r.customer_name).join(', ') : '-'}</div></div>
      </div>
      <div className="panel"><h3 style={{ marginTop: 0 }}>Timeline กิจกรรม ({p.activities.length})</h3>
        {p.activities.map(a => <TL key={a.id} a={a} />)}
        {!p.activities.length && <div className="muted">ยังไม่มีกิจกรรม</div>}</div>
    </div>
  );
}
