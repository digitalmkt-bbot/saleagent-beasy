// xls.js — สร้างไฟล์ Excel แบบ SpreadsheetML (.xls) โดยไม่ต้องพึ่ง dependency
// Excel/Google Sheets เปิดได้ รองรับหลายชีท + หัวตารางมีสไตล์
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\r?\n/g, '&#10;');
}
function cell(v) {
  if (typeof v === 'number' && isFinite(v))
    return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
}
function headerCell(v) { return `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(v)}</Data></Cell>`; }

// sheets = [{ name, headers:[...], rows:[[...],...], title? }]
function buildWorkbook(sheets) {
  const body = sheets.map(sh => {
    const rows = [];
    if (sh.title) rows.push(`<Row><Cell ss:StyleID="title"><Data ss:Type="String">${esc(sh.title)}</Data></Cell></Row><Row></Row>`);
    if (sh.headers) rows.push(`<Row>${sh.headers.map(headerCell).join('')}</Row>`);
    for (const r of (sh.rows || [])) rows.push(`<Row>${r.map(cell).join('')}</Row>`);
    const name = esc(sh.name).slice(0, 31).replace(/[\\/?*\[\]:]/g, ' ');
    return `<Worksheet ss:Name="${name}"><Table>${rows.join('')}</Table></Worksheet>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Tahoma" ss:Size="10"/></Style>
  <Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Tahoma"/><Interior ss:Color="#FF6B35" ss:Pattern="Solid"/></Style>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="13" ss:FontName="Tahoma"/></Style>
 </Styles>
 ${body}
</Workbook>`;
}

module.exports = { buildWorkbook };
