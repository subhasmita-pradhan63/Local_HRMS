-- ============================================================
-- Bulk insert: Inovaantage employees (31 records)
-- Source: Emp_details_spreadsheet (Google Sheets export)
-- Run AFTER 01_schema.sql and 04_alter_employees_pan.sql
-- Safe to re-run: an employee is skipped if its employee_code
-- already exists, so nothing is duplicated or overwritten.
-- department / designation are not in the source sheet -> left NULL
-- (fill them in from the Employees page). Status = ACTIVE.
-- DOJ in the sheet was DD/MM/YYYY and is converted to a real DATE.
-- ============================================================

-- Make sure the PAN column exists (same check as 04_alter_employees_pan.sql)
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tab_columns
   WHERE table_name = 'EMPLOYEES' AND column_name = 'PAN_NO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE employees ADD (pan_no VARCHAR2(10))';
  END IF;
END;
/

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250156', 'Debiprasanna Sahoo', 'debiprasanna.sahoo@inovaantage.com', '7991082856', DATE '2025-12-10', '33044648220', 'SBI', 'SBIN0012056', 'MBFPS9089D', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250156');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND240132', 'Adabala Jyothi', 'adabala.jyothi@inovaantage.com', '8106252370', DATE '2026-07-13', '37868924002', 'SBI', 'SBIN0002730', 'EFNPA1199Q', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND240132');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND230080', 'Dinesh Kumar Vellaichamy', 'dineshkumarvellaichamy@inovaantage.com', '9036001181', DATE '2026-05-11', '20049972222', 'SBI', 'SBIN0018220', 'ALWPD8917E', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND230080');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250157', 'Penchala Prasad Ravuri', 'Prasad.Ravuri@inovaantage.com', '7337266157', DATE '2025-12-22', '925010000769267', 'Axis', 'UTIB0000733', 'EJHPR5471L', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250157');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250150', 'Damodara rao Tatisettti', 'damodara.rao@inovaantage.com', '9133929060', DATE '2025-06-03', '7250892256', 'Kotak Mahindra Bank', 'KKBK0007466', 'BWUPT3334D', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250150');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250142', 'Beauty kumari', 'beauty.kumari@inovaantage.com', '7295985512', DATE '2025-07-01', '44694527608', 'SBI', 'SBIN0032391', 'ODTPK4715C', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250142');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250166', 'Ujjwal Kumar', 'ujjwal.kumar@inovaantage.com', '9155754642', DATE '2026-07-06', '55022010000945', 'Union Bank Of India', 'UBIN0905500', 'LXFPK6013C', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250166');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250170', 'Mohammad.imran', 'mohammad.imran@inovaantage.com', '6281036567', DATE '2026-08-04', '62305263431', 'SBI', 'SBIN0020158', 'AMDPI7667N', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250170');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250138', 'Rathan Raj M J', 'rathan.raj@inovaantage.com', '8939848585', DATE '2026-09-07', '5790418223', 'Axis', 'UTIB0005140', 'BWVPR1253E', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250138');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250165', 'Nagala.Kusuma', 'nagala.kusuma@inovaantage.com', '7337521336', DATE '2026-07-01', '60810100193060', 'Union Bank Of India', 'UBIN0806081', 'NJGPK1547C', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250165');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250169', 'Mukul Reddy Anagandula', 'mukul.reddy@inovaantage.com', '7011817477', DATE '2026-08-03', '0748854170', 'Kotak Mahindra Bank', 'KKBK0007453', 'ETDPA8123E', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250169');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250151', 'Pratiksha Das', 'Pratiksha.das@inovaantage.com', '7848068928', DATE '2025-04-21', '38464685495', 'SBI', 'SBIN0012063', 'HJKPD0856F', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250151');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250161', 'Ahana Chakraborty', 'ahana.chakraborty@inovaantage.com', '9836543353', DATE '2025-04-01', '1999104000027640', 'IDBI', 'IBKL0001999', 'CWBPC3282R', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250161');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250148', 'Purvi Tripathi', 'Purvi.Tripathi@inovaantage.com', '6388544746', DATE '2025-08-25', '10468100007391', 'BOB', 'BARB0ORAIXX', 'COLPT4714D', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250148');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250137', 'Sonali Anand', 'anand.sonali@inovaantage.com', '8969502068', DATE '2026-09-01', '20261246710', 'SBI', 'SBIN0006917', 'CDGPA7670F', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250137');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND230117', 'Madhumala Nayak', 'madhumalanayak44@gmail.com', '8249303413', DATE '2024-01-15', '7230001500000268', 'Punjab National Bank', 'PUNB0723000', 'CPBPN1015E', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND230117');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250158', 'Aarya sharma', 'Aarya.sharma@inovaantage.com', '8219394992', DATE '2026-01-20', '50100806871506', 'HDFC', 'HDFC0004832', 'PDPPS3186C', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250158');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250141', 'Anurag Nayak', 'anurag.nayak@inovaantage.com', '8658609330', DATE '2025-04-21', '78290100020977', 'BOB', 'BARB0VJBLSR', 'CGCPN6746E', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250141');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND220061', 'Debarghya Bhattacharya', 'debargya@inovaantage.com', '8240296903', DATE '2022-04-11', '7060110036006', 'UCO Bank', 'UCBA0000706', 'DAPPB9208B', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND220061');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250149', 'Rakesh Munian', 'rakesh.munian@inovaantage.com', '9163395057', DATE '2026-04-01', '6055281746', 'Kotak Mahindra Bank', 'KKBK0000329', 'EYPPM4358J', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250149');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250171', 'Mir Mubashir Ali', 'mubashir.ali@inovaantage.com', '9618339547', DATE '2026-08-01', '62433103683', 'SBI', 'SBIN0020121', 'FAFPA4480L', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250171');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250153', 'Mir Shujath Ali', 'mail2shujathali@gmail.com', '9618896547', DATE '2025-08-01', '62433121159', 'SBI', 'SBIN0020121', 'DRKPA3415D', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250153');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND240135', 'Prakalpita Nahak', 'prakalpita@inovaantage.com', '6372480117', DATE '2024-12-20', '633802010009820', 'UNION BANK Of India', 'UBIN0563382', 'BZEPN2492R', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND240135');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250167', 'Ayisha Sidika', 'ayishasidika596@gmail.com', '7540951963', DATE '2026-07-10', '15710110169780', 'UCO Bank', 'UCBA0001571', 'NSGPS4648M', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250167');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250160', 'Ashis Kumar Gidi', 'ashis.kumar@inovaantage.com', '7735736272', DATE '2026-02-16', '551610110005170', 'Bank of India', 'BKID0005516', 'DGXPG8746M', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250160');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND230110', 'Snehasis Rout', 'snehasis.rout@inovaantage.com', '8249106792', DATE '2023-11-01', '110168414274', 'Canara bank', 'CNRB0018024', 'CINPR5173G', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND230110');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250155', 'Subhasmita Pradhan', 'subhasmita.pradhan@inovaantage.com', '8260672807', DATE '2025-12-10', '23518100034814', 'Bank Of Baroda', 'BARB0CHANDI', 'GRIPP5915C', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250155');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250143', 'Ankita Pradhan', 'ankita.pradhan@inovaantage.com', '7894978457', DATE '2025-07-05', '11110110194744', 'UCO Bank', 'UCBA0001111', 'GMKPP4616P', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250143');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND210052', 'Ragi Mahesh', 'mahesh.ragi@inovaantage.com', '7569172707', DATE '2021-11-15', '742701500904', 'ICICI', 'ICIC0007427', 'CALPR7056J', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND210052');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250163', 'Soumi Roy', 'soumi.roy@inovaantage.com', '6291092493', DATE '2026-04-01', '50379746727', 'Indian Bank', 'IDIB000S658', 'FANPR6949P', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250163');

INSERT INTO employees (employee_code, full_name, email, phone, date_of_joining, bank_account, bank_name, ifsc_code, pan_no, status)
SELECT 'IND250136', 'Rashmi Prava Sahoo', 'rashmi.prava@inovaantage.com', '8917272342', DATE '2025-01-20', '556910510001092', 'Bank of India', 'BKID0005569', 'NVZPS5058B', 'ACTIVE'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'IND250136');

COMMIT;

-- Verify: should list the 31 IND... employees
SELECT employee_code, full_name, date_of_joining, bank_name, pan_no
  FROM employees
 WHERE employee_code LIKE 'IND%'
 ORDER BY employee_code;
