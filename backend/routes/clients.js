const express = require("express");
const Client = require("../models/Client");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const clients = await Client.find().sort({ updatedAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao listar clientes.",
      error: error.message,
    });
  }
});

router.post("/sync-from-reservations", async (req, res) => {
  try {
    const Reservation = require("../models/Reservation");

    const reservations = await Reservation.find({
      status: { $ne: "cancelada" },
    });

    for (const reservation of reservations) {
      if (!reservation.clientPhone || !reservation.clientName) continue;

      const existingClient = await Client.findOne({
        phone: reservation.clientPhone,
      });

      if (existingClient) {
        existingClient.name = reservation.clientName;
        existingClient.totalSpent += Number(reservation.servicePrice || 0);
        existingClient.totalAppointments += 1;
        existingClient.lastAppointmentDate = reservation.date;

        await existingClient.save();
      } else {
        await Client.create({
          name: reservation.clientName,
          phone: reservation.clientPhone,
          totalSpent: Number(reservation.servicePrice || 0),
          totalAppointments: 1,
          lastAppointmentDate: reservation.date,
        });
      }
    }

    res.json({
      message: "Clientes sincronizados com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao sincronizar clientes.",
      error: error.message,
    });
  }
});

module.exports = router;