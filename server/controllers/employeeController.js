const db = require('../db');
const { sendJson, sendError, readJsonBody } = require('../utils/http');

async function listEmployees(req, res, query) {
  const search = (query.search || '').trim();
  const department = (query.department || '').trim();
  const status = (query.status || '').trim();

  const conditions = [];
  const binds = {};

  if (search) {
    conditions.push('(LOWER(employee_code) LIKE :search OR LOWER(full_name) LIKE :search)');
    binds.search = `%${search.toLowerCase()}%`;
  }
  if (department) {
    conditions.push('LOWER(department) = LOWER(:department)');
    binds.department = department;
  }
  if (status) {
    conditions.push('status = :status');
    binds.status = status.toUpperCase();
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await db.execute(
      `SELECT employee_id, employee_code, full_name, department, designation, email, phone,
              date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status
       FROM employees ${whereClause}
       ORDER BY employee_code`,
      binds
    );
    sendJson(res, 200, { success: true, employees: result.rows });
  } catch (err) {
    console.error('[employees] list error', err);
    sendError(res, 500, 'Failed to fetch employees.');
  }
}

async function getEmployee(req, res, id) {
  try {
    const result = await db.execute(
      `SELECT employee_id, employee_code, full_name, department, designation, email, phone,
              date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status
       FROM employees WHERE employee_id = :id`,
      { id }
    );
    if (!result.rows.length) return sendError(res, 404, 'Employee not found.');
    sendJson(res, 200, { success: true, employee: result.rows[0] });
  } catch (err) {
    console.error('[employees] get error', err);
    sendError(res, 500, 'Failed to fetch employee.');
  }
}

function validateEmployeePayload(body) {
  const errors = [];
  if (!body.employeeCode || !String(body.employeeCode).trim()) errors.push('Employee Code is required.');
  if (!body.fullName || !String(body.fullName).trim()) errors.push('Full Name is required.');
  return errors;
}

async function createEmployee(req, res) {
  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendError(res, 400, e.message); }

  const errors = validateEmployeePayload(body);
  if (errors.length) return sendError(res, 400, errors.join(' '));

  try {
    const result = await db.execute(
      `INSERT INTO employees
        (employee_code, full_name, department, designation, email, phone, date_of_joining,
         bank_account, bank_name, ifsc_code, pan_no, status)
       VALUES
        (:employeeCode, :fullName, :department, :designation, :email, :phone,
         CASE WHEN :doj IS NULL THEN NULL ELSE TO_DATE(:doj, 'YYYY-MM-DD') END,
         :bankAccount, :bankName, :ifscCode, :panNo, :status)
       RETURNING employee_id INTO :newId`,
      {
        employeeCode: String(body.employeeCode).trim(),
        fullName: String(body.fullName).trim(),
        department: body.department || null,
        designation: body.designation || null,
        email: body.email || null,
        phone: body.phone || null,
        doj: body.dateOfJoining || null,
        bankAccount: body.bankAccount || null,
        bankName: body.bankName || null,
        ifscCode: body.ifscCode || null,
        panNo: body.panNo ? String(body.panNo).trim().toUpperCase() : null,
        status: (body.status || 'ACTIVE').toUpperCase(),
        newId: { dir: db.oracledb.BIND_OUT, type: db.oracledb.NUMBER }
      },
      {},
      true
    );
    sendJson(res, 201, { success: true, employeeId: result.outBinds.newId[0] });
  } catch (err) {
    console.error('[employees] create error', err);
    if (err.errorNum === 1) { // ORA-00001 unique constraint
      return sendError(res, 409, 'An employee with this Employee Code already exists.');
    }
    sendError(res, 500, 'Failed to create employee.');
  }
}

async function updateEmployee(req, res, id) {
  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendError(res, 400, e.message); }

  const errors = validateEmployeePayload(body);
  if (errors.length) return sendError(res, 400, errors.join(' '));

  try {
    const result = await db.execute(
      `UPDATE employees SET
        employee_code = :employeeCode,
        full_name = :fullName,
        department = :department,
        designation = :designation,
        email = :email,
        phone = :phone,
        date_of_joining = CASE WHEN :doj IS NULL THEN NULL ELSE TO_DATE(:doj, 'YYYY-MM-DD') END,
        bank_account = :bankAccount,
        bank_name = :bankName,
        ifsc_code = :ifscCode,
        pan_no = :panNo,
        status = :status,
        updated_at = SYSTIMESTAMP
       WHERE employee_id = :id`,
      {
        employeeCode: String(body.employeeCode).trim(),
        fullName: String(body.fullName).trim(),
        department: body.department || null,
        designation: body.designation || null,
        email: body.email || null,
        phone: body.phone || null,
        doj: body.dateOfJoining || null,
        bankAccount: body.bankAccount || null,
        bankName: body.bankName || null,
        ifscCode: body.ifscCode || null,
        panNo: body.panNo ? String(body.panNo).trim().toUpperCase() : null,
        status: (body.status || 'ACTIVE').toUpperCase(),
        id
      },
      {},
      true
    );
    if (result.rowsAffected === 0) return sendError(res, 404, 'Employee not found.');
    sendJson(res, 200, { success: true });
  } catch (err) {
    console.error('[employees] update error', err);
    if (err.errorNum === 1) {
      return sendError(res, 409, 'Another employee already uses this Employee Code.');
    }
    sendError(res, 500, 'Failed to update employee.');
  }
}

async function deleteEmployee(req, res, id, cascade) {
  if (!cascade) {
    try {
      const result = await db.execute(
        `DELETE FROM employees WHERE employee_id = :id`,
        { id },
        {},
        true
      );
      if (result.rowsAffected === 0) return sendError(res, 404, 'Employee not found.');
      sendJson(res, 200, { success: true });
    } catch (err) {
      console.error('[employees] delete error', err);
      if (err.errorNum === 2292) { // ORA-02292 child record found (FK from payroll)
        return sendError(res, 409, 'Cannot delete: this employee has payroll records. Remove those first.');
      }
      sendError(res, 500, 'Failed to delete employee.');
    }
    return;
  }

  // Cascade delete: remove the employee's payroll records first, then the
  // employee, in a single transaction so we never end up half-deleted.
  try {
    const rowsAffected = await db.withConnection(async (conn) => {
      await conn.execute(`DELETE FROM payroll WHERE employee_id = :id`, { id });
      const empResult = await conn.execute(`DELETE FROM employees WHERE employee_id = :id`, { id });
      await conn.commit();
      return empResult.rowsAffected;
    });
    if (rowsAffected === 0) return sendError(res, 404, 'Employee not found.');
    sendJson(res, 200, { success: true });
  } catch (err) {
    console.error('[employees] cascade delete error', err);
    sendError(res, 500, 'Failed to delete employee and payroll records.');
  }
}

module.exports = { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };
