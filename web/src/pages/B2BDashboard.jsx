// หน้า B2B dashboard — ฝังไฟล์ HTML เดิม (vanilla JS + Chart.js) เป็น srcDoc
// iframe แบบ srcdoc ใช้ origin เดียวกับแอป: อ่าน jubili_token จาก localStorage และ fetch /api ได้ตามปกติ
import html from './b2b-dashboard.html?raw';
import InvestIQ from './InvestIQ.jsx';

export default function B2BDashboard() {
  return (
    <div>
      <iframe
        title="B2B Dashboard"
        srcDoc={html}
        style={{ width: '100%', height: 'calc(100vh - 120px)', border: 0, borderRadius: 12, background: '#EEF2F1' }}
      />
      {/* InvestIQ (สไตล์ใหม่ ข้อมูลชุดเดียวกัน) ต่อท้าย */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(26,25,29,.08)' }}>
        <InvestIQ />
      </div>
    </div>
  );
}
