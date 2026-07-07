import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';

const ST = { open: ['เปิด', 'blue'], invoiced: ['วางบิล', 'orange'], paid: ['ชำระแล้ว', 'green'], cancelled: ['ยกเลิก', 'red'] };
export default function SaleOrders() {
  const [rows, setRows] = useState([]);
  const [quotes, setQuotes] = useState([]);
  function load() { api('/saleorders').then(r => setRows(r.rows)).catch(() => {}); api('/quotations').then(r => setQuotes(r.rows.filter(q => q.status !== 'accepted'))).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function convert(qid) { if (!qid) return; await api('/saleorders/from-quotation/' + qid, { method: 'POST' }); load(); }
  return (
    <div>
      <h1 className="page">ใบสั่งขาย</h1>
      <div className="toolbar">
        <select id="so-q" defaultValue=""><option value="">แปลงจากใบเสนอราคา...</option>{quotes.map(q => <option key={q.id} value={q.id}>{q.code} — {q.customer_name} ({baht(q.grand_total)})</option>)}</select>
        <button className="btn green" onClick={() => convert(document.getElementById('so-q').value)}>+ สร้างใบสั่งขาย</button>
      </div>
      <div className="panel">
        <table><thead><tr><th>เลขที่</th><th>อ้างอิงใบเสนอราคา</th><th>ลูกค้า</th><th>โครงการ</th><th>ยอดรวม</th><th>สถานะ</th><th>วันที่</th></tr></thead>
          <tbody>{rows.map(o => { const s = ST[o.status] || ['-', 'gray']; return <tr key={o.id}><td>{o.code}</td><td>{o.quotation_id ? 'QT#' + o.quotation_id : '-'}</td><td>{o.customer_name}</td><td>{o.project_name}</td><td>{baht(o.grand_total)}</td><td><span className={'pill ' + s[1]}>{s[0]}</span></td><td>{(o.order_date || '').slice(0, 10)}</td></tr>; })}
            {!rows.length && <tr><td colSpan="7" className="muted">ยังไม่มีใบสั่งขาย — เลือกใบเสนอราคาด้านบนเพื่อแปลง</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
