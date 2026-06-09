const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "./admin-login.html";
}

const RESERVATIONS_API =
  "https://renovacao-barber-api.onrender.com/api/reservations";

const PROFESSIONALS_API =
  "https://renovacao-barber-api.onrender.com/api/professionals";

const TIME_SLOTS = [
  "08:00", "08:40", "09:20", "10:00", "10:40", "11:20",
  "14:00", "14:40", "15:20", "16:00", "16:40", "17:20", "18:00", "18:40"
];

let PROFESSIONALS = [];
let activeProfessional = "all";

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

function normalizeProfessionalId(professional) {
  const name = professional.name.toLowerCase();

  if (name.includes("paulo")) return "paulo";
  if (name.includes("eltin")) return "eltin";

  return professional._id;
}

async function getReservations(filters = {}) {
  const params = new URLSearchParams();

  if (filters.date) params.append("date", filters.date);
  if (filters.professionalId && filters.professionalId !== "all") {
    params.append("professionalId", filters.professionalId);
  }

  const url = params.toString()
    ? `${RESERVATIONS_API}?${params.toString()}`
    : RESERVATIONS_API;

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

async function getProfessionals() {
  const response = await fetch(PROFESSIONALS_API);

  if (!response.ok) {
    throw new Error("Erro ao buscar profissionais.");
  }

  return await response.json();
}

async function createProfessional(data) {
  const response = await fetch(PROFESSIONALS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Erro ao cadastrar profissional.");
  }

  return await response.json();
}

async function updateProfessional(id, data) {
  const response = await fetch(`${PROFESSIONALS_API}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Erro ao atualizar profissional.");
  }

  return await response.json();
}

async function deleteProfessional(id) {
  const response = await fetch(`${PROFESSIONALS_API}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Erro ao excluir profissional.");
  }

  return await response.json();
}

async function cancelReservation(id) {
  const response = await fetch(`${RESERVATIONS_API}/${id}/cancel`, {
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

function populateProfessionalFilter() {
  const select = document.getElementById("filterProfessional");

  select.innerHTML = `
    <option value="">Todos profissionais</option>
    ${PROFESSIONALS.map((professional) => {
    const id = normalizeProfessionalId(professional);

    return `
        <option value="${id}">
          ${professional.name}
        </option>
      `;
  }).join("")}
  `;
}

function renderProfessionalTabs() {
  const container = document.getElementById("professionalTabs");

  container.innerHTML = `
    <button class="btn-outline" data-tab-professional="all">
      Todos
    </button>

    ${PROFESSIONALS.map((professional) => {
    const id = normalizeProfessionalId(professional);

    return `
        <button class="btn-outline" data-tab-professional="${id}">
          ${professional.name}
        </button>
      `;
  }).join("")}
  `;

  container.querySelectorAll("[data-tab-professional]").forEach((button) => {
    const isActive = button.dataset.tabProfessional === activeProfessional;

    if (isActive) {
      button.style.borderColor = "var(--gold)";
      button.style.background = "rgba(201,168,76,0.12)";
    }

    button.addEventListener("click", async () => {
      activeProfessional = button.dataset.tabProfessional;

      document.getElementById("filterProfessional").value =
        activeProfessional === "all" ? "" : activeProfessional;

      renderProfessionalTabs();
      await loadReservations();
    });
  });
}

function getProfessionalsToShow() {
  if (activeProfessional === "all") {
    return PROFESSIONALS;
  }

  return PROFESSIONALS.filter(
    (professional) => normalizeProfessionalId(professional) === activeProfessional
  );
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
  const selectedDate = document.getElementById("filterDate").value || todayISO();

  const dayReservations = reservations.filter(
    (reservation) => reservation.date === selectedDate
  );

  if (!professionals.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nenhum profissional cadastrado.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <h3 style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--gold);margin-bottom:1rem;">
      Agenda do dia ${formatDate(selectedDate)}
    </h3>

    <table class="admin-table">
      <thead>
        <tr>
          <th>Horário</th>
          ${professionals
      .map((professional) => `<th>${professional.name}</th>`)
      .join("")}
        </tr>
      </thead>

      <tbody>
        ${TIME_SLOTS.map(
        (time) => `
            <tr>
              <td><strong>${time}</strong></td>

              ${professionals
            .map((professional) => {
              const professionalId = normalizeProfessionalId(professional);

              const cell = getReservationForCell(
                professionalId,
                time,
                dayReservations
              );

              if (!cell) {
                return `<td class="admin-free">Livre</td>`;
              }

              if (cell.type === "busy") {
                return `<td class="admin-busy">Ocupado</td>`;
              }

              const reservation = cell.reservation;

              return `
                    <td class="admin-reserved">
                      <strong style="color:var(--gold);display:block;">
                        ${reservation.clientName}
                      </strong>
                      <span>${reservation.serviceName}</span>
                      <br>
                      <small>
                        ${reservation.serviceDuration} min · ${money(reservation.servicePrice)}
                      </small>
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
    const professionalId = normalizeProfessionalId(professional);

    const professionalReservations = reservations.filter(
      (reservation) =>
        reservation.professionalId === professionalId &&
        reservation.status === "confirmada"
    );

    const revenue = professionalReservations.reduce(
      (sum, reservation) => sum + Number(reservation.servicePrice || 0),
      0
    );

    return `
      <div class="service-card">
        <div class="service-name">${professional.name}</div>
        <p class="service-desc">
          ${professionalReservations.length} reservas confirmadas
        </p>
        <div class="service-price">${money(revenue)}</div>
      </div>
    `;
  }).join("");
}

function renderReservations(reservations) {
  const container = document.getElementById("adminReservationsList");

  updateStats(reservations);
  renderScheduleGrid(reservations);
  renderProfessionalSummary(reservations);

  if (!reservations.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nenhuma reserva encontrada.
      </div>
    `;
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

function renderProfessionalsList() {
  const container = document.getElementById("professionalsList");

  if (!PROFESSIONALS.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nenhum profissional cadastrado.
      </div>
    `;
    return;
  }

  container.innerHTML = PROFESSIONALS.map((professional) => `
    <div class="reservation-card">
      <h4>${professional.name}</h4>

      <p><strong>WhatsApp:</strong> ${professional.whatsapp}</p>
      <p><strong>Instagram:</strong> ${professional.instagram || "-"}</p>
      <p><strong>Foto:</strong> ${professional.photo || "-"}</p>
      <p><strong>Bio:</strong> ${professional.bio || "-"}</p>

      <div class="reservation-actions">
        <button class="btn-outline" data-edit-professional="${professional._id}">
          Editar
        </button>

        <button class="btn-danger" data-delete-professional="${professional._id}">
          Excluir
        </button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-edit-professional]").forEach((button) => {
    button.addEventListener("click", () => {
      const professional = PROFESSIONALS.find(
        (item) => item._id === button.dataset.editProfessional
      );

      document.getElementById("professionalId").value = professional._id;
      document.getElementById("professionalName").value = professional.name;
      document.getElementById("professionalWhatsapp").value = professional.whatsapp;
      document.getElementById("professionalInstagram").value =
        professional.instagram || "";
      document.getElementById("professionalPhoto").value =
        professional.photo || "";
      document.getElementById("professionalBio").value =
        professional.bio || "";

      document.getElementById("professionalName").focus();
    });
  });

  container.querySelectorAll("[data-delete-professional]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm("Deseja excluir este profissional?");
      if (!confirmed) return;

      try {
        await deleteProfessional(button.dataset.deleteProfessional);
        await loadProfessionals();
        await loadReservations();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function loadProfessionals() {
  try {
    PROFESSIONALS = await getProfessionals();

    populateProfessionalFilter();
    renderProfessionalTabs();
    renderProfessionalsList();
  } catch (error) {
    console.error(error);
  }
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
  container.innerHTML = `
    <div class="empty-state">
      Carregando reservas...
    </div>
  `;

  try {
    const reservations = await getReservations(filters);
    renderReservations(reservations);
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        Erro ao carregar reservas.
      </div>
    `;
  }
}

function setupProfessionalForm() {
  const form = document.getElementById("professionalForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = document.getElementById("professionalId").value;

    const data = {
      name: document.getElementById("professionalName").value.trim(),
      whatsapp: document.getElementById("professionalWhatsapp").value.trim(),
      instagram: document.getElementById("professionalInstagram").value.trim(),
      photo: document.getElementById("professionalPhoto").value.trim(),
      bio: document.getElementById("professionalBio").value.trim(),
      active: true,
    };

    try {
      if (id) {
        await updateProfessional(id, data);
      } else {
        await createProfessional(data);
      }

      form.reset();
      document.getElementById("professionalId").value = "";

      await loadProfessionals();
      await loadReservations();

      alert("Profissional salvo com sucesso!");
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("clearProfessionalForm").addEventListener("click", () => {
    form.reset();
    document.getElementById("professionalId").value = "";
  });
}

document.getElementById("applyFilters").addEventListener("click", async () => {
  activeProfessional =
    document.getElementById("filterProfessional").value || "all";

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

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "./admin-login.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("filterDate").value) {
    document.getElementById("filterDate").value = todayISO();
  }

  setupProfessionalForm();

  await loadProfessionals();
  await loadReservations();
});