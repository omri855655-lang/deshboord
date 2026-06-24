const state = {
  records: [],
  groups: [],
  filtered: [],
};

const filterIds = [
  "year-filter",
  "academic-filter",
  "district-filter",
  "field-filter",
  "category-filter",
  "subcategory-filter",
  "group-filter",
];

const cityCenters = {
  "קרית שמונה": { x: 60, y: 11 },
  "מ.א גליל עליון": { x: 57, y: 16 },
  "מבואות חרמון": { x: 66, y: 18 },
  "נהריה": { x: 35, y: 19 },
  "שלומי": { x: 36, y: 16 },
  "מעלות תרשיחא": { x: 40, y: 22 },
  "עכו": { x: 38, y: 27 },
  "כרמיאל": { x: 48, y: 27 },
  "שפרעם": { x: 46, y: 31 },
  "חיפה": { x: 40, y: 34 },
  "קריות": { x: 40, y: 31 },
  "קרית מוצקין": { x: 39, y: 30 },
  "קרית ביאליק": { x: 39, y: 30 },
  "קרית אתא": { x: 43, y: 31 },
  "קרית חיים": { x: 38, y: 30 },
  "טירת הכרמל": { x: 39, y: 36 },
  "יקנעם": { x: 45, y: 38 },
  "עפולה": { x: 52, y: 37 },
  "טבריה": { x: 59, y: 32 },
  "צפת": { x: 55, y: 24 },
  "רמת פוריה": { x: 57, y: 35 },
  "מגדל העמק": { x: 49, y: 35 },
  "גליל תחתון": { x: 54, y: 34 },
  "זכרון יעקב": { x: 39, y: 42 },
  "חדרה": { x: 40, y: 46 },
  "נתניה": { x: 40, y: 50 },
  "בארותיים": { x: 41, y: 49 },
  "רעננה": { x: 42, y: 54 },
  "כפר סבא": { x: 44, y: 54 },
  "הוד השרון": { x: 44, y: 55 },
  "הרצליה": { x: 39, y: 55 },
  "ראש העין": { x: 46, y: 57 },
  "פתח תקווה": { x: 45, y: 58 },
  "בני ברק": { x: 42, y: 59 },
  "רמת גן": { x: 41, y: 60 },
  "קרית אונו": { x: 43, y: 60 },
  "אור יהודה": { x: 43, y: 61 },
  "תל אביב": { x: 38, y: 60 },
  "בת ים": { x: 38, y: 62 },
  "חולון": { x: 39, y: 61 },
  "ראשון לציון": { x: 39, y: 64 },
  "יבנה": { x: 39, y: 67 },
  "רחובות": { x: 42, y: 66 },
  "נס ציונה": { x: 41, y: 65 },
  "רמלה": { x: 44, y: 64 },
  "מודיעין": { x: 49, y: 65 },
  "ירושלים": { x: 56, y: 66 },
  "אשדוד": { x: 36, y: 71 },
  "אשקלון": { x: 35, y: 76 },
  "קרית מלאכי": { x: 40, y: 71 },
  "קרית גת": { x: 42, y: 75 },
  "באר שבע": { x: 49, y: 84 },
  "בני ציון": { x: 41, y: 52 },
  "אילת": { x: 50, y: 98 },
};

const districtCenters = {
  "צפון": { x: 50, y: 24 },
  "חיפה": { x: 40, y: 34 },
  "תל אביב": { x: 40, y: 59 },
  "מרכז": { x: 45, y: 59 },
  "ירושלים": { x: 56, y: 66 },
  "אשקלון": { x: 37, y: 73 },
  "דרום": { x: 47, y: 84 },
};

const uploadForm = document.getElementById("upload-form");
const excelInput = document.getElementById("excel-input");
const uploadStatus = document.getElementById("upload-status");
const dashboardShell = document.getElementById("dashboard-shell");

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!excelInput.files.length) {
    uploadStatus.textContent = "יש לבחור קובץ אקסל לפני טעינה.";
    return;
  }

  const formData = new FormData();
  formData.append("excel", excelInput.files[0]);
  uploadStatus.textContent = "טוען את הקובץ ובונה דשבורד מחדש...";

  try {
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "הטעינה נכשלה");
    }
    state.records = payload.records || [];
    state.groups = payload.groups || [];
    initializeFilters();
    applyFilters();
    dashboardShell.classList.remove("hidden");
    uploadStatus.textContent = `הדשבורד נטען מתוך "${payload.sheetName}" עם ${payload.rowCount} רשומות. עדכונים עתידיים ב-GitHub מתפרסים אוטומטית ל-Render.`;
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
  setOptions("category-filter", uniqueValues("category"));
  setOptions("subcategory-filter", uniqueValues("sub_category"));
  setOptions("group-filter", state.groups.map((group) => ({ value: group.id, label: group.label })));
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
    category: selectedValues("category-filter"),
    sub_category: selectedValues("subcategory-filter"),
    geo_groups: selectedValues("group-filter"),
  };

  state.filtered = state.records.filter((record) => {
    if (filters.school_year.size && !filters.school_year.has(record.school_year)) return false;
    if (filters.academic_institution.size && !filters.academic_institution.has(record.academic_institution)) return false;
    if (filters.district.size && !filters.district.has(record.district)) return false;
    if (filters.training_field.size && !filters.training_field.has(record.training_field)) return false;
    if (filters.category.size && !filters.category.has(record.category)) return false;
    if (filters.sub_category.size && !filters.sub_category.has(record.sub_category)) return false;
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
  renderCityDrilldown();
  renderTable();
}

function renderKpis() {
  const totalStudents = sumBy(state.filtered, "students");
  const placements = state.filtered.length;
  const institutions = new Set(state.filtered.map((row) => row.academic_institution).filter(Boolean)).size;
  const cities = new Set(state.filtered.map((row) => row.city).filter(Boolean)).size;

  document.getElementById("kpis").innerHTML = [
    ["סה\"כ סטודנטים", totalStudents.toLocaleString("he-IL")],
    ["מספר רשומות", placements.toLocaleString("he-IL")],
    ["מוסדות אקדמיים", institutions.toLocaleString("he-IL")],
    ["ערים ויישובים", cities.toLocaleString("he-IL")],
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
  const totalStudents = sumBy(state.filtered, "students");
  const avgPerRow = state.filtered.length ? (totalStudents / state.filtered.length).toFixed(1) : "0";
  const topDistrict = topEntry(groupRows(state.filtered, "district"))?.label || "ללא נתון";
  const topField = topEntry(groupRows(state.filtered, "training_field"))?.label || "ללא נתון";
  const topCategory = topEntry(groupRows(state.filtered, "category"))?.label || "ללא נתון";
  const topCity = topEntry(groupRows(state.filtered, "city"))?.label || "ללא נתון";

  document.getElementById("summary-table").innerHTML = `
    <div class="summary-grid">
      ${summaryCard("סה\"כ סטודנטים מסוננים", totalStudents.toLocaleString("he-IL"))}
      ${summaryCard("ממוצע סטודנטים לרשומה", avgPerRow)}
      ${summaryCard("מחוז מוביל", escapeHtml(topDistrict))}
      ${summaryCard("תחום מוביל", escapeHtml(topField))}
      ${summaryCard("סיווג מוביל", escapeHtml(topCategory))}
      ${summaryCard("עיר מובילה", escapeHtml(topCity))}
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
  renderBarChart("institution-chart", groupRows(state.filtered, "academic_institution"), {
    emptyText: "אין נתונים להצגה לפי מוסדות.",
    limit: 8,
  });
  renderBarChart("district-chart", groupRows(state.filtered, "district"), {
    emptyText: "אין נתונים להצגה לפי אזורים.",
    limit: 7,
    alt: true,
  });
  renderBarChart("field-chart", groupRows(state.filtered, "training_field"), {
    emptyText: "אין נתונים להצגה לפי תחומים.",
    limit: 8,
  });
  renderBarChart("category-chart", groupRows(state.filtered, "category"), {
    emptyText: "אין נתונים להצגה לפי סיווג.",
    limit: 8,
    alt: true,
  });
  renderBarChart("subcategory-chart", groupRows(state.filtered, "sub_category"), {
    emptyText: "אין נתונים להצגה לפי תת סיווג.",
    limit: 8,
  });
  renderBarChart("city-chart", groupRows(state.filtered, "city"), {
    emptyText: "אין נתונים להצגה לפי ערים.",
    limit: 8,
    alt: true,
  });
  renderBarChart("site-chart", groupRows(state.filtered, "institution_name"), {
    emptyText: "אין נתונים להצגה לפי מוסדות הכשרה.",
    limit: 8,
  });
}

function renderBarChart(targetId, rows, options = {}) {
  const { emptyText = "אין נתונים.", limit = 10, alt = false } = options;
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
              <div class="chart-label">${escapeHtml(row.label)}</div>
              <div class="bar-track">
                <div class="bar-fill ${alt ? "alt" : ""}" style="width:${(row.value / max) * 100}%"></div>
              </div>
              <div class="bar-value">${row.value.toLocaleString("he-IL")}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMap() {
  const grouped = groupRows(state.filtered, "city", 14);
  const target = document.getElementById("map-view");
  if (!grouped.length) {
    target.innerHTML = `<div class="empty-state">אין מספיק נתונים למפה.</div>`;
    return;
  }

  const max = Math.max(...grouped.map((row) => row.value));
  const dots = grouped
    .map((row, index) => {
      const record = state.filtered.find((item) => item.city === row.label);
      const point = lookupPoint(row.label, record?.district, index);
      const size = 10 + (row.value / max) * 24;
      return `
        <div class="map-dot" style="right:${point.x}%; top:${point.y}%; width:${size}px; height:${size}px;"></div>
        <div class="map-label" style="right:${point.x}%; top:${point.y}%;">${escapeHtml(row.label)} · ${row.value}</div>
      `;
    })
    .join("");

  target.innerHTML = `
    <div class="map-surface">
      <svg class="map-svg" viewBox="0 0 260 700" aria-hidden="true">
        <path d="M156 11
          L145 38 L153 75 L142 118 L151 156 L144 200 L154 239 L145 279
          L155 319 L145 365 L154 404 L144 446 L152 487 L141 535 L150 578
          L130 624 L123 664 L143 690 L126 700 L98 665 L106 626 L94 584
          L103 546 L90 504 L98 463 L85 420 L94 378 L82 335 L92 294 L83 252
          L95 211 L86 170 L99 132 L90 90 L104 52 L119 18 Z"
          fill="#f7f1de"
          stroke="#69795f"
          stroke-width="6"
          stroke-linejoin="round" />
        <path d="M120 600 L167 654 L152 672 L108 617 Z" fill="#efe2c7" stroke="#69795f" stroke-width="5" stroke-linejoin="round" />
      </svg>
      ${dots}
      <div class="map-legend">המפה מבוססת על סילואט של ישראל ונקודות ערים מותאמות ידנית לדשבורד.</div>
    </div>
  `;
}

function lookupPoint(city, district, index) {
  const normalizedCity = normalizeMapKey(city);
  if (cityCenters[normalizedCity]) return cityCenters[normalizedCity];
  const center = districtCenters[district] || { x: 46, y: 56 };
  return {
    x: center.x + ((index % 4) - 1.5) * 2.2,
    y: center.y + ((index % 3) - 1) * 2.5,
  };
}

function normalizeMapKey(value) {
  return String(value || "")
    .replaceAll("קריית", "קרית")
    .replaceAll("ב\"ש", "באר שבע")
    .trim();
}

function renderCityDrilldown() {
  const target = document.getElementById("city-drilldown");
  const cityGroups = groupHierarchyByCity(state.filtered).slice(0, 18);

  if (!cityGroups.length) {
    target.innerHTML = `<div class="empty-state">אין נתונים להצגת drill-down עירוני.</div>`;
    return;
  }

  target.innerHTML = `
    <div class="drilldown-list">
      ${cityGroups
        .map(
          (group, index) => `
            <details class="drilldown-item" ${index === 0 ? "open" : ""}>
              <summary class="drilldown-summary">
                <strong>${escapeHtml(group.city)}</strong>
                <span>${group.total.toLocaleString("he-IL")} סטודנטים</span>
                <span>${group.children.length.toLocaleString("he-IL")} מוסדות/מרכזים</span>
              </summary>
              <div class="drilldown-inner">
                <table class="inner-table">
                  <thead>
                    <tr>
                      <th>מוסד / מרכז רפואי</th>
                      <th>סיווג</th>
                      <th>תת סיווג</th>
                      <th>סה"כ סטודנטים</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${group.children
                      .map(
                        (child) => `
                          <tr>
                            <td>${escapeHtml(child.label)}</td>
                            <td>${escapeHtml(child.category)}</td>
                            <td>${escapeHtml(child.subCategory)}</td>
                            <td>${child.value.toLocaleString("he-IL")}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </details>
          `
        )
        .join("")}
    </div>
  `;
}

function groupHierarchyByCity(records) {
  const byCity = new Map();
  records.forEach((record) => {
    const city = record.city || "ללא נתון";
    const site = record.institution_name || record.training_site || "ללא נתון";
    const cityEntry = byCity.get(city) || { city, total: 0, children: new Map() };
    cityEntry.total += Number(record.students || 0);

    const child = cityEntry.children.get(site) || {
      label: site,
      value: 0,
      category: record.category || "",
      subCategory: record.sub_category || "",
    };
    child.value += Number(record.students || 0);
    cityEntry.children.set(site, child);
    byCity.set(city, cityEntry);
  });

  return [...byCity.values()]
    .map((entry) => ({
      city: entry.city,
      total: entry.total,
      children: [...entry.children.values()].sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.total - a.total);
}

function renderTable() {
  const target = document.getElementById("detail-table");
  const rows = state.filtered.slice(0, 30);
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
          <th>מוסד / מרכז רפואי</th>
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
                <td>${escapeHtml(row.institution_name)}</td>
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
    totals.set(key, (totals.get(key) || 0) + Number(record.students || 0));
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
