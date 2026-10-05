const XLSX = require('xlsx');

/**
 * ============================================================================
 * Salary Excel Parser
 * ============================================================================
 * Real-world company salary sheets rarely match a fixed template: the header
 * row is not always row 1, employees are sometimes identified by an
 * "Employee Code" column and sometimes only by name ("Particulars" / "Name"),
 * and the earnings/deductions column names vary sheet to sheet
 * (e.g. "DA", "Professional Development", "Employer Contribution", "Lop",
 * "Gross Salary", "EPF", "ESI", "TDS", "PT" ...).
 *
 * This parser:
 *   1. Picks the most likely sheet (prefers a sheet named like "*Salary*").
 *   2. Auto-detects which row is the header row (scans the first ~25 rows).
 *   3. Maps whatever headers are present to a normalized set of fields using
 *      an alias table (case/space/punctuation-insensitive).
 *   4. Reads each data row using XLSX's cached calculated values, so if the
 *      sheet already computed Total Earnings / Total Deductions / Net Salary
 *      (including any manual overrides of a formula), those exact values are
 *      used as-is and NOT recalculated. This guarantees the uploaded numbers
 *      match the Excel file exactly.
 *   5. Returns rows keyed by employee_code AND/OR employee_name so the caller
 *      can match against the employees table by whichever identifier the
 *      sheet actually provides.
 * ============================================================================
 */

// Fields matched by an EXACT normalized header name.
// Add new aliases here if another sheet format uses different wording.
const FIELD_ALIASES = {
  employee_code: ['employeecode', 'empcode', 'employeeid', 'empid', 'code'],
  employee_name: ['particulars', 'employeename', 'empname', 'name', 'staffname', 'employee'],

  working_days: ['workingdays'],
  present_days: ['present', 'presentdays'],
  absent_days: ['absent', 'absentdays'],
  paid_leave_days: ['paidleave', 'paidleavedays', 'leave'],
  lop_days: ['lopdays'],                 // "LOP Days" -> attendance count
  half_days: ['halfday', 'halfdays'],
  late_marks: ['late', 'latemarks'],
  ot_hours: ['ot', 'othours', 'overtime'],

  basic_salary: ['basic', 'basicsalary'],
  hra: ['hra'],
  da: ['da', 'dearnessallowance'],
  conveyance: ['conveyance', 'conveyanceallowance'],
  medical_allowance: ['medical', 'medicalallowance'],
  special_allowance: ['special', 'specialallowance'],
  professional_development: ['professionaldevelopment', 'proddevelopment', 'pd'],
  other_allowance: ['otherallowance'],
  food_allowance: ['foodallowance'],
  bonus: ['bonus'],
  other_earnings: ['otherearnings', 'othearnings'],
  total_earnings: ['totalearnings'],

  employer_contribution: ['employercontribution'],
  lop_amount: ['lop'],                   // bare "Lop" (rupee amount, not days)
  gross_salary: ['grosssalary', 'gross'],

  provident_fund: ['pf', 'providentfund', 'epf'],
  esi: ['esi'],
  professional_tax: ['pt', 'professionaltax'],
  income_tax: ['tds', 'incometax'],
  other_deductions: ['otherdeductions', 'othdeductions'],
  total_deductions: ['totaldeductions'],

  net_salary: ['netsalary', 'netpay', 'takehome'],
  remarks: ['remarks', 'remark', 'notes', 'note']
};

// Fields matched by a normalized PREFIX when no exact alias matched.
// Handles verbose real-world headers like
// "Employer Contribution (For Internal Reference)".
const PREFIX_ALIASES = [
  ['employer_contribution', 'employercontribution'],
  ['professional_development', 'professionaldevelopment'],
  ['lop_amount', 'lop']
];

// Row identifier values that indicate a summary/total row rather than an
// actual employee, so they don't get saved as a fake "employee".
const NON_EMPLOYEE_ROW_LABELS = new Set([
  'total', 'totals', 'grandtotal', 'subtotal', 'sum', 'average', 'particulars', 'grosstotal'
]);

const NUMERIC_FIELDS = [
  'working_days', 'present_days', 'absent_days', 'paid_leave_days', 'lop_days',
  'half_days', 'late_marks', 'ot_hours',
  'basic_salary', 'hra', 'da', 'conveyance', 'medical_allowance', 'special_allowance',
  'professional_development', 'other_allowance', 'food_allowance', 'bonus', 'other_earnings',
  'total_earnings', 'employer_contribution', 'lop_amount', 'gross_salary',
  'provident_fund', 'esi', 'professional_tax', 'income_tax', 'other_deductions',
  'total_deductions', 'net_salary'
];

function normalizeKey(key) {
  return String(key == null ? '' : key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildFieldLookup() {
  const lookup = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    lookup[normalizeKey(field)] = field;
    aliases.forEach((a) => { lookup[normalizeKey(a)] = field; });
  }
  return lookup;
}

/** Resolves a single raw header cell to one of our normalized field names, or null. */
function resolveField(rawHeader, lookup) {
  const norm = normalizeKey(rawHeader);
  if (!norm) return null;
  if (lookup[norm]) return lookup[norm];
  for (const [field, prefix] of PREFIX_ALIASES) {
    if (norm.startsWith(prefix)) return field;
  }
  return null;
}

function toNumber(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (val instanceof Date) return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Picks the sheet most likely to contain the salary data. */
function pickSheet(workbook) {
  const named = workbook.SheetNames.find((n) => /salary/i.test(n) && !/leave/i.test(n));
  return named || workbook.SheetNames[0];
}

/**
 * Scans the first N rows of the sheet (as an array-of-arrays) for the row
 * that looks most like a header row: the row with the most cells matching a
 * known field alias, provided at least one of those matches is an identifier
 * column (employee_code or employee_name).
 * Returns the 0-based row index, or -1 if no plausible header row is found.
 */
function detectHeaderRow(aoa, lookup) {
  const scanLimit = Math.min(aoa.length, 25);
  let bestRow = -1;
  let bestScore = 0;

  for (let r = 0; r < scanLimit; r++) {
    const row = aoa[r] || [];
    let score = 0;
    let hasIdentifier = false;
    row.forEach((cell) => {
      const field = resolveField(cell, lookup);
      if (field) {
        score++;
        if (field === 'employee_code' || field === 'employee_name') hasIdentifier = true;
      }
    });
    if (hasIdentifier && score >= 2 && score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  return bestRow;
}

/**
 * Parses an uploaded salary Excel buffer into normalized row objects.
 * Auto-detects the header row and sheet; reads cached calculated values for
 * formula cells so totals already computed in Excel (including any manual
 * overrides) are preserved exactly.
 * Returns { rows, errors, sheetName, headerRowNumber, headerMap }
 */
function parseSalaryExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellFormula: false });
  const sheetName = pickSheet(workbook);
  const sheet = workbook.Sheets[sheetName];

  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (!aoa.length) {
    return { rows: [], errors: ['Uploaded sheet has no data.'], sheetName };
  }

  const lookup = buildFieldLookup();
  const headerRowIdx = detectHeaderRow(aoa, lookup);

  if (headerRowIdx === -1) {
    return {
      rows: [],
      errors: [
        'Could not find a header row with an "Employee Code" or employee name ' +
        '(e.g. "Particulars"/"Name") column in the uploaded file.'
      ],
      sheetName
    };
  }

  // headerMap: column index -> normalized field name
  const headerRow = aoa[headerRowIdx];
  const headerMap = {};
  headerRow.forEach((cell, colIdx) => {
    const field = resolveField(cell, lookup);
    if (field) headerMap[colIdx] = field;
  });

  const fields = Object.values(headerMap);
  const hasCode = fields.includes('employee_code');
  const hasName = fields.includes('employee_name');
  if (!hasCode && !hasName) {
    return {
      rows: [],
      errors: [
        'Could not find an "Employee Code" or employee name column in the uploaded file. ' +
        'Expected a header like "Employee Code", "Emp ID", "Particulars" or "Name".'
      ],
      sheetName
    };
  }

  const errors = [];
  const rows = [];

  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const rawRow = aoa[r];
    if (!rawRow || rawRow.every((c) => c === '' || c === null || c === undefined)) continue;

    const record = {};
    Object.entries(headerMap).forEach(([colIdx, field]) => {
      record[field] = rawRow[colIdx];
    });

    const employeeCode = String(record.employee_code || '').trim();
    const employeeName = String(record.employee_name || '').trim();
    const excelRowNumber = r + 1; // 1-based row number as it appears in Excel

    if (!employeeCode && !employeeName) {
      errors.push(`Row ${excelRowNumber}: missing Employee Code / Name, skipped.`);
      continue;
    }

    // Skip summary/total rows (e.g. a "Total" row summing the sheet above).
    if (NON_EMPLOYEE_ROW_LABELS.has(normalizeKey(employeeCode)) ||
        NON_EMPLOYEE_ROW_LABELS.has(normalizeKey(employeeName))) {
      errors.push(`Row ${excelRowNumber}: skipped summary/total row ("${employeeCode || employeeName}").`);
      continue;
    }

    const normalized = { employee_code: employeeCode, employee_name: employeeName };
    NUMERIC_FIELDS.forEach((f) => { normalized[f] = toNumber(record[f]); });
    normalized.remarks = record.remarks ? String(record.remarks).trim() : '';

    // Derive totals ONLY when the sheet did not already supply them.
    // When the sheet provides a value (even a manually overridden one), it
    // is used exactly as-is and never recalculated.
    if (!normalized.total_earnings) {
      normalized.total_earnings = normalized.basic_salary + normalized.hra + normalized.da +
        normalized.conveyance + normalized.medical_allowance + normalized.special_allowance +
        normalized.professional_development + normalized.other_allowance + normalized.food_allowance +
        normalized.bonus + normalized.other_earnings;
    }
    if (!normalized.gross_salary) {
      normalized.gross_salary = normalized.total_earnings - normalized.employer_contribution - normalized.lop_amount;
    }
    if (!normalized.total_deductions) {
      normalized.total_deductions = normalized.provident_fund + normalized.esi + normalized.professional_tax +
        normalized.income_tax + normalized.other_deductions;
    }
    if (!normalized.net_salary) {
      normalized.net_salary = normalized.gross_salary - normalized.total_deductions;
    }

    rows.push(normalized);
  }

  return { rows, errors, sheetName, headerRowNumber: headerRowIdx + 1, headerMap };
}

module.exports = { parseSalaryExcel };
