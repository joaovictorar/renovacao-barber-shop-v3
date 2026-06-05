const API_URL = "https://renovacao-barber-api.onrender.com/api/reservations";

function money(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

async function getReservations(filters = {}) {
  const params = new URLSearchParams();

  if (filters.date) params.append("date", filters.date);
  if (filters.professionalId) params.append("professionalId", filters.professionalId);

  const url = params.toString()
    ? `${API_URL}?${params.toString()}`
    : API_URL;

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

function renderReservations(reservations) {
  const container = document.getElementById("adminReservationsList");

  updateStats(reservations);

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

          ${
            reservation.clientNote
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

            ${
              reservation.status !== "cancelada"
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
  const filters = {
    date: document.getElementById("filterDate").value,
    professionalId: document.getElementById("filterProfessional").value,
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

document.getElementById("applyFilters").addEventListener("click", loadReservations);

document.getElementById("clearFilters").addEventListener("click", () => {
  document.getElementById("filterDate").value = "";
  document.getElementById("filterProfessional").value = "";
  document.getElementById("filterStatus").value = "";

  loadReservations();
});

document.addEventListener("DOMContentLoaded", loadReservations);