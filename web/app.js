const state = {
  records: [],
  groups: [],
  filtered: [],
};

const districtCenters = {
  "צפון": { x: 58, y: 18 },
  "חיפה": { x: 55, y: 32 },
  "תל אביב": { x: 49, y: 48 },
  "מרכז": { x: 52, y: 54 },
  "ירושלים": { x: 60, y: 58 },
  "אשקלון": { x: 43, y: 71 },
  "דרום": { x: 48, y: 83 },
};

const cityCenters = {
  "קרית שמונה": { x: 61, y: 10 },
  "נהריה": { x: 42, y: 20 },
  "מעלות תרשיחא": { x: 48, y: 22 },
  "טבריה": { x: 60, y: 30 },
  "כרמיאל": { x: 53, y: 26 },
  "חיפה": { x: 47, y: 33 },
  "עכו": { x: 43, y: 27 },
  "עפולה": { x: 58, y: 35 },
  "יקנעם": { x: 50, y: 37 },
  "קריות": { x: 46, y: 31 },
  "קרית מוצקין": { x: 46, y: 30 },
  "קרית ביאליק": { x: 45, y: 30 },
  "קרית אתא": { x: 48, y: 31 },
  "קרית חיים": { x: 44, y: 30 },
  "שפרעם": { x: 52, y: 31 },
  "חדרה": { x: 45, y: 43 },
  "נתניה": { x: 44, y: 48 },
  "רעננה": { x: 47, y: 51 },
  "כפר סבא": { x: 49, y: 52 },
  "הוד השרון": { x: 49, y: 51 },
  "הרצליה": { x: 44, y: 52 },
  "ראש העין": { x: 52, y: 53 },
  "פתח תקווה": { x: 50, y: 54 },
  "בני ברק": { x: 48, y: 55 },
  "רמת גן": { x: 47, y: 56 },
  "קרית אונו": { x: 49, y: 56 },
  "אור יהודה": { x: 48, y: 57 },
  "תל אביב": { x: 45, y: 56 },
  "בת ים": { x: 45, y: 59 },
  "חולון": { x: 46, y: 58 },
  "ראשון לציון": { x: 45, y: 61 },
  "יבנה": { x: 43, y: 65 },
  "רחובות": { x: 47, y: 63 },
  "רמלה": { x: 49, y: 61 },
  "מודיעין": { x: 52, y: 62 },
  "ירושלים": { x: 60, y: 62 },
  "אשדוד": { x: 41, y: 68 },
  "אשקלון": { x: 38, y: 73 },
  "קרית גת": { x: 45, y: 70 },
  "קרית מלאכי": { x: 42, y: 67 },
  "באר שבע": { x: 51, y: 79 },
  "אילת": { x: 56, y: 95 },
};

const uploadForm = document.getElementById("upload-form");
const excelInput = document.getElementById("excel-input");
const uploadStatus = document.getElementById("upload-status");
const dashboardShell = document.getElementById("dashboard-shell");
const filterIds = ["year-filter", "academic-filter", "district-filter", "field-filter", "group-filter"];

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!excelInput.files.length) {
    uploadStatus.textContent = "יש לבחור קובץ אקסל לפני טעינה.";
    return;
  }

  const formData = new FormData();
  formData.append("excel", excelInput.files[0]);

  uploadStatus.textContent = "טוען את הקובץ ומפיק דשבורד...";
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "הטעינה נכשלה");
    }
    state.records = payload.records;
    state.groups = payload.groups || [];
    initializeFilters();
    applyFilters();
    dashboardShell.classList.remove("hidden");
    uploadStatus.textContent = `הדשבורד נטען מתוך הגיליון "${payload.sheetName}" עם ${payload.rowCount} רשומות.`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  }
});

document.getElementById("clear-filters").addEventListener("click", () => {
  filterIds.forEach((id) => {
    const select = document.getElementById(id);
    Array.from(select.options).forEach((option) => {
      option.selected = false;
    });
  });
  applyFilters();
});

filterIds.forEach((id) => {
  document.getElementById(id).addEventListener("change", applyFilters);
});

function initializeFilters() {
  setOptions("year-filter", uniqueValues("school_year"));
  setOptions("academic-filter", uniqueValues("academic_institution"));
  setOptions("district-filter", uniqueValues("district"));
  setOptions("field-filter", uniqueValues("training_field"));
  setOptions(
    "group-filter",
    state.groups.map((group) => ({ value: group.id, label: group.label }))
  );
}

function uniqueValues(field) {
  return [...new Set(state.records.map((row) => row[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "he"))
    .map((value) => ({ value, label: value }));
}

function setOptions(selectId, options) {
  const select = document.getElementById(selectId);
  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
}

function selectedValues(selectId) {
  return new Set(Array.from(document.getElementById(selectId).selectedOptions).map((option) => option.value));
}

function applyFilters() {
  const filters = {
    school_year: selectedValues("year-filter"),
    academic_institution: selectedValues("academic-filter"),
    district: selectedValues("district-filter"),
    training_field: selectedValues("field-filter"),
    geo_groups: selectedValues("group-filter"),
  };

  state.filtered = state.records.filter((record) => {
    if (filters.school_year.size && !filters.school_year.has(record.school_year)) return false;
    if (filters.academic_institution.size && !filters.academic_institution.has(record.academic_institution)) return false;
    if (filters.district.size && !filters.district.has(record.district)) return false;
    if (filters.training_field.size && !filters.training_field.has(record.training_field)) return false;
    if (filters.geo_groups.size) {
      const matches = record.geo_groups || [];
      if (!matches.some((groupId) => filters.geo_groups.has(groupId))) return false;
    }
    return true;
  });

  renderKpis();
  renderSummary();
  renderCharts();
  renderMap();
  renderTable();
}

function renderKpis() {
  const totalStudents = sumBy(state.filtered, "students");
  const institutions = new Set(state.filtered.map((row) => row.academic_institution).filter(Boolean)).size;
  const cities = new Set(state.filtered.map((row) => row.city).filter(Boolean)).size;
  const fields = new Set(state.filtered.map((row) => row.training_field).filter(Boolean)).size;

  document.getElementById("kpis").innerHTML = [
    ["סה\"כ סטודנטים", totalStudents.toLocaleString("he-IL")],
    ["מוסדות אקדמיים", institutions.toLocaleString("he-IL")],
    ["ערים ויישובים", cities.toLocaleString("he-IL")],
    ["תחומי הכשרה", fields.toLocaleString("he-IL")],
  ]
    .map(
      ([label, value]) => `
        <article class="kpi-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderSummary() {
  const placements = state.filtered.length;
  const averageStudents = placements ? (sumBy(state.filtered, "students") / placements).toFixed(1) : "0";
  const topDistrict = topEntry(groupRows(state.filtered, "district"))?.label || "ללא נתון";
  const topInstitution = topEntry(groupRows(state.filtered, "academic_institution"))?.label || "ללא נתון";

  document.getElementById("summary-table").innerHTML = `
    <div class="summary-grid">
      ${summaryCard("מספר רשומות מסוננות", placements.toLocaleString("he-IL"))}
      ${summaryCard("ממוצע סטודנטים לרשומה", averageStudents)}
      ${summaryCard("מחוז מוביל", escapeHtml(topDistrict))}
      ${summaryCard("מוסד אקדמי מוביל", escapeHtml(topInstitution))}
    </div>
  `;
}

function summaryCard(label, value) {
  return `
    <div class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderCharts() {
  renderBarChart("institution-chart", groupRows(state.filtered, "academic_institution"), "אין נתונים להצגה לפי מוסדות.");
  renderBarChart("district-chart", groupRows(state.filtered, "district"), "אין נתונים להצגה לפי מחוזות.");
  renderBarChart("field-chart", groupRows(state.filtered, "training_field"), "אין נתונים להצגה לפי תחומים.", 8);
}

function renderBarChart(targetId, rows, emptyText, limit = 10) {
  const target = document.getElementById(targetId);
  const topRows = rows.slice(0, limit);
  if (!topRows.length) {
    target.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  const max = Math.max(...topRows.map((row) => row.value));
  target.innerHTML = `
    <div class="chart">
      ${topRows
        .map(
          (row) => `
            <div class="chart-row">
              <div>${escapeHtml(row.label)}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${(row.value / max) * 100}%"></div>
              </div>
              <strong>${row.value.toLocaleString("he-IL")}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMap() {
  const grouped = groupRows(state.filtered, "city", 12);
  const target = document.getElementById("map-view");
  if (!grouped.length) {
    target.innerHTML = `<div class="empty-state">אין מספיק נתונים למפה.</div>`;
    return;
  }

  const max = Math.max(...grouped.map((row) => row.value));
  const dots = grouped
    .map((row, index) => {
      const record = state.filtered.find((item) => item.city === row.label);
      const center = lookupPoint(row.label, record?.district, index);
      const size = 12 + (row.value / max) * 24;
      return `
        <div class="map-dot" style="right: ${center.x}%; top: ${center.y}%; width: ${size}px; height: ${size}px;"></div>
        <div class="map-label" style="right: ${center.x}%; top: ${center.y}%;">${escapeHtml(row.label)} · ${row.value}</div>
      `;
    })
    .join("");

  target.innerHTML = `
    <div class="map-surface">
      <div class="map-outline"></div>
      ${dots}
    </div>
  `;
}

function lookupPoint(city, district, index) {
  const normalizedCity = String(city || "").replaceAll("קריית", "קרית");
  if (cityCenters[normalizedCity]) return cityCenters[normalizedCity];
  const districtCenter = districtCenters[district] || { x: 50, y: 50 };
  const offset = ((index % 5) - 2) * 2.8;
  return {
    x: districtCenter.x + offset,
    y: districtCenter.y + ((index % 3) - 1) * 2.4,
  };
}

function renderTable() {
  const target = document.getElementById("detail-table");
  const rows = state.filtered.slice(0, 25);
  if (!rows.length) {
    target.innerHTML = `<div class="empty-state">אין רשומות להצגה בטבלה.</div>`;
    return;
  }

  target.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>מוסד אקדמי</th>
          <th>תחום</th>
          <th>עיר</th>
          <th>מחוז</th>
          <th>מספר סטודנטים</th>
          <th>סיווג</th>
          <th>תת סיווג</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.academic_institution)}</td>
                <td>${escapeHtml(row.training_field)}</td>
                <td>${escapeHtml(row.city)}</td>
                <td>${escapeHtml(row.district)}</td>
                <td>${Number(row.students || 0).toLocaleString("he-IL")}</td>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.sub_category)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function groupRows(records, field, limit = 999) {
  const totals = new Map();
  records.forEach((record) => {
    const key = record[field] || "ללא נתון";
    const current = totals.get(key) || 0;
    totals.set(key, current + Number(record.students || 0));
  });
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function topEntry(rows) {
  return rows[0] || null;
}

function sumBy(records, field) {
  return records.reduce((sum, row) => sum + Number(row[field] || 0), 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
