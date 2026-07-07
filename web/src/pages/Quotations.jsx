import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';

const ST = { draft: ['ร่าง', 'gray'], sent: ['ส่งแล้ว', 'blue'], accepted: ['ตอบรับ', 'green'], rejected: ['ปฏิเสธ', 'red'] };
export default function Quotations() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ projects: [], customers: [] });
  const [show, setShow] = useState(false);
  function load() { api('/quotations').then(r => setRows(r.rows)).catch(() => {}); }
  useEffect(() => { load(); Promise.all([api('/projects', { params: { limit: 300 } }), api('/customers', { params: { limit: 300 } })]).then(([p, c]) => setMeta({ projects: p.rows, customers: c.rows })).catch(() => {}); }, []);
  return (
    <div>
      <h1 className="page">ใบเสนอราคา</h1>
      <div className="toolbar"><button className="btn green" onClick={() => setShow(true)}>+ สร้างใบเสนอราคา</button></div>
      <div className="panel">
        <table><thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>โครงการ</th><th>ยอดรวม</th><th>สถานะ</th><th>วันที่</th></tr></thead>
          <tbody>{rows.map(q => { const s = ST[q.status] || ['-', 'gray']; return <tr key={q.id}><td>{q.code}</td><td>{q.customer_name}</td><td>{q.project_name}</td><td>{baht(q.grand_total)}</td><td><span className={'pill ' + s[1]}>{s[0]}</span></td><td>{(q.issue_date || '').slice(0, 10)}</td></tr>; })}
            {!rows.length && <tr><td colSpan="6" className="muted">ยังไม่มีใบเสนอราคา</td></tr>}</tbody></table>
      </div>
      {show && <QModal meta={meta} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}
function QModal({ meta, onClose, onSaved }) {
  const [f, setF] = useState({ project_id: '', customer_id: '', description: '', qty: 1, unit_price: 0, status: 'draft' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  async function save() {
    const sub = (+f.qty || 0) * (+f.unit_price || 0);
    if (!sub) return setErr('กรอกรายการและราคา');
    try { await api('/quotations', { method: 'POST', body: { project_id: f.project_id || null, customer_id: f.customer_id || null, status: f.status, items: [{ description: f.description, qty: f.qty, unit_price: f.unit_price }] } }); onSaved(); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>สร้างใบเสนอราคา</h3>
      <div className="row"><div><label>โครงการ</label><select value={f.project_id} onChange={e => { const p = meta.projects.find(x => String(x.id) === e.target.value); set('project_id', e.target.value); if (p) set('customer_id', p.customer_id); }}><option value="">-</option>{meta.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label>ลูกค้า</label><select value={f.customer_id} onChange={e => set('customer_id', e.target.value)}><option value="">-</option>{meta.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
      <div className="row"><div><label>รายการ</label><input value={f.description} onChange={e => set('description', e.target.value)} placeholder="เช่น แพ็กเกจ 4 เกาะ" /></div>
        <div><label>จำนวน</label><input type="number" value={f.qty} onChange={e => set('qty', e.target.value)} /></div>
        <div><label>ราคา/หน่วย</label><input type="number" value={f.unit_price} onChange={e => set('unit_price', e.target.value)} /></div></div>
      <div className="row"><div><label>สถานะ</label><select value={f.status} onChange={e => set('status', e.target.value)}><option value="draft">ร่าง</option><option value="sent">ส่งแล้ว</option><option value="accepted">ตอบรับ</option></select></div></div>
      <div className="muted" style={{ marginTop: 8 }}>ระบบคำนวณ VAT 7% อัตโนมัติ</div>
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn ghost" onClick={onClose}>ยกเลิก</button><button className="btn green" onClick={save}>บันทึก</button></div>
    </div></div>
  );
}
