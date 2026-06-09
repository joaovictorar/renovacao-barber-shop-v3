const express = require("express");
const Professional = require("../models/Professional");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const professionals = await Professional.find().sort({ name: 1 });
    res.json(professionals);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar profissionais." });
  }
});

router.post("/", async (req, res) => {
  try {
    const professional = await Professional.create(req.body);
    res.status(201).json(professional);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao cadastrar profissional.",
      error: error.message,
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const professional = await Professional.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(professional);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar profissional." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Professional.findByIdAndDelete(req.params.id);
    res.json({ message: "Profissional removido com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao remover profissional." });
  }
});

module.exports = router;