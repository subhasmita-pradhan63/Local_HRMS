const alertBox = document.getElementById('alertBox');
const resultBox = document.getElementById('resultBox');
const dropzone = document.getElementById('dropzone');
const dropzoneText = document.getElementById('dropzoneText');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const payMonthSelect = document.getElementById('payMonth');
const payYearInput = document.getElementById('payYear');

let selectedFile = null;

(async () => { await requireLogin(); })();

// Populate month dropdown, default to current month/year
payMonthSelect.innerHTML = MONTH_NAMES.slice(1).map((m, i) =>
  `<option value="${i + 1}">${m}</option>`).join('');
const now = new Date();
payMonthSelect.value = now.getMonth() + 1;
payYearInput.value = now.getFullYear();

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  const validExt = /\.(xlsx|xls)$/i.test(file.name);
  if (!validExt) {
    showAlert(alertBox, 'Please choose a .xlsx or .xls file.');
    return;
  }
  clearAlert(alertBox);
  selectedFile = file;
  dropzone.classList.add('has-file');
  dropzoneText.innerHTML = `✅ Selected: <strong>${escapeHtml(file.name)}</strong><br><small>Click to choose a different file</small>`;
  uploadBtn.disabled = false;
}

uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  clearAlert(alertBox);
  resultBox.innerHTML = '';
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('payMonth', payMonthSelect.value);
  formData.append('payYear', payYearInput.value);

  try {
    const data = await apiFetch('/api/salary/upload', { method: 'POST', body: formData });
    resultBox.innerHTML = `
      <div class="alert alert-success">Upload processed successfully.</div>
      <div class="row"><span>Total rows read</span><strong>${data.totalRows}</strong></div>
      <div class="row"><span>Matched &amp; saved</span><strong style="color:var(--success)">${data.matched}</strong></div>
      <div class="row"><span>Unmatched (skipped)</span><strong style="color:${data.unmatched ? 'var(--danger)' : 'inherit'}">${data.unmatched}</strong></div>
      ${data.unmatched ? `<div class="row"><span>Unmatched codes</span><span>${data.unmatchedCodes.map(escapeHtml).join(', ')}</span></div>` : ''}
    `;
    dropzoneText.innerHTML = '📄 Click to choose file, or drag &amp; drop here<br><small>.xlsx or .xls</small>';
    dropzone.classList.remove('has-file');
    selectedFile = null;
    fileInput.value = '';
  } catch (err) {
    showAlert(alertBox, err.message || 'Upload failed.');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload & Process';
  }
});
