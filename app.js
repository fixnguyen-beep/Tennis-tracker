// Remplace par tes valeurs Supabase
const SUPABASE_URL = "https://fjcvqyqwngllufgbgkwl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5IkePtGg9hlhJelR3uFBcA_T3bX55J9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FAMILY_LABELS = {
  albertine_gaby: "Albertine & Gaby",
  emilie_paul: "Emilie & Paul",
  none: "Aucun"
};

const START_DATE = new Date("2026-10-10T00:00:00");
const END_DATE = new Date("2027-07-15T00:00:00");

function generateSaturdays(start, end) {
  const list = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);

  while (d <= end) {
    if (d.getDay() === 6) {
      list.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return list;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFrench(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function renderSummary(rows) {
  const albertineCount = rows.filter(r => r.paid_by === "albertine_gaby").length;
  const emilieCount = rows.filter(r => r.paid_by === "emilie_paul").length;

  document.getElementById("count-albertine").textContent = String(albertineCount);
  document.getElementById("count-emilie").textContent = String(emilieCount);
  document.getElementById("count-remaining").textContent = String(rows.length - albertineCount - emilieCount);
}

function renderRows(rows) {
  const tbody = document.getElementById("dates-body");
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.paid_by !== "none") {
      tr.classList.add("row-paid");
    } else {
      tr.classList.add("row-unpaid");
    }

    tr.innerHTML = `
      <td>${formatFrench(row.date)}</td>
      <td>${FAMILY_LABELS[row.paid_by] || "Aucun"}</td>
      <td>
        <div class="family-selector">
          <button type="button" data-date="${row.date}" data-family="albertine_gaby" class="${row.paid_by === "albertine_gaby" ? "selected" : ""}">
            Albertine & Gaby
          </button>
          <button type="button" data-date="${row.date}" data-family="emilie_paul" class="${row.paid_by === "emilie_paul" ? "selected" : ""}">
            Emilie & Paul
          </button>
          <button type="button" data-date="${row.date}" data-family="none" class="${row.paid_by === "none" ? "selected" : ""}">
            Aucun
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function loadData() {
  const { data, error } = await supabaseClient
    .from("saturday_payments")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  const map = {};
  (data || []).forEach(item => {
    map[item.date] = item.paid_by;
  });

  const dates = generateSaturdays(START_DATE, END_DATE);

  const rows = dates.map(date => ({
    date: formatDateISO(date),
    paid_by: map[formatDateISO(date)] || "none"
  }));

  renderSummary(rows);
  renderRows(rows);
}

async function updatePayment(date, family) {
  const status = document.getElementById("status");
  status.textContent = `Enregistrement pour ${formatFrench(date)}...`;

  const payload = {
    date,
    paid_by: family,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from("saturday_payments")
    .upsert(payload, { onConflict: "date" });

  if (error) {
    status.textContent = "Erreur lors de l'enregistrement dans Supabase.";
    console.error(error);
    return;
  }

  status.textContent = `Mise à jour enregistrée : ${FAMILY_LABELS[family] || "Aucun"} pour le ${formatFrench(date)}.`;
  await loadData();
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-family]");
  if (!button) return;

  const date = button.dataset.date;
  const family = button.dataset.family;

  await updatePayment(date, family);
});

async function init() {
  try {
    await loadData();
    document.getElementById("status").textContent = "Prêt à enregistrer les paiements.";
  } catch (error) {
    console.error(error);
    document.getElementById("status").textContent = "Erreur de chargement de la base de données Supabase.";
  }
}

init();
