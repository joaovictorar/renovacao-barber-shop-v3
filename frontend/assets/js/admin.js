const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "./admin-login.html";
}

const API_URL = "https://renovacao-barber-api.onrender.com/api/reservations";

const PROFESSIONALS = [
  {
    id: "paulo",
    name: "Paulo Renovação",
    whatsapp: "5533998316416",
  },
  {
    id: "eltin",
    name: "Eltin dos Cortes",
    whatsapp: "5533998250865",
  },
];

// Para adicionar novo barbeiro no futuro:
// {
//   id: "novo-barbeiro",
//   name: "Nome do Barbeiro",
//   whatsapp: "55DDDNUMERO",
// }

const TIME_SLOTS = [
  "08:00", "08:40", "09:20", "10:00", "10:40", "11:20",
  "14:00", "14:40", "15:20", "16:00", "16:40", "17:20", "18:00", "18:40"
];

let activeProfessional = "all";
let currentReservations = [];

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

async function getReservations(filters = {}) {
  const params = new URLSearchParams();

  if (filters.date) params.append("date", filters.date);
  if (filters.professionalId && filters.professionalId !== "all") {
    params.append("professionalId", filters.professionalId);
  }

  const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar reservas.");
  }

  let reservations = await response.json();

  if (filters.status) {
    reservations = reservations.filter(
      (reservation) => reservation.status === filters.status
    );
  }

  return reservations;
}

async function cancelReservation(id) {
  const response = await fetch(`${API_URL}/${id}/cancel`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Erro ao cancelar reserva.");
  }

  return await response.json();
}

function createWhatsappMessage(reservation) {
  return `Olá! Sobre o agendamento na Renovação Barber Shop.

Cliente: ${reservation.clientName}
WhatsApp: ${reservation.clientPhone}
Serviço: ${reservation.serviceName}
Profissional: ${reservation.professionalName}
Data: ${formatDate(reservation.date)}
Horário: ${reservation.time}
Status: ${reservation.status}`;
}

function setupAdminLayout() {
  const reservationsBox = document.querySelector(".reservations-box");
  const list = document.getElementById("adminReservationsList");

  if (!document.getElementById("professionalTabs")) {
    const tabs = document.createElement("div");
    tabs.id = "professionalTabs";
    tabs.style.display = "flex";
    tabs.style.flexWrap = "wrap";
    tabs.style.gap = "10px";
    tabs.style.margin = "0 0 2rem";

    reservationsBox.insertBefore(tabs, list);
  }

  if (!document.getElementById("scheduleGrid")) {
    const schedule = document.createElement("div");
    schedule.id = "scheduleGrid";
    schedule.style.marginBottom = "2rem";
    schedule.style.overflowX = "auto";

    reservationsBox.insertBefore(schedule, list);
  }

  populateProfessionalFilter();
  renderProfessionalTabs();
}

function populateProfessionalFilter() {
  const select = document.getElementById("filterProfessional");
  if (!select) return;

  select.innerHTML = `
    <option value="">Todos profissionais</option>
    ${PROFESSIONALS.map(
    (professional) =>
      `<option value="${professional.id}">${professional.name}</option>`
  ).join("")}
  `;
}

function renderProfessionalTabs() {
  const container = document.getElementById("professionalTabs");

  container.innerHTML = `
    <button class="btn-outline" data-tab-professional="all">Todos</button>
    ${PROFESSIONALS.map(
    (professional) => `
        <button class="btn-outline" data-tab-professional="${professional.id}">
          ${professional.name}
        </button>
      `
  ).join("")}
  `;

  container.querySelectorAll("[data-tab-professional]").forEach((button) => {
    button.style.borderColor =
      button.dataset.tabProfessional === activeProfessional
        ? "var(--gold)"
        : "";

    button.style.background =
      button.dataset.tabProfessional === activeProfessional
        ? "rgba(201,168,76,0.12)"
        : "";

    button.addEventListener("click", async () => {
      activeProfessional = button.dataset.tabProfessional;

      document.getElementById("filterProfessional").value =
        activeProfessional === "all" ? "" : activeProfessional;

      renderProfessionalTabs();
      await loadReservations();
    });
  });
}

function updateStats(reservations) {
  const total = reservations.length;

  const confirmed = reservations.filter(
    (reservation) => reservation.status === "confirmada"
  );

  const revenue = confirmed.reduce(
    (sum, reservation) => sum + Number(reservation.servicePrice || 0),
    0
  );

  document.getElementById("totalReservations").textContent = total;
  document.getElementById("confirmedReservations").textContent = confirmed.length;
  document.getElementById("expectedRevenue").textContent = money(revenue);
}

function getProfessionalsToShow() {
  if (activeProfessional === "all") return PROFESSIONALS;

  return PROFESSIONALS.filter(
    (professional) => professional.id === activeProfessional
  );
}

function getReservationForCell(professionalId, time, reservations) {
  const slotStart = timeToMinutes(time);

  const exactReservation = reservations.find((reservation) => {
    return (
      reservation.professionalId === professionalId &&
      reservation.time === time &&
      reservation.status !== "cancelada"
    );
  });

  if (exactReservation) {
    return {
      type: "reservation",
      reservation: exactReservation,
    };
  }

  const busyReservation = reservations.find((reservation) => {
    if (
      reservation.professionalId !== professionalId ||
      reservation.status === "cancelada"
    ) {
      return false;
    }

    const reservationStart = timeToMinutes(reservation.time);
    const reservationEnd =
      reservationStart + Number(reservation.serviceDuration || 40);

    return slotStart > reservationStart && slotStart < reservationEnd;
  });

  if (busyReservation) {
    return {
      type: "busy",
      reservation: busyReservation,
    };
  }

  return null;
}

function renderScheduleGrid(reservations) {
  const container = document.getElementById("scheduleGrid");
  const professionals = getProfessionalsToShow();

  if (!professionals.length) {
    container.innerHTML = `<div class="empty-state">Nenhum profissional encontrado.</div>`;
    return;
  }

  const selectedDate = document.getElementById("filterDate").value || todayISO();

  const dayReservations = reservations.filter(
    (reservation) => reservation.date === selectedDate
  );

  container.innerHTML = `
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:2rem;margin-bottom:1rem;color:var(--gold);">
      Agenda do dia ${formatDate(selectedDate)}
    </h3>

    <table style="width:100%;border-collapse:collapse;background:var(--black);min-width:760px;">
      <thead>
        <tr>
          <th style="border:1px solid rgba(201,168,76,0.2);padding:14px;color:var(--gold);text-align:left;">Horário</th>
          ${professionals
      .map(
        (professional) => `
                <th style="border:1px solid rgba(201,168,76,0.2);padding:14px;color:var(--gold);text-align:left;">
                  ${professional.name}
                </th>
              `
      )
      .join("")}
        </tr>
      </thead>

      <tbody>
        ${TIME_SLOTS.map(
        (time) => `
            <tr>
              <td style="border:1px solid rgba(201,168,76,0.12);padding:14px;font-weight:700;color:var(--off-white);">
                ${time}
              </td>

              ${professionals
            .map((professional) => {
              const cell = getReservationForCell(
                professional.id,
                time,
                dayReservations
              );

              if (!cell) {
                return `
                      <td style="border:1px solid rgba(201,168,76,0.12);padding:14px;color:var(--muted);">
                        Livre
                      </td>
                    `;
              }

              if (cell.type === "busy") {
                return `
                      <td style="border:1px solid rgba(201,168,76,0.12);padding:14px;color:var(--muted);background:rgba(201,168,76,0.05);">
                        Ocupado
                      </td>
                    `;
              }

              const reservation = cell.reservation;

              return `
                    <td style="border:1px solid rgba(201,168,76,0.12);padding:14px;background:rgba(201,168,76,0.12);">
                      <strong style="color:var(--gold);display:block;margin-bottom:5px;">
                        ${reservation.clientName}
                      </strong>
                      <span style="display:block;color:var(--off-white);font-size:0.85rem;">
                        ${reservation.serviceName}
                      </span>
                      <span style="display:block;color:var(--light);font-size:0.78rem;margin-top:5px;">
                        ${reservation.serviceDuration} min · ${money(reservation.servicePrice)}
                      </span>
                    </td>
                  `;
            })
            .join("")}
            </tr>
          `
      ).join("")}
      </tbody>
    </table>
  `;
}

function renderProfessionalSummary(reservations) {
  const container = document.getElementById("professionalSummary");

  if (!container) return;

  container.innerHTML = PROFESSIONALS.map((professional) => {
    const professionalReservations = reservations.filter(
      (reservation) =>
        reservation.professionalId === professional.id &&
        reservation.status === "confirmada"
    );

    const revenue = professionalReservations.reduce(
      (sum, reservation) => sum + Number(reservation.servicePrice || 0),
      0
    );

    return `
      <div class="service-card">
        <div class="service-name">${professional.name}</div>
        <p class="service-desc">${professionalReservations.length} reservas confirmadas</p>
        <div class="service-price">${money(revenue)}</div>
      </div>
    `;
  }).join("");
}

function renderReservations(reservations) {
  const container = document.getElementById("adminReservationsList");

  currentReservations = reservations;

  updateStats(reservations);
  renderScheduleGrid(reservations);
  renderProfessionalSummary(reservations);

  if (!reservations.length) {
    container.innerHTML = `<div class="empty-state">Nenhuma reserva encontrada.</div>`;
    return;
  }

  reservations = reservations.sort((a, b) => {
    return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
  });

  container.innerHTML = reservations
    .map((reservation) => {
      const whatsappNumber =
        reservation.professionalWhatsapp || "5533999282037";

      return `
        <div class="reservation-card">
          <h4>${reservation.serviceName}</h4>

          <p><strong>Cliente:</strong> ${reservation.clientName}</p>
          <p><strong>WhatsApp:</strong> ${reservation.clientPhone}</p>
          <p><strong>Profissional:</strong> ${reservation.professionalName}</p>
          <p><strong>Data e horário:</strong> ${formatDate(reservation.date)} às ${reservation.time}</p>
          <p><strong>Valor:</strong> ${money(reservation.servicePrice)} · <strong>Duração:</strong> ${reservation.serviceDuration} min</p>
          <p><strong>Status:</strong> ${reservation.status}</p>

          ${reservation.clientNote
          ? `<p><strong>Observação:</strong> ${reservation.clientNote}</p>`
          : ""
        }

          <div class="reservation-actions">
            <a
              class="btn-outline"
              target="_blank"
              href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          createWhatsappMessage(reservation)
        )}"
            >
              WhatsApp
            </a>

            ${reservation.status !== "cancelada"
          ? `<button class="btn-danger" data-cancel="${reservation._id}">Cancelar</button>`
          : ""
        }
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("[data-cancel]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm("Deseja cancelar esta reserva?");
      if (!confirmed) return;

      try {
        await cancelReservation(button.dataset.cancel);
        await loadReservations();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function loadReservations() {
  const selectedProfessional =
    activeProfessional === "all"
      ? document.getElementById("filterProfessional").value
      : activeProfessional;

  const filters = {
    date: document.getElementById("filterDate").value,
    professionalId: selectedProfessional,
    status: document.getElementById("filterStatus").value,
  };

  const container = document.getElementById("adminReservationsList");
  container.innerHTML = `<div class="empty-state">Carregando reservas...</div>`;

  try {
    const reservations = await getReservations(filters);
    renderReservations(reservations);
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Erro ao carregar reservas.</div>`;
  }
}

document.getElementById("applyFilters").addEventListener("click", async () => {
  activeProfessional = document.getElementById("filterProfessional").value || "all";
  renderProfessionalTabs();
  await loadReservations();
});

document.getElementById("clearFilters").addEventListener("click", async () => {
  document.getElementById("filterDate").value = "";
  document.getElementById("filterProfessional").value = "";
  document.getElementById("filterStatus").value = "";

  activeProfessional = "all";
  renderProfessionalTabs();

  await loadReservations();
});

document.addEventListener("DOMContentLoaded", async () => {
  setupAdminLayout();

  if (!document.getElementById("filterDate").value) {
    document.getElementById("filterDate").value = todayISO();
  }

  await loadReservations();
});

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "./admin-login.html";

  });

}