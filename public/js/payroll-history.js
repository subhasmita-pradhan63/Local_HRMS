const alertBox = document.getElementById('alertBox');
const tableBody = document.getElementById('historyTableBody');
const searchInput = document.getElementById('searchInput');
const monthFilter = document.getElementById('monthFilter');
const yearFilter = document.getElementById('yearFilter');

monthFilter.innerHTML = '<option value="">All Months</option>' +
  MONTH_NAMES.slice(1).map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');

(async () => {
  await requireLogin();
  await loadHistory();
})();

let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadHistory, 300);
});
monthFilter.addEventListener('change', loadHistory);
yearFilter.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadHistory, 300);
});

async function loadHistory() {
  clearAlert(alertBox);
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (monthFilter.value) params.set('month', monthFilter.value);
  if (yearFilter.value) params.set('year', yearFilter.value);

  try {
    const data = await apiFetch('/api/payroll?' + params.toString());
    renderTable(data.records);
  } catch (err) {
    showAlert(alertBox, err.message || 'Failed to load payroll history.');
    tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Could not load payroll history.</td></tr>';
  }
}

function renderTable(records) {
  if (!records.length) {
    tableBody.innerHTML = '<tr><td colspan="9" class="empty-state">No payroll records found.</td></tr>';
    return;
  }
  tableBody.innerHTML = records.map((r) => `
    <tr>
      <td><strong>${escapeHtml(r.EMPLOYEE_CODE)}</strong></td>
      <td>${escapeHtml(r.FULL_NAME)}</td>
      <td>${escapeHtml(r.DEPARTMENT || '-')}</td>
      <td>${MONTH_NAMES[r.PAY_MONTH]} ${r.PAY_YEAR}</td>
      <td>${fmtMoney(r.TOTAL_EARNINGS)}</td>
      <td>${fmtMoney(r.TOTAL_DEDUCTIONS)}</td>
      <td><strong>${fmtMoney(r.NET_SALARY)}</strong></td>
      <td><a class="btn btn-outline btn-sm" href="/api/payroll/${r.PAYROLL_ID}/payslip" target="_blank">Download</a></td>
      <td><button class="btn btn-danger btn-sm" onclick="deletePayrollRecord(${r.PAYROLL_ID}, '${escapeHtml(r.EMPLOYEE_CODE)}', '${MONTH_NAMES[r.PAY_MONTH]} ${r.PAY_YEAR}')">Delete</button></td>
    </tr>
  `).join('');
}

window.deletePayrollRecord = async function (payrollId, code, period) {
  if (!confirm(`Delete the ${period} payroll record for ${code}? This cannot be undone.`)) return;
  try {
    await apiFetch(`/api/payroll/${payrollId}`, { method: 'DELETE' });
    await loadHistory();
  } catch (err) {
    showAlert(alertBox, err.message || 'Failed to delete payroll record.');
  }
};
