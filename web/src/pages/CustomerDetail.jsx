import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, baht } from '../api.js';
import { LIFE, DIR, Stars, Img} from '../lib.jsx';
import { useI18n } from '../i18n.jsx';
import ContractWizard from '../contract-wizard';

export default function CustomerDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const { t } = useI18n();
  const [c, setC] = useState(null);
  const [allotment, setAllotment] = useState(null);
  const [allotmentErr, setAllotmentErr] = useState(null);
  const [allotmentLoading, setAllotmentLoading] = useState(false);
  const [contract, setContract] = useState(null);

  useEffect(() => { api('/customers/' + id).then(setC).catch(() => {}); }, [id]);

  useEffect(() => {
    if (!c?.ref_code) return;
    setAllotmentLoading(true);
    setAllotment(null); setAllotmentErr(null);
    api('/rates/contract/' + encodeURIComponent(c.ref_code))
      .then(d => { setAllotment(d); })
      .catch(e => { setAllotmentErr(e.message || 'ไม่พบข้อมูลในระบบ allotment'); })
      .finally(() => setAllotmentLoading(false));
  }, [c?.ref_code]);

  if (!c) return <div>{t('กำลังโหลด...')}</div>;
  const l = LIFE[c.lifecycle_stage] || ['-', 'gray'];
  const rt = allotment?.rateType;
  const aa = allotment?.agent;
  return (
    <div>
      <span className="back" onClick={() => nav('/customers')}>{t('← กลับรายการเอเจ้นท์')}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page" style={{ margin: 0 }}>{c.name}</h1>
        <button className="btn" disabled={allotmentLoading}
          onClick={() => {
            if (!c.ref_code) { alert(t('เอเจ้นท์นี้ไม่มีรหัสอ้างอิงที่ตรงกับระบบ rate')); return; }
            if (allotmentErr) { alert(allotmentErr); return; }
            if (allotment) setContract(allotment);
          }}>
          {allotmentLoading ? '...' : '📄 ' + t('ออกสัญญา')}
        </button>
      </div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ข้อมูลเอเจ้นท์')}</h3><table><tbody>
          <tr><td className="muted">{t('สถานะ')}</td><td><span className={'pill ' + l[1]}>{t(l[0])}</span></td></tr>
          <tr><td className="muted">{t('รหัสอ้างอิง')}</td><td>{c.ref_code || '-'}</td></tr>
          <tr><td className="muted">{t('เลขผู้เสียภาษี')}</td><td>{c.tax_id || '-'}</td></tr>
          <tr><td className="muted">{t('โทร / อีเมล')}</td><td>{c.phone || '-'} · {c.email || '-'}</td></tr>
          <tr><td className="muted">{t('ที่ตั้ง')}</td><td>{c.address || [c.district, c.province].filter(Boolean).join(', ') || '-'}</td></tr>
          <tr><td className="muted">{t('ความสำคัญ')}</td><td><Stars n={c.priority_id} /></td></tr>
          <tr><td className="muted">{t('ผู้รับผิดชอบ / ทีม')}</td><td>{c.owner_name} · {c.team_name}</td></tr>
          <tr><td className="muted">{t('แท็ก')}</td><td>{(c.tags || []).map(x => <span key={x.id} className="pill blue">{x.name}</span>)}</td></tr>
        </tbody></table></div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ผู้ติดต่อ')} ({c.contacts.length})</h3>
          {c.contacts.map(ct => <div key={ct.id} style={{ padding: '6px 0', borderBottom: '1px solid #eef' }}>{ct.is_primary && <span className="pill green">{t('หลัก')}</span>} <b>{ct.name}</b> — {ct.position}<div className="muted">{ct.phone} · {ct.email}</div></div>)}
          <h3>{t('สาขา/ที่อยู่')} ({c.branches.length})</h3>
          {c.branches.map(b => <div key={b.id} className="muted" style={{ padding: '4px 0' }}>{b.branch_name}: {b.address} {b.province}</div>)}
        </div>
      </div>

      {/* Allotment match panel */}
      {c.ref_code && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>
            {t('ข้อมูล Allotment')}
            {' '}
            {allotmentLoading && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{t('กำลังโหลด...')}</span>}
            {allotment && <span className="pill green">matched</span>}
            {allotmentErr && <span className="pill" style={{ background: '#fee', color: '#c00' }}>ไม่พบ</span>}
          </h3>
          {allotment && (
            <table><tbody>
              <tr><td className="muted">{t('Rate Type')}</td><td>{rt ? <><b>{rt.code}</b> — {rt.name}</> : '—'}</td></tr>
              {rt?.validFrom && <tr><td className="muted">{t('ช่วงอัตรา')}</td><td>{rt.validFrom} – {rt.validTo || '…'}</td></tr>}
              <tr><td className="muted">{t('สัญญาเวอร์ชัน')}</td><td>{aa?.contractVersion || '—'}</td></tr>
              {(aa?.contractStart || aa?.contractEnd) && <tr><td className="muted">{t('ระยะสัญญา')}</td><td>{aa.contractStart || '—'} – {aa.contractEnd || '—'}</td></tr>}
              <tr><td className="muted">{t('ชำระ')}</td><td>{aa?.payType ? <>{aa.payType.toUpperCase()} · {t('เครดิต')} {aa.creditDays || 0} {t('วัน')}</> : '—'}</td></tr>
              {aa?.bookingChannel?.method && <tr><td className="muted">{t('ช่องทางบุ๊กกิ้ง')}</td><td>{aa.bookingChannel.method}</td></tr>}
            </tbody></table>
          )}
          {allotmentErr && <div style={{ color: '#c00', fontSize: 13 }}>{allotmentErr}</div>}
        </div>
      )}

      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('กลุ่มเป้าหมายของเอเจ้นท์')} ({c.projects.length})</h3>
        <table><thead><tr><th>{t('รหัส')}</th><th>{t('กลุ่มเป้าหมาย')}</th><th>{t('สถานะ')}</th><th>{t('มูลค่า')}</th></tr></thead>
          <tbody>{c.projects.map(p => <tr key={p.id}><td>{p.code}</td><td><a onClick={() => nav('/projects/' + p.id)}>{p.name}</a></td><td><span className={'pill ' + (p.is_open ? 'blue' : 'green')}>{p.stage_seq}. {p.stage_name}</span></td><td>{baht(p.estimated_value)}</td></tr>)}
            {!c.projects.length && <tr><td colSpan="4" className="muted">{t('ยังไม่มีกลุ่มเป้าหมาย')}</td></tr>}</tbody></table></div>
      <div className="panel"><h3 style={{ marginTop: 0 }}>Timeline {t('งานติดตาม')} ({c.activities.length})</h3>
        {c.activities.map(a => <TL key={a.id} a={a} />)}
        {!c.activities.length && <div className="muted">{t('ยังไม่มีกิจกรรม')}</div>}</div>
      {contract && <ContractWizard
        agent={contract.agent}
        rateType={contract.rateType}
        routes={contract.routes || []}
        getSales={(sid) => (contract.sales || {})[sid] || null}
        onClose={() => setContract(null)}
      />}
    </div>
  );
}
export function TL({ a }) {
  const { t } = useI18n();
  const d = DIR[a.direction] || ['-', 'gray'];
  return <div className="tl"><div style={{ fontSize: 13, color: '#556' }}><b>{(a.activity_at || '').slice(0, 10)} {a.activity_time || ''}</b> · <span className={'pill ' + d[1]}>{t(d[0])}</span> · {a.method_name} · <span className={'pill ' + (a.status === 'done' ? 'green' : 'orange')}>{a.status === 'done' ? t('เสร็จสิ้น') : t('รอ')}</span></div>
    <div style={{ margin: '5px 0' }}>{a.detail}</div>{(a.tags || []).map((x, i) => <span key={i} className="pill orange">{x}</span>)}{a.image_url && <div style={{ marginTop: 6 }}><Img src={a.image_url} h={90} /></div>}</div>;
}
