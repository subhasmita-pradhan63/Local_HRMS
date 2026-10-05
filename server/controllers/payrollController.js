const db = require('../db');
const { sendJson, sendError } = require('../utils/http');
const { generatePayslipPdf } = require('../utils/pdfGenerator');

async function listPayrollHistory(req, res, query) {
  const search = (query.search || '').trim();
  const department = (query.department || '').trim();
  const month = parseInt(query.month, 10);
  const year = parseInt(query.year, 10);

  const conditions = [];
  const binds = {};

  if (search) {
    conditions.push('(LOWER(e.employee_code) LIKE :search OR LOWER(e.full_name) LIKE :search)');
    binds.search = `%${search.toLowerCase()}%`;
  }
  if (department) {
    conditions.push('LOWER(e.department) = LOWER(:department)');
    binds.department = department;
  }
  if (month) { conditions.push('p.pay_month = :month'); binds.month = month; }
  if (year) { conditions.push('p.pay_year = :year'); binds.year = year; }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await db.execute(
      `SELECT p.payroll_id, p.employee_code, e.full_name, e.department, e.designation,
              p.pay_month, p.pay_year, p.total_earnings, p.total_deductions, p.net_salary, p.uploaded_at
       FROM payroll p
       JOIN employees e ON e.employee_id = p.employee_id
       ${whereClause}
       ORDER BY p.pay_year DESC, p.pay_month DESC, e.employee_code`,
      binds
    );
    sendJson(res, 200, { success: true, records: result.rows });
  } catch (err) {
    console.error('[payroll] history error', err);
    sendError(res, 500, 'Failed to fetch payroll history.');
  }
}

async function downloadPayslip(req, res, payrollId) {
  try {
    const result = await db.execute(
      `SELECT p.*, e.full_name, e.department, e.designation, e.employee_code AS emp_code,
              e.bank_account, e.bank_name, e.ifsc_code, e.pan_no
       FROM payroll p
       JOIN employees e ON e.employee_id = p.employee_id
       WHERE p.payroll_id = :id`,
      { id: payrollId }
    );
    if (!result.rows.length) return sendError(res, 404, 'Payroll record not found.');
    const p = result.rows[0];
    const emp = {
      EMPLOYEE_CODE: p.EMP_CODE,
      FULL_NAME: p.FULL_NAME,
      DEPARTMENT: p.DEPARTMENT,
      DESIGNATION: p.DESIGNATION,
      BANK_ACCOUNT: p.BANK_ACCOUNT,
      BANK_NAME: p.BANK_NAME,
      IFSC_CODE: p.IFSC_CODE,
      PAN_NO: p.PAN_NO
    };

    const fileName = `Payslip_${p.EMP_CODE}_${p.PAY_MONTH}_${p.PAY_YEAR}.pdf`;
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`
    });
    generatePayslipPdf(p, emp, res);
  } catch (err) {
    console.error('[payroll] payslip error', err);
    sendError(res, 500, 'Failed to generate payslip PDF.');
  }
}

async function deletePayrollRecord(req, res, payrollId) {
  try {
    const result = await db.execute(
      `DELETE FROM payroll WHERE payroll_id = :id`,
      { id: payrollId },
      {},
      true
    );
    if (result.rowsAffected === 0) return sendError(res, 404, 'Payroll record not found.');
    sendJson(res, 200, { success: true });
  } catch (err) {
    console.error('[payroll] delete record error', err);
    sendError(res, 500, 'Failed to delete payroll record.');
  }
}

async function dashboardSummary(req, res) {
  try {
    const [empCount, activeCount, payrollCount, latestPeriod, deptBreakdown] = await Promise.all([
      db.execute(`SELECT COUNT(*) AS cnt FROM employees`),
      db.execute(`SELECT COUNT(*) AS cnt FROM employees WHERE status = 'ACTIVE'`),
      db.execute(`SELECT COUNT(*) AS cnt FROM payroll`),
      db.execute(`SELECT pay_month, pay_year, COUNT(*) AS cnt, SUM(net_salary) AS total
                   FROM payroll WHERE pay_year = (SELECT MAX(pay_year) FROM payroll)
                   AND pay_month = (SELECT MAX(pay_month) FROM payroll WHERE pay_year = (SELECT MAX(pay_year) FROM payroll))
                   GROUP BY pay_month, pay_year`),
      db.execute(`SELECT department, COUNT(*) AS cnt FROM employees GROUP BY department`)
    ]);

    sendJson(res, 200, {
      success: true,
      totalEmployees: empCount.rows[0].CNT,
      activeEmployees: activeCount.rows[0].CNT,
      totalPayrollRecords: payrollCount.rows[0].CNT,
      latestPeriod: latestPeriod.rows[0] || null,
      departmentBreakdown: deptBreakdown.rows
    });
  } catch (err) {
    console.error('[dashboard] summary error', err);
    sendError(res, 500, 'Failed to fetch dashboard summary.');
  }
}

module.exports = { listPayrollHistory, downloadPayslip, deletePayrollRecord, dashboardSummary };
