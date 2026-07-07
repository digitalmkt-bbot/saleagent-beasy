import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [targets, setTargets] = useState([]);
  useEffect(() => {
    api('/meta/dashboard').then(setD).catch(() => {});
    api('/meta/targets').then(r => setTargets(r.rows)).catch(() => {});
  }, []);
  if (!d) return <div>กำลังโหลด...</div>;
  const maxCnt = Math.max(1, ...d.funnel.map(f => f.cnt));
  const tLabel = { new_customer: 'ลูกค้าใหม่', opportunity: 'โอกาส', sales: 'ยอดขาย', profit: 'กำไร' };
  return (
    <div>
      <h1 className="page">แผงบริหาร</h1>
      <div className="cards">
        <div className="card"><div className="label">ลูกค้าทั้งหมด</div><div className="value">{d.customers.total}</div></div>
        <div className="card"><div className="label">โครงการที่เปิดอยู่</div><div className="value">{d.projects.open}</div></div>
        <div className="card"><div className="label">มูลค่าไปป์ไลน์</div><div className="value" style={{fontSize:20}}>{baht(d.projects.pipeline_value)}</div></div>
        <div className="card"><div className="label">ปิดการขายแล้ว</div><div className="value" style={{fontSize:20}}>{baht(d.projects.won_value)}</div></div>
        <div className="card"><div className="label">งานติดตามค้าง</div><div className="value">{d.activities.pending} <span style={{fontSize:14,color:'#D9534F'}}>({d.activities.overdue} เกินกำหนด)</span></div></div>
      </div>

      <div className="panel">
        <h3 style={{marginTop:0}}>เป้าหมายวันนี้</h3>
        <div className="cards">
          {targets.map(t => {
            const pct = Math.min(100, Math.round((t.actual_value / (t.target_value || 1)) * 100));
            return (
              <div className="card" key={t.id}>
                <div className="label">{tLabel[t.metric] || t.metric}</div>
                <div className="value" style={{fontSize:18}}>{Number(t.actual_value).toLocaleString()} / {Number(t.target_value).toLocaleString()}</div>
                <div style={{background:'#eef1f4',borderRadius:6,height:8,marginTop:8}}>
                  <div style={{width:pct+'%',background:'#4CAE4C',height:8,borderRadius:6}} /></div>
                <div className="muted">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel funnel">
        <h3 style={{marginTop:0}}>ไปป์ไลน์การขาย (โครงการที่เปิดอยู่)</h3>
        {d.funnel.map(f => (
          <div className="stage" key={f.seq}>
            <div style={{width:230,fontSize:13}}>{f.seq}. {f.name}</div>
            <div className="bar" style={{width:(f.cnt / maxCnt * 320) + 40}} />
            <div style={{fontSize:13}}>{f.cnt} · {baht(f.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
