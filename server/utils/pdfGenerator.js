const PDFDocument = require('pdfkit');
const { amountInWords } = require('./numberToWords');

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const COLOR_PRIMARY = '#1F4E79';
const COLOR_LIGHT = '#EAF1F8';
const COLOR_GREY = '#666666';
const COLOR_LINE = '#CCCCCC';

function money(n) {
  const num = Number(n) || 0;
  return 'Rs.' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
}

/**
 * Streams a payslip PDF for one payroll record to the given writable stream (res).
 * `p` = payroll row (DB column names as keys), `emp` = employee row.
 * All positioning uses explicit x/y coordinates and an explicit cursorY that
 * is advanced manually after each block, to avoid pdfkit's implicit cursor
 * getting out of sync with rect() fills (which do not move the cursor).
 */
function generatePayslipPdf(p, emp, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let y = doc.page.margins.top;

  // ---------- Header banner ----------
  doc.rect(left, y, pageWidth, 58).fill(COLOR_PRIMARY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16)
    .text(process.env.COMPANY_NAME || 'INOVAANTAGE SYSTEMS PVT LTD', left + 14, y + 10);
  doc.font('Helvetica').fontSize(9)
    .text(process.env.COMPANY_TAGLINE || 'Stay Digitally Ahead With Us', left + 14, y + 30);
  doc.fontSize(8)
    .text(`${process.env.COMPANY_EMAIL || ''}    ${process.env.COMPANY_WEBSITE || ''}`, left + 14, y + 43);
  doc.fillColor('#000000');
  y += 58 + 14;

  // ---------- Title row ----------
  const periodLabel = `${MONTH_NAMES[p.PAY_MONTH]} ${p.PAY_YEAR}`.toUpperCase();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR_PRIMARY)
    .text(`SALARY SLIP — ${periodLabel}`, left, y);
  doc.font('Helvetica').fontSize(8).fillColor(COLOR_GREY)
    .text(`Generated: ${fmtDate(new Date())}`, left, y + 2, { width: pageWidth, align: 'right' });
  doc.fillColor('#000000');
  y += 26;

  // ---------- Employee details ----------
  y = sectionTitle(doc, 'EMPLOYEE DETAILS', left, y, pageWidth);
  const col1 = left + 4, col2 = left + pageWidth / 2 + 4;
  const rowH = 18;
  const details = [
    ['Employee Code', emp.EMPLOYEE_CODE, 'Name', emp.FULL_NAME],
    ['Department', emp.DEPARTMENT || '-', 'Designation', emp.DESIGNATION || '-'],
    ['Bank A/C', emp.BANK_ACCOUNT || '-', 'Bank', emp.BANK_NAME || '-'],
    ['IFSC', emp.IFSC_CODE || '-', 'PAN No', emp.PAN_NO || '-'],
    ['Period', periodLabel, '', '']
  ];
  doc.fontSize(9);
  details.forEach((row) => {
    doc.font('Helvetica-Bold').text(row[0], col1, y, { width: 100 });
    doc.font('Helvetica').text(String(row[1] ?? '-'), col1 + 100, y, { width: pageWidth / 2 - 110 });
    doc.font('Helvetica-Bold').text(row[2], col2, y, { width: 90 });
    doc.font('Helvetica').text(String(row[3] ?? '-'), col2 + 90, y, { width: pageWidth / 2 - 100 });
    y += rowH;
  });
  y += 10;

  // ---------- Attendance summary ----------
  y = sectionTitle(doc, 'ATTENDANCE SUMMARY', left, y, pageWidth);
  const attendance = [
    ['WORKING DAYS', p.WORKING_DAYS],
    ['PRESENT', p.PRESENT_DAYS],
    ['ABSENT', p.ABSENT_DAYS],
    ['PAID LEAVE', p.PAID_LEAVE_DAYS],
    ['LOP DAYS', p.LOP_DAYS],
    ['HALF DAYS', p.HALF_DAYS],
    ['LATE MARKS', p.LATE_MARKS],
    ['OT HOURS', p.OT_HOURS]
  ];
  const cellW = pageWidth / 4;
  const cellH = 42;
  attendance.forEach((item, i) => {
    const cx = left + (i % 4) * cellW;
    const cy = y + Math.floor(i / 4) * cellH;
    doc.rect(cx, cy, cellW - 6, cellH - 6).stroke(COLOR_LINE);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR_PRIMARY)
      .text(String(item[1] ?? 0), cx, cy + 8, { width: cellW - 6, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(COLOR_GREY)
      .text(item[0], cx, cy + 26, { width: cellW - 6, align: 'center' });
  });
  doc.fillColor('#000000');
  y += 2 * cellH + 10;

  // ---------- Earnings / Deductions ----------
  // Built dynamically so both the original simple salary template and the
  // richer company salary-sheet columns render correctly — a line item is
  // only shown if the uploaded sheet actually had a value for it.
  const tableColW = pageWidth / 2 - 8;

  const earnings = [];
  const addEarn = (label, val) => { if (Number(val)) earnings.push([label, val]); };
  addEarn('Basic Salary', p.BASIC_SALARY);
  addEarn('HRA', p.HRA);
  addEarn('DA', p.DA);
  addEarn('Conveyance', p.CONVEYANCE);
  addEarn('Medical Allowance', p.MEDICAL_ALLOWANCE);
  addEarn('Special Allowance', p.SPECIAL_ALLOWANCE);
  addEarn('Professional Development', p.PROFESSIONAL_DEVELOPMENT);
  addEarn('Other Allowance', p.OTHER_ALLOWANCE);
  addEarn('Food Allowance', p.FOOD_ALLOWANCE);
  addEarn('Bonus', p.BONUS);
  addEarn('Other Earnings', p.OTHER_EARNINGS);
  // Fallback: if the sheet had no recognized components at all but did
  // provide a Total Earnings figure, still show that total.
  if (!earnings.length) addEarn('Earnings', p.TOTAL_EARNINGS);

  const deductions = [];
  const addDed = (label, val) => { if (Number(val)) deductions.push([label, val]); };
  addDed('Provident Fund (EPF)', p.PROVIDENT_FUND);
  addDed('ESI', p.ESI);
  addDed('Professional Tax (PT)', p.PROFESSIONAL_TAX);
  addDed('Income Tax (TDS)', p.INCOME_TAX);
  addDed('Other Deductions', p.OTHER_DEDUCTIONS);
  if (!deductions.length) addDed('Deductions', p.TOTAL_DEDUCTIONS);

  const earnBottom = drawAmountTable(doc, left, y, tableColW, 'EARNINGS', earnings, 'Total Earnings', p.TOTAL_EARNINGS);
  const dedBottom = drawAmountTable(doc, left + tableColW + 16, y, tableColW, 'DEDUCTIONS', deductions, 'Total Deductions', p.TOTAL_DEDUCTIONS);
  y = Math.max(earnBottom, dedBottom) + 10;

  // ---------- Gross Salary adjustments (only shown when the sheet had them) ----------
  const hasAdjustments = Number(p.EMPLOYER_CONTRIBUTION) || Number(p.LOP_AMOUNT);
  if (hasAdjustments && Number(p.GROSS_SALARY)) {
    doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_GREY);
    const parts = [];
    if (Number(p.EMPLOYER_CONTRIBUTION)) parts.push(`Less Employer Contribution: ${money(p.EMPLOYER_CONTRIBUTION)}`);
    if (Number(p.LOP_AMOUNT)) parts.push(`Less LOP: ${money(p.LOP_AMOUNT)}`);
    doc.text(`${parts.join('   |   ')}   =>   Gross Salary: ${money(p.GROSS_SALARY)}`, left, y, { width: pageWidth });
    doc.fillColor('#000000');
    y += 16;
  }
  y += 4;

  // ---------- Net salary payable ----------
  const netBoxH = 50;
  doc.rect(left, y, pageWidth, netBoxH).fill(COLOR_PRIMARY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12)
    .text('NET SALARY PAYABLE', left + 14, y + 10);
  doc.font('Helvetica').fontSize(9)
    .text(`In Words: ${amountInWords(p.NET_SALARY)}`, left + 14, y + 30, { width: pageWidth - 200 });
  doc.font('Helvetica-Bold').fontSize(17)
    .text(money(p.NET_SALARY), left, y + 14, { width: pageWidth - 16, align: 'right' });
  doc.fillColor('#000000');
  y += netBoxH + 14;

  if (p.REMARKS) {
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(COLOR_GREY)
      .text(`Remarks: ${p.REMARKS}`, left, y, { width: pageWidth });
    doc.fillColor('#000000');
    y += 16;
  }
  y += 26;

  // ---------- Signatures ----------
  doc.moveTo(left, y).lineTo(left + 180, y).stroke(COLOR_LINE);
  doc.moveTo(left + pageWidth - 180, y).lineTo(left + pageWidth, y).stroke(COLOR_LINE);
  doc.font('Helvetica').fontSize(9)
    .text('Employee Signature', left, y + 5, { width: 180 });
  doc.text('Authorized Signatory', left + pageWidth - 180, y + 5, { width: 180, align: 'right' });

  doc.font('Helvetica').fontSize(7.5).fillColor(COLOR_GREY)
    .text('Computer-generated payslip — valid without signature | Inovaantage Systems Pvt Ltd | Confidential',
      left, doc.page.height - doc.page.margins.bottom - 12, { width: pageWidth, align: 'center' });

  doc.end();
}

/** Draws a light section title bar and returns the y position right below it. */
function sectionTitle(doc, title, left, y, width) {
  doc.rect(left, y, width, 18).fill(COLOR_LIGHT);
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(9.5)
    .text(title, left + 6, y + 4);
  doc.fillColor('#000000');
  return y + 24;
}

/** Draws an earnings/deductions table starting at (x, y). Returns the bottom y coordinate. */
function drawAmountTable(doc, x, y, width, title, rows, totalLabel, totalValue) {
  doc.rect(x, y, width, 18).fill(COLOR_LIGHT);
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(9.5).text(title, x + 6, y + 4);
  doc.fillColor('#000000');
  let ry = y + 24;
  doc.font('Helvetica').fontSize(9);
  rows.forEach(([label, value]) => {
    doc.text(label, x + 4, ry, { width: width - 90 });
    doc.text(money(value), x + width - 90, ry, { width: 86, align: 'right' });
    ry += 16;
  });
  doc.moveTo(x, ry + 2).lineTo(x + width, ry + 2).stroke(COLOR_LINE);
  ry += 8;
  doc.font('Helvetica-Bold');
  doc.text(totalLabel, x + 4, ry, { width: width - 90 });
  doc.text(money(totalValue), x + width - 90, ry, { width: 86, align: 'right' });
  return ry + 16;
}

module.exports = { generatePayslipPdf };
