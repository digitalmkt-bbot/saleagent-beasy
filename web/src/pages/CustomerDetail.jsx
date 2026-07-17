import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, baht } from '../api.js';
import { LIFE, DIR, Stars, Img } from '../lib.jsx';
import { useI18n } from '../i18n.jsx';
import ContractWizard from '../contract-wizard';

const ZONES = [['PK', 'ภูเก็ต (PK)'], ['KL', 'เขาหลัก (KL)'], ['NoTransfer', 'ไม่รับส่ง']];
const PAX = [
  ['adult-thai', 'ผู้ใหญ่ (ไทย)'], ['adult-fr', 'ผู้ใหญ่ (ต่างชาติ)'],
  ['child-thai', 'เด็ก (ไทย)'], ['child-fr', 'เด็ก (ต่างชาติ)'],
  ['infant-thai', 'ทารก (ไทย)'], ['infant-fr', 'ทารก (ต่างชาติ)'],
];
const QST = { draft: ['ร่าง', 'gray'], accepted: ['ยืนยัน', 'green'], rejected: ['ปฏิเสธ', 'red'], expired: ['หมดอายุ', 'orange'] };
const BKST = { confirmed: ['confirmed', 'green'], pending: ['รอดำเนินการ', 'orange'], cancelled: ['ยกเลิก', 'red'] };

function Field({ label, value, href, span = 1, bold }) {
  return (
    <div style={{ gridColumn: `span ${span}`, background: 'var(--bg, #f9fafb)', borderRadius: 6, padding: '10px 14px', border: '1px solid var(--line, #eef)' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-2, #889)', marginBottom: 4, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: bold ? 600 : 400 }}>
        {href && value ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-text)' }}>{value}</a> : (value || '—')}
      </div>
    </div>
  );
}

function SecHead({ title, sub }) {
  return (
    <div style={{ borderLeft: '3px solid var(--brand, #0B7355)', paddingLeft: 10, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const { t } = useI18n();
  const [c, setC] = useState(null);
  const [allotment, setAllotment] = useState(null);
  const [allotmentErr, setAllotmentErr] = useState(null);
  const [allotmentLoading, setAllotmentLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [tab, setTab] = useState('info');
  const [zone, setZone] = useState('PK');
  const [bookings, setBookings] = useState(null);
  const [bookPage, setBookPage] = useState(1);
  const [bookTotal, setBookTotal] = useState(0);
  const [contracts, setContracts] = useState(null);

  useEffect(() => { api('/customers/' + id).then(setC).catch(() => {}); }, [id]);

  useEffect(() => {
    if (!c?.ref_code) return;
    setAllotmentLoading(true);
    setAllotment(null); setAllotmentErr(null);
    api('/rates/contract/' + encodeURIComponent(c.ref_code))
      .then(d => setAllotment(d))
      .catch(e => setAllotmentErr(e.message || 'ไม่พบข้อมูลในระบบ allotment'))
      .finally(() => setAllotmentLoading(false));
  }, [c?.ref_code]);

  useEffect(() => {
    if (tab !== 'hist' || !c?.ref_code || !allotment) return;
    setBookings(null);
    api('/rates/agent-bookings/' + encodeURIComponent(c.ref_code) + '?page=' + bookPage)
      .then(d => { setBookings(d.rows || []); setBookTotal(d.total || 0); })
      .catch(() => setBookings([]));
  }, [tab, c?.ref_code, allotment, bookPage]);

  useEffect(() => {
    if (tab !== 'contracts' || contracts !== null) return;
    api('/quotations?customer_id=' + id)
      .then(d => setContracts(d.rows || []))
      .catch(() => setContracts([]));
  }, [tab, id, contracts]);

  if (!c) return <div>{t('กำลังโหลด...')}</div>;
  const l = LIFE[c.lifecycle_stage] || ['-', 'gray'];
  const rt = allotment?.rateType;
  const aa = allotment?.agent;

  // Route lookup map from allotment.routes
  const routeMap = {};
  (allotment?.routes || []).forEach(r => { routeMap[r.id] = r; });

  // Seat rate sample from first route
  const seatRouteKeys = Object.keys(rt?.seatRates || {});
  const seatSample = seatRouteKeys[0] ? rt.seatRates[seatRouteKeys[0]]?.PK : null;
  const seatTH = seatSample?.['adult-thai'];
  const seatFR = seatSample?.['adult-fr'];
  const seatSampleRoute = seatRouteKeys[0] ? routeMap[seatRouteKeys[0]]?.name || seatRouteKeys[0] : null;

  // Charter rate sample
  const charterRouteKeys = Object.keys(rt?.charterRates || {});
  const firstCharterRoute = charterRouteKeys[0];
  const charterData = firstCharterRoute ? rt.charterRates[firstCharterRoute] : null;
  const charterType = charterData?.speedboat ? 'speedboat' : charterData?.catamaran ? 'catamaran' : null;
  const charterPrice = charterType ? charterData[charterType].starterPrice : null;
  const charterSampleRoute = firstCharterRoute ? routeMap[firstCharterRoute]?.name || firstCharterRoute : null;

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

      <div className="tabs">
        {[
          ['info', t('ข้อมูล'), null],
          ['prices', 'Pricing Matrix', null],
          ['hist', 'Recent Bookings', null],
          ['contracts', t('สัญญา'), contracts ? contracts.length : null],
          ['activity', t('กิจกรรม'), c.activities.length],
        ].map(([k, label, badge]) => (
          <div key={k} className={'tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>
            {label}{badge != null ? ' (' + badge + ')' : ''}
          </div>
        ))}
      </div>

      {/* ── INFO TAB ── */}
      {tab === 'info' && (
        <>
          {/* CRM: agent info + contacts */}
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

          {/* Allotment loading / error */}
          {c.ref_code && allotmentLoading && <div className="panel"><span className="muted">{t('กำลังโหลดข้อมูล allotment...')}</span></div>}
          {c.ref_code && allotmentErr && !allotment && <div className="panel"><span style={{ color: '#c00', fontSize: 13 }}>{allotmentErr}</span></div>}

          {/* ── ALLOTMENT SECTIONS ── */}
          {allotment && <>

            {/* Programs in Contract */}
            {aa?.programPeriods?.length > 0 && (() => {
              const rateRoutes = rt?.routes || [];
              const coveredIds = new Set(aa.programPeriods.map(p => p.routeId));
              const allCovered = rateRoutes.length > 0 && coveredIds.size >= rateRoutes.length;
              const bookFroms = aa.programPeriods.map(p => p.bookFrom).filter(Boolean).sort();
              const bookTos = aa.programPeriods.map(p => p.bookTo).filter(Boolean).sort();
              const travelTos = aa.programPeriods.map(p => ({ to: p.travelTo, routeId: p.routeId })).filter(x => x.to).sort((a, b) => a.to < b.to ? -1 : 1);
              const latestCutoff = travelTos[travelTos.length - 1];
              return (
                <div className="panel">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                    <SecHead title="Programs in Contract" sub="โปรแกรมในสัญญา · ระบุ Booking Period และ Travel Period แต่ละเส้นทาง" />
                    <span className="muted" style={{ fontSize: 13, marginLeft: 6 }}>{aa.programPeriods.length} programs</span>
                  </div>

                  {rateRoutes.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 6, marginBottom: 12, background: allCovered ? '#f0fff4' : '#fffbeb', border: '1px solid ' + (allCovered ? '#c6f6d5' : '#fbd38d') }}>
                      <span className="pill" style={{ background: 'var(--brand, #0B7355)', color: '#fff', fontSize: 11 }}>{rt?.code}</span>
                      <span style={{ fontSize: 13 }}>{allCovered ? '✓ Programs ครอบคลุมทุก route ใน Rate Type' : '⚠ Programs ยังไม่ครบทุก route'}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{coveredIds.size} / {rateRoutes.length} routes</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 32, marginBottom: 14, fontSize: 13 }}>
                    {bookFroms.length > 0 && <div><div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 3 }}>Contract Validity</div><div>{bookFroms[0]} → {bookTos[bookTos.length - 1] || '—'}</div></div>}
                    {latestCutoff && <div><div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 3 }}>Earliest Travel Cutoff</div><div style={{ color: 'var(--brand-text, #0B7355)' }}>{latestCutoff.to} · {routeMap[latestCutoff.routeId]?.name || latestCutoff.routeId}</div></div>}
                  </div>

                  <table>
                    <thead><tr>
                      <th>PROGRAM · PIER</th>
                      <th>BOOKING PERIOD</th>
                      <th>TRAVEL PERIOD</th>
                    </tr></thead>
                    <tbody>{aa.programPeriods.map((p, i) => {
                      const route = routeMap[p.routeId] || {};
                      const hasRV = (rt?.routeValidity?.[p.routeId] || []).length > 0;
                      return <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand, #0B7355)', display: 'inline-block', flexShrink: 0 }} />
                            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{route.name || p.routeId}</div>{route.pier && <div className="muted" style={{ fontSize: 12 }}>{route.pier}</div>}</div>
                          </div>
                        </td>
                        <td>
                          {(p.bookFrom || p.bookTo)
                            ? <div><div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Booking</div><div style={{ fontSize: 13 }}>{p.bookFrom || '—'} → {p.bookTo || '—'}</div></div>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          {(p.travelFrom || p.travelTo)
                            ? <div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 2 }}>
                                  <span className="muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>Travel</span>
                                  {hasRV && <span className="pill" style={{ fontSize: 10, padding: '1px 5px' }}>RT</span>}
                                </div>
                                <div style={{ fontSize: 13 }}>{p.travelFrom || '—'} → {p.travelTo || '—'}</div>
                              </div>
                            : <span className="muted">—</span>}
                        </td>
                      </tr>;
                    })}</tbody>
                  </table>
                  <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>● Booking Period = ช่วงรับจอง (จองเข้ามาในช่วงนี้) · Travel Period = ช่วงเดินทางจริง</div>
                </div>
              );
            })()}

            {/* Company Information */}
            {(aa?.companyInfo || aa?.market) && (
              <div className="panel">
                <SecHead title="Company Information" sub="ข้อมูลบริษัทคู่สัญญา · Market · Address · ใช้ใน Contract Export" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <Field label="COMPANY NAME (ชื่อในระบบ)" value={aa.name} />
                  <Field label="COMPANY LEGAL NAME (ในสัญญา)" value={aa.companyInfo?.legalName} />
                  <Field label="TAT LICENSE NO." value={aa.companyInfo?.tatLicense} />
                  <Field label="MARKET" value={aa.market} span={2} />
                  <Field label="TAX ID" value={aa.companyInfo?.taxId} />
                  <Field label="ADDRESS" value={aa.companyInfo?.address} span={3} />
                  <Field label="TELEPHONE" value={aa.companyInfo?.tel} />
                  <Field label="HOTLINE" value={aa.companyInfo?.hotline} />
                  <Field label="FAX" value={aa.companyInfo?.fax} />
                  <Field label="WEBSITE" value={aa.companyInfo?.website} href={aa.companyInfo?.website} span={2} />
                  <Field label="EMAIL" value={aa.email} />
                </div>
              </div>
            )}

            {/* Payment Details */}
            {(aa?.payType || aa?.creditLimit != null) && (
              <div className="panel">
                <SecHead title="Payment Details" sub="ประเภทการชำระเงิน · เครดิต · วงเงิน" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ gridColumn: 'span 1', background: 'var(--brand-bg, #e8f5f0)', border: '1px solid var(--brand-line, #b2d8cc)', borderRadius: 6, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--brand-text, #0B7355)', marginBottom: 4, letterSpacing: '0.05em' }}>PAYMENT TYPE</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-text, #0B7355)' }}>
                      {aa.payType ? aa.payType.charAt(0).toUpperCase() + aa.payType.slice(1) : '—'}
                      {aa.creditDays ? <> · {aa.creditDays}d</> : null}
                    </div>
                  </div>
                  <Field label="CREDIT LIMIT" value={aa.creditLimit != null ? baht(aa.creditLimit) : null} bold />
                  <Field label="CREDIT DAYS" value={aa.creditDays != null ? aa.creditDays + ' วัน' : null} />
                </div>
              </div>
            )}

            {/* Rate Type · Pricing Package */}
            {rt && (
              <div className="panel">
                <SecHead title="Rate Type · Pricing Package" sub="ราคาทั้งหมดดึงจาก rate type นี้ · seat / charter / add-ons" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 6, background: 'var(--bg, #f9fafb)', border: '1px solid var(--line, #eef)', marginBottom: 12 }}>
                  <span className="pill" style={{ background: '#1a1a2e', color: '#fff', fontSize: 12 }}>{rt.code}</span>
                  <span style={{ fontWeight: 600 }}>{rt.name}</span>
                  <span className="pill green">ACTIVE</span>
                  <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
                    {seatRouteKeys.length} routes{charterPrice ? ' · charter' : ''}{rt.validTo ? ' · valid until ' + rt.validTo : ''}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ background: 'var(--bg, #f9fafb)', border: '1px solid var(--line, #eef)', borderRadius: 6, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-2, #889)', marginBottom: 4, letterSpacing: '0.05em' }}>SEAT (SAMPLE)</div>
                    {seatTH || seatFR
                      ? <><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-text, #0B7355)' }}>{baht(seatTH)} / {baht(seatFR)}</div><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{seatSampleRoute} · PK · Adult TH/FR</div></>
                      : <span className="muted">—</span>}
                  </div>
                  <div style={{ background: 'var(--bg, #f9fafb)', border: '1px solid var(--line, #eef)', borderRadius: 6, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-2, #889)', marginBottom: 4, letterSpacing: '0.05em' }}>CHARTER (SAMPLE)</div>
                    {charterPrice
                      ? <><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-text, #0B7355)' }}>{baht(charterPrice)}</div><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{charterSampleRoute} · {charterType} · starter {charterData[charterType].starterIncludes} pax{charterData[charterType].extraPerPax ? ' · +' + baht(charterData[charterType].extraPerPax) + ' ea' : ''}</div></>
                      : <span className="muted">—</span>}
                  </div>
                  <div style={{ background: 'var(--bg, #f9fafb)', border: '1px solid var(--line, #eef)', borderRadius: 6, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-2, #889)', marginBottom: 4, letterSpacing: '0.05em' }}>ADD-ON (SAMPLE)</div>
                    <span className="muted">—</span>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Signatory */}
            {aa?.agentSignatory?.name && (
              <div className="panel">
                <SecHead title="Agent Signatory" sub="ผู้เซ็นสัญญาฝั่ง Agent · ใช้ใน Signature Page ตอน Export (ฝั่ง Love Andaman ดึงจาก Sales Person)" />
                <div style={{ background: '#fff8f0', border: '1px solid #fbd38d', borderRadius: 8, padding: '14px 16px' }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>SIGNED FOR {aa.companyInfo?.legalName || aa.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#b7791f' }}>{aa.agentSignatory.name}</div>
                  {aa.agentSignatory.designation && <div style={{ fontSize: 13, color: '#805723', marginTop: 2 }}>{aa.agentSignatory.designation}</div>}
                  {aa.agentSignatory.tel && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{aa.agentSignatory.tel}</div>}
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {aa.agentSignatory.signedDate
                      ? <span className="pill green">เซ็นแล้ว {aa.agentSignatory.signedDate}</span>
                      : <span className="muted">🖊 ยังไม่เซ็น</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Booking Channel */}
            {(aa?.bookingChannel?.method || aa?.bookingChannel?.email || aa?.bookingChannel?.phone) && (
              <div className="panel">
                <SecHead title="Booking Channel" sub="วิธีจองเข้ามา · cutoff time · cancellation policy" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <Field label="BOOKING METHOD" value={aa.bookingChannel.method} />
                  <Field label="CUTOFF TIME" value={aa.bookingChannel.cutoff} />
                  <Field label="CANCELLATION POLICY" value={aa.bookingChannel.cancelPolicy} />
                  <Field label="BOOKING EMAIL" value={aa.bookingChannel.email} href={'mailto:' + aa.bookingChannel.email} span={2} />
                  <Field label="BOOKING PHONE" value={aa.bookingChannel.phone} />
                </div>
              </div>
            )}

          </>}

          {/* CRM: Projects */}
          <div className="panel"><h3 style={{ marginTop: 0 }}>{t('กลุ่มเป้าหมายของเอเจ้นท์')} ({c.projects.length})</h3>
            <table><thead><tr><th>{t('รหัส')}</th><th>{t('กลุ่มเป้าหมาย')}</th><th>{t('สถานะ')}</th><th>{t('มูลค่า')}</th></tr></thead>
              <tbody>{c.projects.map(p => <tr key={p.id}><td>{p.code}</td><td><a onClick={() => nav('/projects/' + p.id)}>{p.name}</a></td><td><span className={'pill ' + (p.is_open ? 'blue' : 'green')}>{p.stage_seq}. {p.stage_name}</span></td><td>{baht(p.estimated_value)}</td></tr>)}
                {!c.projects.length && <tr><td colSpan="4" className="muted">{t('ยังไม่มีกลุ่มเป้าหมาย')}</td></tr>}</tbody></table>
          </div>
        </>
      )}

      {/* ── PRICING MATRIX TAB ── */}
      {tab === 'prices' && (
        <div className="panel">
          {!c.ref_code && <div className="muted">{t('เอเจ้นท์นี้ไม่มีรหัสอ้างอิงในระบบ rate')}</div>}
          {allotmentLoading && <div className="muted">{t('กำลังโหลด...')}</div>}
          {allotmentErr && <div style={{ color: '#c00', fontSize: 13 }}>{allotmentErr}</div>}
          {allotment?.rateType?.seatRates && (() => {
            const sr = allotment.rateType.seatRates;
            const rks = Object.keys(sr);
            return (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span><b>{rt?.code}</b> — {rt?.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{rt?.validFrom} → {rt?.validTo || '…'}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {ZONES.map(([z, lb]) => (
                      <span key={z} className={'dirbtn' + (zone === z ? ' on' : '')} style={{ padding: '6px 12px' }} onClick={() => setZone(z)}>{lb}</span>
                    ))}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead><tr><th>{t('เส้นทาง')}</th>{PAX.map(([k, l]) => <th key={k} style={{ textAlign: 'right' }}>{l}</th>)}</tr></thead>
                    <tbody>{rks.map(rk => {
                      const cell = sr[rk][zone] || {};
                      return <tr key={rk}>
                        <td><b>{(routeMap[rk]?.name || rk).toUpperCase()}</b><div className="muted">{routeMap[rk]?.pier || sr[rk].route_name || ''}</div></td>
                        {PAX.map(([k]) => <td key={k} style={{ textAlign: 'right' }}>{Number(cell[k]) ? baht(cell[k]) : '-'}</td>)}
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── RECENT BOOKINGS TAB ── */}
      {tab === 'hist' && (
        <div className="panel">
          {!c.ref_code && <div className="muted">{t('เอเจ้นท์นี้ไม่มีรหัสอ้างอิงในระบบ rate')}</div>}
          {c.ref_code && allotmentErr && !allotment && <div className="muted">{t('ไม่พบเอเจ้นท์ในระบบ allotment')}</div>}
          {bookings === null && c.ref_code && allotment && <div className="muted">{t('กำลังโหลด...')}</div>}
          {bookings && <>
            <table>
              <thead><tr><th>ID</th><th>{t('สถานะ')}</th><th>{t('วันที่')}</th><th style={{ textAlign: 'right' }}>{t('ยอดรวม')}</th></tr></thead>
              <tbody>
                {bookings.map(b => {
                  const st = BKST[b.status] || [b.status || '-', 'gray'];
                  return <tr key={b.id}>
                    <td className="muted">{b.id}</td>
                    <td><span className={'pill ' + st[1]}>{st[0]}</span></td>
                    <td>{(b.date || '').slice(0, 10)}</td>
                    <td style={{ textAlign: 'right' }}>{b.total ? baht(b.total) : '-'}</td>
                  </tr>;
                })}
                {!bookings.length && <tr><td colSpan="4" className="muted">{t('ยังไม่มีบุ๊กกิ้ง')}</td></tr>}
              </tbody>
            </table>
            {bookTotal > 20 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', alignItems: 'center' }}>
                <button className="btn" disabled={bookPage <= 1} onClick={() => setBookPage(p => p - 1)}>{t('← ก่อนหน้า')}</button>
                <span className="muted">{t('หน้า')} {bookPage} / {Math.ceil(bookTotal / 20)}</span>
                <button className="btn" disabled={bookPage >= Math.ceil(bookTotal / 20)} onClick={() => setBookPage(p => p + 1)}>{t('ถัดไป →')}</button>
              </div>
            )}
          </>}
        </div>
      )}

      {/* ── CONTRACTS TAB ── */}
      {tab === 'contracts' && (
        <div className="panel">
          {contracts === null && <div className="muted">{t('กำลังโหลด...')}</div>}
          {contracts && <table>
            <thead><tr><th>{t('เลขที่')}</th><th>{t('กลุ่มเป้าหมาย')}</th><th>{t('ยอดรวม')}</th><th>{t('สถานะ')}</th><th>{t('วันที่')}</th></tr></thead>
            <tbody>
              {contracts.map(q => {
                const st = QST[q.status] || [q.status || '-', 'gray'];
                return <tr key={q.id}>
                  <td>{q.code}</td>
                  <td>{q.project_name || '-'}</td>
                  <td>{baht(q.grand_total)}</td>
                  <td><span className={'pill ' + st[1]}>{t(st[0])}</span></td>
                  <td>{(q.issue_date || q.created_at || '').slice(0, 10)}</td>
                </tr>;
              })}
              {!contracts.length && <tr><td colSpan="5" className="muted">{t('ยังไม่มีสัญญา')}</td></tr>}
            </tbody>
          </table>}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Timeline {t('งานติดตาม')} ({c.activities.length})</h3>
          {c.activities.map(a => <TL key={a.id} a={a} />)}
          {!c.activities.length && <div className="muted">{t('ยังไม่มีกิจกรรม')}</div>}
        </div>
      )}

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
