const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    servicePrice: {
      type: Number,
      required: true,
    },
    serviceDuration: {
      type: Number,
      required: true,
    },
    professionalId: {
      type: String,
      required: true,
    },
    professionalName: {
      type: String,
      required: true,
    },
    professionalWhatsapp: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientPhone: {
      type: String,
      required: true,
    },
    clientNote: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["confirmada", "cancelada", "finalizada"],
      default: "confirmada",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Reservation", reservationSchema);