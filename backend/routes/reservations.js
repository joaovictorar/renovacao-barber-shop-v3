const express = require("express");
const Reservation = require("../models/Reservation");

const router = express.Router();

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function hasConflict(existingReservation, newReservation) {
  const existingStart = timeToMinutes(existingReservation.time);
  const existingEnd = existingStart + existingReservation.serviceDuration;

  const newStart = timeToMinutes(newReservation.time);
  const newEnd = newStart + newReservation.serviceDuration;

  return newStart < existingEnd && newEnd > existingStart;
}

// Criar reserva
router.post("/", async (req, res) => {
  try {
    const reservationData = req.body;

    const reservationsSameDay = await Reservation.find({
      professionalId: reservationData.professionalId,
      date: reservationData.date,
      status: { $ne: "cancelada" },
    });

    const conflict = reservationsSameDay.some((reservation) =>
      hasConflict(reservation, reservationData)
    );

    if (conflict) {
      return res.status(409).json({
        message: "Horário indisponível para este profissional.",
      });
    }

    const reservation = await Reservation.create(reservationData);

    return res.status(201).json(reservation);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao criar reserva.",
      error: error.message,
    });
  }
});

// Listar reservas
router.get("/", async (req, res) => {
  try {
    const { date, professionalId, clientPhone } = req.query;

    const filter = {};

    if (date) filter.date = date;
    if (professionalId) filter.professionalId = professionalId;
    if (clientPhone) {
      filter.clientPhone = { $regex: clientPhone, $options: "i" };
    }

    const reservations = await Reservation.find(filter).sort({
      date: 1,
      time: 1,
    });

    return res.json(reservations);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao listar reservas.",
      error: error.message,
    });
  }
});

// Buscar uma reserva
router.get("/:id", async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        message: "Reserva não encontrada.",
      });
    }

    return res.json(reservation);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar reserva.",
      error: error.message,
    });
  }
});

// Cancelar reserva
router.patch("/:id/cancel", async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: "cancelada" },
      { new: true }
    );

    if (!reservation) {
      return res.status(404).json({
        message: "Reserva não encontrada.",
      });
    }

    return res.json(reservation);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao cancelar reserva.",
      error: error.message,
    });
  }
});

// Deletar reserva
router.delete("/:id", async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        message: "Reserva não encontrada.",
      });
    }

    return res.json({
      message: "Reserva removida com sucesso.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao remover reserva.",
      error: error.message,
    });
  }
});

module.exports = router;