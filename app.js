console.log("LISTEN Time Clock start");

/* =========================
   グローバル変数
========================= */
let employees = [];
let selectedEmployee = null;
let currentStatuses = [];
let editingName = "";
let isAdminMode = false;

const ADMIN_PASSWORD = "9059";

let lastClock = {
  employeeId: "",
  actionType: "",
  timestamp: 0
};

/* =========================
   DOM取得
========================= */
const employeeList = document.getElementById("employeeList");
const selectedName = document.getElementById("selectedName");
const message = document.getElementById("message");
const clockInBtn = document.getElementById("clockInBtn");
const clockOutBtn = document.getElementById("clockOutBtn");

const tabClockBtn = document.getElementById("tabClockBtn");
const tabStatusBtn = document.getElementById("tabStatusBtn");
const clockView = document.getElementById("clockView");
const statusView = document.getElementById("statusView");

const statusDate = document.getElementById("statusDate");
const loadStatusBtn = document.getElementById("loadStatusBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const statusMessage = document.getElementById("statusMessage");
const statusTableBody = document.getElementById("statusTableBody");
const editHeader = document.getElementById("editHeader");

const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminLoginArea = document.getElementById("adminLoginArea");
const adminPassword = document.getElementById("adminPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminStatus = document.getElementById("adminStatus");

const monthlyNameSelect = document.getElementById("monthlyNameSelect");
const monthlyMonth = document.getElementById("monthlyMonth");
const exportMonthlyCsvBtn = document.getElementById("exportMonthlyCsvBtn");

/* =========================
   共通処理
========================= */
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleString("ja-JP");
}

function formatDateForApi(dateValue) {
  return dateValue.replaceAll("-", "/");
}

function getTodayForInput() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function getCurrentMonthForInput() {
  const now = new Date();
  return now.toISOString().slice(0, 7);
}

/* =========================
   タブ切替
========================= */
function setActiveTab(mode) {
  if (mode === "clock") {
    clockView.classList.remove("hidden");
    statusView.classList.add("hidden");
  } else {
    clockView.classList.add("hidden");
    statusView.classList.remove("hidden");
  }
}

/* =========================
   従業員表示
========================= */
function renderEmployees() {
  employeeList.innerHTML = "";

  employees.forEach(emp => {
    const btn = document.createElement("button");
    btn.className = "employee-btn";
    btn.textContent = emp.name;

    if (selectedEmployee?.employee_id === emp.employee_id) {
      btn.classList.add("selected");
    }

    btn.onclick = () => {
      selectedEmployee = emp;
      selectedName.textContent = emp.name;
      renderEmployees();
    };

    employeeList.appendChild(btn);
  });
}

/* =========================
   従業員取得
========================= */
async function loadEmployees() {
  try {
    const res = await fetch(`${CONFIG.GAS_URL}?action=getEmployees`);
    const data = await res.json();

    employees = data.employees || [];
    renderEmployees();
    renderMonthlySelect();
  } catch (e) {
    message.textContent = "従業員取得失敗";
  }
}

/* =========================
   一覧取得
========================= */
async function loadDailyStatus() {
  try {
    const date = formatDateForApi(statusDate.value);
    const res = await fetch(`${CONFIG.GAS_URL}?action=getDailyStatus&date=${date}`);
    const data = await res.json();

    currentStatuses = data.statuses || [];
    renderStatusTable(currentStatuses);
  } catch (e) {
    statusMessage.textContent = "一覧取得失敗";
  }
}

/* =========================
   表示（重要：ここ修正）
========================= */
function renderStatusTable(statuses) {
  statusTableBody.innerHTML = "";

  statuses.forEach(item => {
    const clockIn = item.clockIn || item.clock_in || "";
    const clockOut = item.clockOut || item.clock_out || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${clockIn}</td>
      <td>${clockOut}</td>
      <td>${item.status}</td>
    `;
    statusTableBody.appendChild(tr);
  });
}

/* =========================
   打刻（重要）
========================= */
async function saveClock(actionType) {
  if (!selectedEmployee) {
    message.textContent = "選択してください";
    return;
  }

  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "clock",
        name: selectedEmployee.name,
        employee_id: selectedEmployee.employee_id,
        actionType
      })
    });

    const data = await res.json();
    message.textContent = data.message;

    selectedEmployee = null;
    selectedName.textContent = "未選択";
    renderEmployees();

    await loadDailyStatus();

  } catch (e) {
    message.textContent = "保存失敗";
  }
}

/* =========================
   CSV
========================= */
function exportStatusCsv() {
  if (!currentStatuses.length) return;

  let csv = "日付,氏名,出勤,退勤,状態\n";

  currentStatuses.forEach(s => {
    const clockIn = s.clockIn || s.clock_in || "";
    const clockOut = s.clockOut || s.clock_out || "";

    csv += `${statusDate.value},${s.name},${clockIn},${clockOut},${s.status}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance.csv";
  a.click();
}

/* =========================
   初期化
========================= */
clockInBtn.onclick = () => saveClock("出勤");
clockOutBtn.onclick = () => saveClock("退勤");

tabClockBtn.onclick = () => setActiveTab("clock");
tabStatusBtn.onclick = () => {
  setActiveTab("status");
  loadDailyStatus();
};

loadStatusBtn.onclick = loadDailyStatus;
exportCsvBtn.onclick = exportStatusCsv;

updateClock();
setInterval(updateClock, 1000);

statusDate.value = getTodayForInput();
monthlyMonth.value = getCurrentMonthForInput();

loadEmployees();
loadDailyStatus();
