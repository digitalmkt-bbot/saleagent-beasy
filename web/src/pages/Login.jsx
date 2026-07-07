import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@loveandaman.com');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await login(email, password); nav('/'); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <div style={{fontSize:24,fontWeight:800,color:'#1F4E79'}}>SaleAgent<span style={{color:'#EEA236'}}>.</span>Beasy</div>
        <div className="muted" style={{marginBottom:16}}>ระบบบริหารงานขาย (Sales CRM)</div>
        <label>อีเมล</label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <label>รหัสผ่าน</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn" style={{width:'100%',marginTop:18}}>เข้าสู่ระบบ</button>
        {err && <div className="err">{err}</div>}
        <div className="muted" style={{marginTop:14}}>ทดลอง: admin@loveandaman.com / password</div>
      </form>
    </div>
  );
}
