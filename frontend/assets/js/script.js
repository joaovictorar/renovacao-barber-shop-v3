// ======================================================
// SISTEMA DE AGENDAMENTO - RENOVAÇÃO BARBER SHOP
// Versão HTML/CSS/JS puro usando localStorage
// ======================================================
const API_URL = "https://renovacao-barber-api.onrender.com/api/reservations";

const SERVICES = [
  {
    id: "corte",
    num: "01",
    name: "Corte Masculino",
    desc: "Corte personalizado para o seu estilo. Tesoura, máquina ou degradê.",
    price: 25,
    duration: 40,
  },
  {
    id: "barba",
    num: "02",
    name: "Barba",
    desc: "Modelagem, aparagem ou barbear completo com acabamento profissional.",
    price: 20,
    duration: 30,
  },
  {
    id: "combo",
    num: "03",
    name: "Corte + Barba",
    desc: "O combo completo para renovar o visual com estilo.",
    price: 40,
    duration: 60,
  },
  {
    id: "degrade",
    num: "04",
    name: "Degradê",
    desc: "Fade preciso com acabamento impecável nas laterais.",
    price: 30,
    duration: 50,
  },
  {
    id: "pigmentacao",
    num: "05",
    name: "Pigmentação",
    desc: "Cobertura de falhas e uniformização da barba ou cabelo.",
    price: 35,
    duration: 40,
  },
  {
    id: "sobrancelha",
    num: "06",
    name: "Sobrancelha",
    desc: "Design e acabamento para sobrancelhas masculinas.",
    price: 10,
    duration: 20,
  },
];

const PROFESSIONALS = [
  {
    id: "paulo",
    name: "Paulo Renovação",
    role: "Barbeiro",
    photo: "assets/img/paulo-renovacao.svg",
    whatsapp: "5533998316416",
    instagram: "https://www.instagram.com/paulorenovacao_/",
    bio: "Especialista em cortes clássicos, modernos, degradê e acabamento masculino.",
  },
  {
    id: "eltin",
    name: "Eltin dos Cortes",
    role: "Barbeiro",
    photo: "assets/img/eltin-dos-cortes.svg",
    whatsapp: "5533998250865",
    instagram: "https://www.instagram.com/eltin_dos_cortes/",
    bio: "Atendimento profissional com foco em estilo, precisão e acabamento de qualidade.",
  },
];

const TIME_SLOTS_WEEK = [
  "08:00", "08:40", "09:20", "10:00", "10:40", "11:20",
  "14:00", "14:40", "15:20", "16:00", "16:40", "17:20", "18:00", "18:40"
];

const TIME_SLOTS_SATURDAY = [
  "08:00", "08:40", "09:20", "10:00", "10:40", "11:20",
  "14:00", "14:40", "15:20", "16:00", "16:40", "17:20", "18:00", "18:40"
];

const STORAGE_KEY = "renovacao_barber_reservas";

let bookingState = {
  serviceId: null,
  professionalId: null,
  date: null,
  time: null,
};

function money(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function getReservations(filterPhone = "") {
  let url = API_URL;

  if (filterPhone.trim()) {
    url += `?clientPhone=${encodeURIComponent(filterPhone.trim())}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar reservas.");
  }

  return await response.json();
}

async function createReservation(reservation) {
  const response = await fetch(API_URL, {
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
    throw new Error("Erro ao criar reserva.");
  }

  return await response.json();
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

function generateId() {
  return "REN-" + Date.now().toString(36).toUpperCase();
}

function getService(id) {
  return SERVICES.find((service) => service.id === id);
}

function getProfessional(id) {
  return PROFESSIONALS.find((professional) => professional.id === id);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

// NAV scroll
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
});

// Mobile menu
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const closeMenu = document.getElementById("closeMenu");

menuBtn.addEventListener("click", () => {
  mobileMenu.classList.add("open");
});

closeMenu.addEventListener("click", () => {
  mobileMenu.classList.remove("open");
});

function closeMobile() {
  mobileMenu.classList.remove("open");
}

window.closeMobile = closeMobile;

// Scroll reveal
const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

reveals.forEach((element) => observer.observe(element));

// Active nav link
const sections = document.querySelectorAll("section[id], footer[id]");
const navLinks = document.querySelectorAll(".nav-links a");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach((section) => {
    if (window.scrollY >= section.offsetTop - 120) {
      current = section.id;
    }
  });

  navLinks.forEach((link) => {
    link.style.color =
      link.getAttribute("href") === "#" + current ? "var(--gold)" : "";
  });
});

// Render services preview
function renderServicesPreview() {
  const container = document.getElementById("servicesPreview");

  container.innerHTML = SERVICES.map((service) => `
    <div class="service-card reveal visible">
      <div class="service-num">${service.num}</div>
      <div class="service-name">${service.name}</div>
      <p class="service-desc">${service.desc}</p>
      <div class="service-price">${money(service.price)} <span>/ ${service.duration} min</span></div>
      <a href="#agendamento" class="service-cta" data-select-service="${service.id}">Agendar →</a>
    </div>
  `).join("");
}

// Render service options
function renderServiceOptions() {
  const container = document.getElementById("serviceOptions");

  container.innerHTML = SERVICES.map((service) => `
    <div class="option-card ${bookingState.serviceId === service.id ? "selected" : ""
    }" data-service-id="${service.id}">
      <h4>${service.name}</h4>
      <p>${service.desc}</p>
      <div class="option-price">${money(service.price)} <span>· ${service.duration} min</span></div>
    </div>
  `).join("");

  container.querySelectorAll("[data-service-id]").forEach((card) => {
    card.addEventListener("click", () => {
      bookingState.serviceId = card.dataset.serviceId;
      renderServiceOptions();
      goToStep(2);
    });
  });
}

// Render professionals
function renderProfessionalOptions() {
  const container = document.getElementById("professionalOptions");

  container.innerHTML = PROFESSIONALS.map((professional) => `
    <div class="professional-option ${bookingState.professionalId === professional.id ? "selected" : ""
    }" data-professional-id="${professional.id}">
      <img src="${professional.photo}" alt="${professional.name}">
      <h4>${professional.name}</h4>
      <p>${professional.bio}</p>
    </div>
  `).join("");

  container.querySelectorAll("[data-professional-id]").forEach((card) => {
    card.addEventListener("click", () => {
      bookingState.professionalId = card.dataset.professionalId;
      renderProfessionalOptions();
      goToStep(3);
    });
  });
}

// Steps
function goToStep(step) {
  document.querySelectorAll(".booking-step").forEach((el) => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".step-pill").forEach((el) => {
    el.classList.remove("active");
  });

  document.getElementById("bookingSuccess").classList.remove("active");

  const stepElement = document.querySelector(`[data-step="${step}"]`);
  const indicator = document.querySelector(`[data-step-indicator="${step}"]`);

  if (stepElement) stepElement.classList.add("active");
  if (indicator) indicator.classList.add("active");

  if (step === 2) renderProfessionalOptions();
  if (step === 4) renderTimeOptions();
  if (step === 5) renderBookingSummary();

  document.getElementById("agendamento").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => {
    goToStep(Number(button.dataset.back));
  });
});

// Date input config
function setupDateInput() {
  const input = document.getElementById("bookingDate");
  const today = new Date();
  const maxDate = new Date();

  maxDate.setDate(today.getDate() + 30);

  input.min = today.toISOString().split("T")[0];
  input.max = maxDate.toISOString().split("T")[0];

  input.addEventListener("change", () => {
    bookingState.date = input.value;
  });

  document.getElementById("goToTimes").addEventListener("click", () => {
    if (!bookingState.date) {
      alert("Escolha uma data para continuar.");
      return;
    }

    const selectedDate = new Date(bookingState.date + "T12:00:00");
    const day = selectedDate.getDay();

    if (day === 0) {
      alert("Domingo está fechado. Escolha outra data.");
      return;
    }

    goToStep(4);
  });
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinBusinessHours(time, duration) {
  const start = timeToMinutes(time);
  const end = start + duration;

  const morningStart = timeToMinutes("08:00");
  const morningEnd = timeToMinutes("12:00");

  const afternoonStart = timeToMinutes("14:00");
  const afternoonEnd = timeToMinutes("19:00");

  const fitsMorning = start >= morningStart && end <= morningEnd;
  const fitsAfternoon = start >= afternoonStart && end <= afternoonEnd;

  return fitsMorning || fitsAfternoon;
}

async function hasScheduleConflict(professionalId, date, time, duration) {
  const reservations = await getReservations();

  const start = timeToMinutes(time);
  const end = start + duration;

  return reservations.some((reservation) => {
    if (
      reservation.professionalId !== professionalId ||
      reservation.date !== date ||
      reservation.status === "cancelada"
    ) {
      return false;
    }

    const reservationStart = timeToMinutes(reservation.time);
    const reservationEnd = reservationStart + reservation.serviceDuration;

    return start < reservationEnd && end > reservationStart;
  });
}

async function isTimeUnavailable(professionalId, date, time, duration) {
  const outsideBusinessHours = !isWithinBusinessHours(time, duration);

  if (outsideBusinessHours) {
    return true;
  }

  return await hasScheduleConflict(professionalId, date, time, duration);
}

async function renderTimeOptions() {
  const container = document.getElementById("timeOptions");

  if (!bookingState.date || !bookingState.professionalId) {
    container.innerHTML = `<div class="empty-state">Escolha data e profissional primeiro.</div>`;
    return;
  }

  const selectedDate = new Date(bookingState.date + "T12:00:00");
  const day = selectedDate.getDay();

  if (day === 0) {
    container.innerHTML = `<div class="empty-state">Domingo fechado.</div>`;
    return;
  }

  const service = getService(bookingState.serviceId);
  const slots = day === 6 ? TIME_SLOTS_SATURDAY : TIME_SLOTS_WEEK;

  container.innerHTML = `<div class="empty-state">Carregando horários...</div>`;

  const buttons = await Promise.all(
    slots.map(async (slot) => {
      const booked = await isTimeUnavailable(
        bookingState.professionalId,
        bookingState.date,
        slot,
        service.duration
      );

      return `
        <button class="time-btn ${booked ? "disabled" : ""}" data-time="${slot}">
          ${slot}
        </button>
      `;
    })
  );

  container.innerHTML = buttons.join("");

  container.querySelectorAll("[data-time]:not(.disabled)").forEach((button) => {
    button.addEventListener("click", () => {
      bookingState.time = button.dataset.time;

      container.querySelectorAll(".time-btn").forEach((btn) => {
        btn.classList.remove("selected");
      });

      button.classList.add("selected");

      setTimeout(() => {
        goToStep(5);
      }, 250);
    });
  });
}

function renderBookingSummary() {
  const service = getService(bookingState.serviceId);
  const professional = getProfessional(bookingState.professionalId);
  const summary = document.getElementById("bookingSummary");

  summary.innerHTML = `
    <p><strong>Serviço:</strong> ${service?.name || "-"}</p>
    <p><strong>Profissional:</strong> ${professional?.name || "-"}</p>
    <p><strong>Data:</strong> ${bookingState.date ? formatDate(bookingState.date) : "-"}</p>
    <p><strong>Horário:</strong> ${bookingState.time || "-"}</p>
    <p><strong>Valor:</strong> ${service ? money(service.price) : "-"}</p>
    <p><strong>Duração:</strong> ${service?.duration || "-"} minutos</p>
  `;
}

// Booking form
function setupBookingForm() {
  const form = document.getElementById("bookingForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (
      !bookingState.serviceId ||
      !bookingState.professionalId ||
      !bookingState.date ||
      !bookingState.time
    ) {
      alert("Preencha todas as etapas do agendamento.");
      return;
    }

    const service = getService(bookingState.serviceId);
    const professional = getProfessional(bookingState.professionalId);

    try {
      const unavailable = await isTimeUnavailable(
        bookingState.professionalId,
        bookingState.date,
        bookingState.time,
        service.duration
      );

      if (unavailable) {
        alert("Esse horário acabou de ser ocupado. Escolha outro horário.");
        goToStep(4);
        return;
      }

      const reservation = {
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,

        professionalId: professional.id,
        professionalName: professional.name,
        professionalWhatsapp: professional.whatsapp,

        date: bookingState.date,
        time: bookingState.time,

        clientName: document.getElementById("clientName").value.trim(),
        clientPhone: document.getElementById("clientPhone").value.trim(),
        clientNote: document.getElementById("clientNote").value.trim(),

        status: "confirmada",
      };

      const savedReservation = await createReservation(reservation);

      const whatsappMessage = createWhatsappMessage(savedReservation);

      const whatsappUrl =
        `https://wa.me/${savedReservation.professionalWhatsapp}?text=${encodeURIComponent(
          whatsappMessage
        )}`;

      window.location.href = whatsappUrl;

      bookingState = {
        serviceId: null,
        professionalId: null,
        date: null,
        time: null,
      };

      form.reset();
      document.getElementById("bookingDate").value = "";

      document.querySelectorAll(".booking-step").forEach((el) => {
        el.classList.remove("active");
      });

      document.querySelectorAll(".step-pill").forEach((el) => {
        el.classList.remove("active");
      });

      document.getElementById("bookingSuccess").classList.add("active");

      await renderReservations();
      renderServiceOptions();
    } catch (error) {
      alert(error.message || "Erro ao criar reserva.");
    }
  });
}

// External quick selectors
function setupQuickSelectors() {
  document.addEventListener("click", (event) => {
    const serviceLink = event.target.closest("[data-select-service]");
    const professionalLink = event.target.closest("[data-select-professional]");

    if (serviceLink) {
      bookingState.serviceId = serviceLink.dataset.selectService;
      renderServiceOptions();

      setTimeout(() => {
        goToStep(2);
      }, 200);
    }

    if (professionalLink) {
      bookingState.professionalId = professionalLink.dataset.selectProfessional;
      renderProfessionalOptions();
    }
  });
}

// Reservations
async function renderReservations(filterPhone = "") {
  const container = document.getElementById("reservationsList");

  try {
    container.innerHTML = `<div class="empty-state">Carregando reservas...</div>`;

    let reservations = await getReservations(filterPhone);

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
                Enviar para o profissional
              </a>

              ${reservation.status !== "cancelada"
            ? `<button class="btn-danger" data-cancel="${reservation._id}">Cancelar reserva</button>`
            : ""
          }
            </div>
          </div>
        `;
      })
      .join("");

    container.querySelectorAll("[data-cancel]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = confirm("Tem certeza que deseja cancelar esta reserva?");
        if (!confirmed) return;

        try {
          const id = button.dataset.cancel;
          await cancelReservation(id);
          await renderReservations(document.getElementById("searchPhone").value);
        } catch (error) {
          alert(error.message || "Erro ao cancelar reserva.");
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Erro ao carregar reservas.</div>`;
  }
}

function createWhatsappMessage(reservation) {
  return `Olá! Novo agendamento na Renovação Barber Shop.

Código: ${reservation.id}

Cliente: ${reservation.clientName}
WhatsApp do cliente: ${reservation.clientPhone}

Serviço: ${reservation.serviceName}
Profissional: ${reservation.professionalName}

Data: ${formatDate(reservation.date)}
Horário: ${reservation.time}

Valor: ${money(reservation.servicePrice)}
Duração: ${reservation.serviceDuration} minutos

Observação: ${reservation.clientNote || "Nenhuma observação."}`;
}

function setupReservationsSearch() {
  document.getElementById("filterReservations").addEventListener("click", async () => {
    await renderReservations(document.getElementById("searchPhone").value);
  });

  document.getElementById("clearFilter").addEventListener("click", async () => {
    document.getElementById("searchPhone").value = "";
    await renderReservations();
  });
}

// Start
document.addEventListener("DOMContentLoaded", () => {
  renderServicesPreview();
  renderServiceOptions();
  renderProfessionalOptions();
  setupDateInput();
  setupBookingForm();
  setupQuickSelectors();
  setupReservationsSearch();
  renderReservations();
});