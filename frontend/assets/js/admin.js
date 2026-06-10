const token = localStorage.getItem("token");
const currentUser =
  JSON.parse(localStorage.getItem("user")) || null;

const isAdmin =
  currentUser?.role === "admin";

const isBarber =
  currentUser?.role === "barbeiro";

if (!token) {
  window.location.href = "./admin-login.html";
}

const CLIENTS_API =
  "https://renovacao-barber-api.onrender.com/api/clients";

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
let currentWeekDate = todayISO();

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function getClients() {
  const response = await fetch(CLIENTS_API);

  if (!response.ok) {
    throw new Error("Erro ao buscar clientes.");
  }

  return await response.json();
}

async function loadClients() {
  try {

    const clients = await getClients();

    const container =
      document.getElementById("clientsList");

    if (!clients.length) {

      container.innerHTML = `
        <div class="empty-state">
          Nenhum cliente encontrado.
        </div>
      `;

      return;
    }

    container.innerHTML = clients
      .map(client => `
        <div class="reservation-card">

          <h4>${client.name}</h4>

          <p>
            <strong>WhatsApp:</strong>
            ${client.phone}
          </p>

          <p>
            <strong>Total gasto:</strong>
            ${money(client.totalSpent)}
          </p>

          <p>
            <strong>Atendimentos:</strong>
            ${client.totalAppointments}
          </p>

          <p>
            <strong>Última visita:</strong>
            ${client.lastAppointmentDate}
          </p>

        </div>
      `)
      .join("");

  } catch(error) {
    console.error(error);
  }
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function moveWeek(days) {
  currentWeekDate = addDays(currentWeekDate, days);
  document.getElementById("filterDate").value = currentWeekDate;
  loadReservations();
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

async function createReservation(reservation) {
  const response = await fetch(RESERVATIONS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reservation),
  });

  if (response.status === 409) {
    const data = await response.json();
    throw new Error(data.message || "Horário indisponível.");
  }

  if (!response.ok) {
    throw new Error("Erro ao criar agendamento.");
  }

  return await response.json();
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

function getWeekRange(dateString) {
  const baseDate = dateString ? new Date(dateString + "T12:00:00") : new Date();

  const day = baseDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return {
    start: monday.toISOString().split("T")[0],
    end: saturday.toISOString().split("T")[0],
  };
}

function isDateBetween(date, start, end) {
  return date >= start && date <= end;
}

function getMonthRange(dateString) {
  const baseDate = dateString ? new Date(dateString + "T12:00:00") : new Date();

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0],
  };
}

function updateStats(reservations) {
  const selectedDate = document.getElementById("filterDate").value || todayISO();
  const week = getWeekRange(selectedDate);
  const month = getMonthRange(selectedDate);

  const confirmed = reservations.filter(
    (reservation) => reservation.status === "confirmada"
  );

  const todayConfirmed = confirmed.filter(
    (reservation) => reservation.date === selectedDate
  );

  const weekConfirmed = confirmed.filter((reservation) =>
    isDateBetween(reservation.date, week.start, week.end)
  );

  const monthConfirmed = confirmed.filter((reservation) =>
    isDateBetween(reservation.date, month.start, month.end)
  );

  const todayRevenue = todayConfirmed.reduce(
    (sum, reservation) => sum + Number(reservation.servicePrice || 0),
    0
  );

  const weekRevenue = weekConfirmed.reduce(
    (sum, reservation) => sum + Number(reservation.servicePrice || 0),
    0
  );

  const monthRevenue = monthConfirmed.reduce(
    (sum, reservation) => sum + Number(reservation.servicePrice || 0),
    0
  );

  const averageTicket =
    confirmed.length > 0
      ? confirmed.reduce(
        (sum, reservation) => sum + Number(reservation.servicePrice || 0),
        0
      ) / confirmed.length
      : 0;

  document.getElementById("todayReservations").textContent =
    todayConfirmed.length;

  document.getElementById("todayRevenue").textContent =
    money(todayRevenue);

  document.getElementById("weekReservations").textContent =
    weekConfirmed.length;

  document.getElementById("weekRevenue").textContent =
    money(weekRevenue);

  document.getElementById("monthRevenue").textContent =
    money(monthRevenue);

  document.getElementById("averageTicket").textContent =
    money(averageTicket);

  document.getElementById("confirmedReservations").textContent =
    confirmed.length;

  document.getElementById("totalReservations").textContent =
    reservations.length;
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

function addDays(dateString, days) {
  const date = new Date(dateString + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function getWeekDays(dateString) {
  const baseDate = new Date(dateString + "T12:00:00");
  const day = baseDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const mondayISO = monday.toISOString().split("T")[0];

  return [
    { label: "Segunda", date: mondayISO },
    { label: "Terça", date: addDays(mondayISO, 1) },
    { label: "Quarta", date: addDays(mondayISO, 2) },
    { label: "Quinta", date: addDays(mondayISO, 3) },
    { label: "Sexta", date: addDays(mondayISO, 4) },
    { label: "Sábado", date: addDays(mondayISO, 5) },
  ];
}

function getReservationForWeeklyCell(professionalId, date, time, reservations) {
  const slotStart = timeToMinutes(time);

  const exactReservation = reservations.find((reservation) => {
    return (
      reservation.professionalId === professionalId &&
      reservation.date === date &&
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
      reservation.date !== date ||
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

function renderWeeklySchedule(reservations) {
  const container = document.getElementById("weeklyScheduleGrid");
  if (!container) return;

  const selectedDate = currentWeekDate || document.getElementById("filterDate").value || todayISO();
  const weekDays = getWeekDays(selectedDate);
  const professionals = getProfessionalsToShow();

  if (!professionals.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nenhum profissional disponível para exibir a agenda semanal.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin:2rem 0 1rem;">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--gold);">
        Agenda semanal
      </h3>

      <div style="display:flex;gap:.8rem;flex-wrap:wrap;">
        <button class="btn-outline" id="prevWeekBtn">◀ Semana anterior</button>
        <button class="btn-outline" id="currentWeekBtn">Semana atual</button>
        <button class="btn-outline" id="nextWeekBtn">Próxima semana ▶</button>
      </div>
    </div>

    ${professionals.map((professional) => {
    const professionalId = normalizeProfessionalId(professional);

    return `
        <div style="margin-bottom:2.5rem;">
          <h4 style="font-family:'Cormorant Garamond',serif;font-size:1.7rem;color:var(--off-white);margin-bottom:1rem;">
            ${professional.name}
          </h4>

          <div style="overflow-x:auto;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Horário</th>
                  ${weekDays.map((day) => `
                    <th>
                      ${day.label}<br>
                      <small style="color:var(--light);font-weight:400;">
                        ${formatDate(day.date)}
                      </small>
                    </th>
                  `).join("")}
                </tr>
              </thead>

              <tbody>
                ${TIME_SLOTS.map((time) => `
                  <tr>
                    <td><strong>${time}</strong></td>

                    ${weekDays.map((day) => {
      const cell = getReservationForWeeklyCell(
        professionalId,
        day.date,
        time,
        reservations
      );

      if (!cell) {
        return `
    <td 
      class="admin-free"
      data-manual-booking="true"
      data-professional-id="${professionalId}"
      data-professional-name="${professional.name}"
      data-professional-whatsapp="${professional.whatsapp}"
      data-date="${day.date}"
      data-time="${time}"
    >
      Livre
    </td>
  `;
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
    }).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
  }).join("")}
  `;

  document.getElementById("prevWeekBtn").addEventListener("click", () => {
    moveWeek(-7);
  });

  document.getElementById("currentWeekBtn").addEventListener("click", () => {
    currentWeekDate = todayISO();
    document.getElementById("filterDate").value = currentWeekDate;
    loadReservations();
  });

  document.getElementById("nextWeekBtn").addEventListener("click", () => {
    moveWeek(7);
  });
}

function renderProfessionalSummary(reservations) {
  const container = document.getElementById("professionalSummary");

  if (!container) return;

  const COMMISSION_PERCENTAGE = 50;

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

    const commission = revenue * (COMMISSION_PERCENTAGE / 100);

    return `
      <div class="service-card">
        <div class="service-name">${professional.name}</div>

        <p class="service-desc">
          ${professionalReservations.length} reservas confirmadas
        </p>

        <div class="service-price">${money(revenue)}</div>

        <p class="service-desc" style="margin-top:1rem;">
          Comissão ${COMMISSION_PERCENTAGE}%: <strong style="color:var(--gold);">${money(commission)}</strong>
        </p>
      </div>
    `;
  }).join("");
}

function renderReservations(reservations) {
  const container = document.getElementById("adminReservationsList");

  updateStats(reservations);
  renderScheduleGrid(reservations);
  renderWeeklySchedule(reservations);
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
    const allProfessionals = await getProfessionals();

    if (isBarber) {
      PROFESSIONALS = allProfessionals.filter(
        (professional) => professional._id === currentUser.professionalId
      );

      if (PROFESSIONALS.length) {
        activeProfessional = normalizeProfessionalId(PROFESSIONALS[0]);
      }
    } else {
      PROFESSIONALS = allProfessionals;
    }

    populateProfessionalFilter();
    renderProfessionalTabs();
    renderProfessionalsList();
  } catch (error) {
    console.error(error);
  }
}

async function loadReservations() {
  let selectedProfessional =
    activeProfessional === "all"
      ? document.getElementById("filterProfessional").value
      : activeProfessional;

  if (isBarber && PROFESSIONALS.length) {
    selectedProfessional = normalizeProfessionalId(PROFESSIONALS[0]);
  }

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

  currentWeekDate = document.getElementById("filterDate").value || todayISO();

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

function openManualBookingModal(data) {
  document.getElementById("manualProfessionalId").value = data.professionalId;
  document.getElementById("manualProfessionalName").value = data.professionalName;
  document.getElementById("manualProfessionalWhatsapp").value = data.professionalWhatsapp;
  document.getElementById("manualDate").value = data.date;
  document.getElementById("manualTime").value = data.time;

  document.getElementById("manualProfessionalLabel").value = data.professionalName;
  document.getElementById("manualDateTimeLabel").value =
    `${formatDate(data.date)} às ${data.time}`;

  document.getElementById("manualBookingModal").classList.add("active");
}

function closeManualBookingModal() {
  document.getElementById("manualBookingModal").classList.remove("active");
  document.getElementById("manualBookingForm").reset();
}

function setupManualBooking() {
  document.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-manual-booking]");

    if (!cell) return;

    openManualBookingModal({
      professionalId: cell.dataset.professionalId,
      professionalName: cell.dataset.professionalName,
      professionalWhatsapp: cell.dataset.professionalWhatsapp,
      date: cell.dataset.date,
      time: cell.dataset.time,
    });
  });

  document.getElementById("closeManualModal").addEventListener("click", () => {
    closeManualBookingModal();
  });

  document.getElementById("manualBookingModal").addEventListener("click", (event) => {
    if (event.target.id === "manualBookingModal") {
      closeManualBookingModal();
    }
  });

  document.getElementById("manualBookingForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const serviceSelect = document.getElementById("manualService");
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

    const reservation = {
      serviceId: serviceSelect.value,
      serviceName: selectedOption.dataset.name,
      servicePrice: Number(selectedOption.dataset.price),
      serviceDuration: Number(selectedOption.dataset.duration),

      professionalId: document.getElementById("manualProfessionalId").value,
      professionalName: document.getElementById("manualProfessionalName").value,
      professionalWhatsapp: document.getElementById("manualProfessionalWhatsapp").value,

      date: document.getElementById("manualDate").value,
      time: document.getElementById("manualTime").value,

      clientName: document.getElementById("manualClientName").value.trim(),
      clientPhone: document.getElementById("manualClientPhone").value.trim(),
      clientNote: document.getElementById("manualClientNote").value.trim(),

      status: "confirmada",
    };

    try {
      await createReservation(reservation);

      closeManualBookingModal();
      await loadReservations();

      alert("Agendamento criado com sucesso!");
    } catch (error) {
      alert(error.message || "Erro ao criar agendamento.");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("filterDate").value) {
    document.getElementById("filterDate").value = todayISO();
  }

  currentWeekDate = document.getElementById("filterDate").value;

  if (isAdmin) {
    setupProfessionalForm();
  }

  setupManualBooking();

  await loadProfessionals();

  if (isBarber) {
    const professionalSection = document.getElementById("professionalForm")?.closest(".reservations-box");

    if (professionalSection) {
      professionalSection.style.display = "none";
    }

    const professionalFilter = document.getElementById("filterProfessional");

    if (professionalFilter) {
      professionalFilter.style.display = "none";
    }
  }

  await loadReservations();
  await loadClients();
});