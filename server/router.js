const url = require('url');
const authController = require('./controllers/authController');
const employeeController = require('./controllers/employeeController');
const salaryController = require('./controllers/salaryController');
const payrollController = require('./controllers/payrollController');
const { sendError } = require('./utils/http');

/**
 * Very small router: matches method + path pattern (supports one :id segment).
 * Returns true if the request was handled, false if no route matched.
 */
async function routeApi(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;
  const method = req.method;

  if (!pathname.startsWith('/api/')) return false;

  // ---------- Auth (no auth required) ----------
  if (pathname === '/api/login' && method === 'POST') {
    await authController.login(req, res);
    return true;
  }
  if (pathname === '/api/logout' && method === 'POST') {
    authController.logout(req, res);
    return true;
  }

  // Everything below requires an authenticated session
  if (!authController.requireAuth(req, res)) return true; // requireAuth already sent 401

  if (pathname === '/api/me' && method === 'GET') {
    authController.me(req, res);
    return true;
  }

  if (pathname === '/api/dashboard/summary' && method === 'GET') {
    await payrollController.dashboardSummary(req, res);
    return true;
  }

  // ---------- Employees ----------
  if (pathname === '/api/employees' && method === 'GET') {
    await employeeController.listEmployees(req, res, query);
    return true;
  }
  if (pathname === '/api/employees' && method === 'POST') {
    await employeeController.createEmployee(req, res);
    return true;
  }
  let m = pathname.match(/^\/api\/employees\/(\d+)$/);
  if (m && method === 'GET') {
    await employeeController.getEmployee(req, res, parseInt(m[1], 10));
    return true;
  }
  if (m && method === 'PUT') {
    await employeeController.updateEmployee(req, res, parseInt(m[1], 10));
    return true;
  }
  if (m && method === 'DELETE') {
    const cascade = query.cascade === 'true' || query.cascade === '1';
    await employeeController.deleteEmployee(req, res, parseInt(m[1], 10), cascade);
    return true;
  }

  // ---------- Salary upload ----------
  if (pathname === '/api/salary/upload' && method === 'POST') {
    await salaryController.uploadSalary(req, res);
    return true;
  }

  // ---------- Payroll history / payslip ----------
  if (pathname === '/api/payroll' && method === 'GET') {
    await payrollController.listPayrollHistory(req, res, query);
    return true;
  }
  m = pathname.match(/^\/api\/payroll\/(\d+)\/payslip$/);
  if (m && method === 'GET') {
    await payrollController.downloadPayslip(req, res, parseInt(m[1], 10));
    return true;
  }
  m = pathname.match(/^\/api\/payroll\/(\d+)$/);
  if (m && method === 'DELETE') {
    await payrollController.deletePayrollRecord(req, res, parseInt(m[1], 10));
    return true;
  }

  sendError(res, 404, 'API route not found.');
  return true;
}

module.exports = { routeApi };
