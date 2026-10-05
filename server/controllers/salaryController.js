const fs = require('fs');
const os = require('os');
const formidable = require('formidable');
const db = require('../db');
const { sendJson, sendError } = require('../utils/http');
const { parseSalaryExcel } = require('../utils/excelParser');



function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: 20 * 1024 * 1024, // 20MB
      uploadDir: os.tmpdir(),
      keepExtensions: true
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

// Normalizes a name for matching: lowercase, trim, collapse internal whitespace.
function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const UPSERT_SQL = `
MERGE INTO payroll p
USING (SELECT :employeeId AS employee_id, :payMonth AS pay_month, :payYear AS pay_year FROM dual) src
ON (p.employee_id = src.employee_id AND p.pay_month = src.pay_month AND p.pay_year = src.pay_year)
WHEN MATCHED THEN UPDATE SET
  employee_code = :employeeCode,
  working_days = :workingDays, present_days = :presentDays, absent_days = :absentDays,
  paid_leave_days = :paidLeaveDays, lop_days = :lopDays, half_days = :halfDays,
  late_marks = :lateMarks, ot_hours = :otHours,
  basic_salary = :basicSalary, hra = :hra, da = :da, conveyance = :conveyance,
  medical_allowance = :medicalAllowance, special_allowance = :specialAllowance,
  professional_development = :professionalDevelopment, other_allowance = :otherAllowance,
  food_allowance = :foodAllowance,
  bonus = :bonus, other_earnings = :otherEarnings, total_earnings = :totalEarnings,
  employer_contribution = :employerContribution, lop_amount = :lopAmount, gross_salary = :grossSalary,
  provident_fund = :providentFund, esi = :esi, professional_tax = :professionalTax, income_tax = :incomeTax,
  other_deductions = :otherDeductions, total_deductions = :totalDeductions, net_salary = :netSalary,
  remarks = :remarks,
  source_file = :sourceFile, uploaded_at = SYSTIMESTAMP
WHEN NOT MATCHED THEN INSERT
  (employee_id, employee_code, pay_month, pay_year, working_days, present_days, absent_days,
   paid_leave_days, lop_days, half_days, late_marks, ot_hours, basic_salary, hra, da, conveyance,
   medical_allowance, special_allowance, professional_development, other_allowance, food_allowance,
   bonus, other_earnings, total_earnings,
   employer_contribution, lop_amount, gross_salary,
   provident_fund, esi, professional_tax, income_tax, other_deductions, total_deductions, net_salary,
   remarks, source_file)
VALUES
  (:employeeId, :employeeCode, :payMonth, :payYear, :workingDays, :presentDays, :absentDays,
   :paidLeaveDays, :lopDays, :halfDays, :lateMarks, :otHours, :basicSalary, :hra, :da, :conveyance,
   :medicalAllowance, :specialAllowance, :professionalDevelopment, :otherAllowance, :foodAllowance,
   :bonus, :otherEarnings, :totalEarnings,
   :employerContribution, :lopAmount, :grossSalary,
   :providentFund, :esi, :professionalTax, :incomeTax, :otherDeductions, :totalDeductions, :netSalary,
   :remarks, :sourceFile)
`;

async function uploadSalary(req, res) {
  let fields, files;
  try {
    ({ fields, files } = await parseMultipart(req));
  } catch (err) {
    console.error('[salary] upload parse error', err);
    return sendError(res, 400, 'Failed to read uploaded file.');
  }

  const file = files.file && (Array.isArray(files.file) ? files.file[0] : files.file);
  if (!file) return sendError(res, 400, 'No file uploaded. Attach the salary Excel file as "file".');

  const payMonth = parseInt(Array.isArray(fields.payMonth) ? fields.payMonth[0] : fields.payMonth, 10);
  const payYear = parseInt(Array.isArray(fields.payYear) ? fields.payYear[0] : fields.payYear, 10);
  if (!payMonth || !payYear || payMonth < 1 || payMonth > 12) {
    return sendError(res, 400, 'Valid Pay Month (1-12) and Pay Year are required.');
  }

  let buffer;
  try {
    buffer = fs.readFileSync(file.filepath || file.path);
  } catch (err) {
    return sendError(res, 400, 'Could not read uploaded file from disk.');
  } finally {
    try { fs.unlinkSync(file.filepath || file.path); } catch (e) { /* ignore */ }
  }

  let parsed;
  try {
    parsed = parseSalaryExcel(buffer);
  } catch (err) {
    console.error('[salary] parse error', err);
    return sendError(res, 400, 'Could not read the Excel file. Please confirm it is a valid .xlsx/.xls file.');
  }
  const { rows, errors: parseErrors } = parsed;
  if (!rows.length) {
    return sendError(res, 400, `Could not process file. ${parseErrors.join(' ')}`);
  }

  const matched = [];
  const unmatched = [];

  try {
    await db.withConnection(async (conn) => {
      // Preload all employees so rows can be matched either by Employee
      // Code (if the sheet has one) or by full name (if it only has names).
      const empResult = await conn.execute(`SELECT employee_id, employee_code, full_name FROM employees`);
      const codeToId = {};
      const nameToId = {};
      empResult.rows.forEach((r) => {
        codeToId[String(r.EMPLOYEE_CODE).trim().toLowerCase()] = { id: r.EMPLOYEE_ID, code: r.EMPLOYEE_CODE };
        nameToId[normalizeName(r.FULL_NAME)] = { id: r.EMPLOYEE_ID, code: r.EMPLOYEE_CODE };
      });

      for (const row of rows) {
        let match = null;
        if (row.employee_code) {
          match = codeToId[row.employee_code.trim().toLowerCase()];
        }
        if (!match && row.employee_name) {
          match = nameToId[normalizeName(row.employee_name)];
        }

        const rowLabel = row.employee_code || row.employee_name;
        if (!match) {
          unmatched.push(rowLabel);
          continue;
        }

        await conn.execute(UPSERT_SQL, {
          employeeId: match.id, employeeCode: match.code, payMonth, payYear,
          workingDays: row.working_days, presentDays: row.present_days, absentDays: row.absent_days,
          paidLeaveDays: row.paid_leave_days, lopDays: row.lop_days, halfDays: row.half_days,
          lateMarks: row.late_marks, otHours: row.ot_hours,
          basicSalary: row.basic_salary, hra: row.hra, da: row.da, conveyance: row.conveyance,
          medicalAllowance: row.medical_allowance, specialAllowance: row.special_allowance,
          professionalDevelopment: row.professional_development, otherAllowance: row.other_allowance,
          foodAllowance: row.food_allowance,
          bonus: row.bonus, otherEarnings: row.other_earnings, totalEarnings: row.total_earnings,
          employerContribution: row.employer_contribution, lopAmount: row.lop_amount, grossSalary: row.gross_salary,
          providentFund: row.provident_fund, esi: row.esi, professionalTax: row.professional_tax,
          incomeTax: row.income_tax,
          otherDeductions: row.other_deductions, totalDeductions: row.total_deductions, netSalary: row.net_salary,
          remarks: row.remarks || null,
          sourceFile: file.originalFilename || file.newFilename || 'upload.xlsx'
        });
        matched.push(rowLabel);
      }

      await conn.execute(
        `INSERT INTO upload_batches
          (file_name, pay_month, pay_year, total_rows, matched_rows, unmatched_rows, unmatched_codes, uploaded_by)
         VALUES (:fileName, :payMonth, :payYear, :totalRows, :matchedRows, :unmatchedRows, :unmatchedCodes, :uploadedBy)`,
        {
          fileName: file.originalFilename || 'upload.xlsx',
          payMonth, payYear,
          totalRows: rows.length,
          matchedRows: matched.length,
          unmatchedRows: unmatched.length,
          unmatchedCodes: unmatched.join(', ') || null,
          uploadedBy: req.session ? req.session.username : 'unknown'
        }
      );

      await conn.commit();
    });

    sendJson(res, 200, {
      success: true,
      totalRows: rows.length,
      matched: matched.length,
      unmatched: unmatched.length,
      unmatchedCodes: unmatched,
      parseWarnings: parseErrors
    });
  } catch (err) {
    console.error('[salary] upload processing error', err);
    sendError(res, 500, 'Failed to save salary data to the database.');
  }
}

module.exports = { uploadSalary };
