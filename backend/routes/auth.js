const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const router = express.Router();

router.post("/setup", async (req, res) => {
  try {
    const adminExists = await Admin.findOne({ email: "admin@renovacao.com" });

    if (adminExists) {
      return res.status(400).json({ message: "Admin já existe." });
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await Admin.create({
      name: "Administrador",
      email: "admin@renovacao.com",
      password: hashedPassword,
      role: "admin",
    });

    return res.status(201).json({
      message: "Admin criado com sucesso.",
      email: admin.email,
      senha: "admin123",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao criar admin.",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "E-mail ou senha inválidos." });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "E-mail ou senha inválidos." });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        professionalId: admin.professionalId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        professionalId: admin.professionalId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao fazer login.",
      error: error.message,
    });
  }
});

router.post("/create-barber-user", async (req, res) => {
  try {
    const { name, email, password, professionalId } = req.body;

    const userExists = await Admin.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "Usuário já existe.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const barberUser = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "barbeiro",
      professionalId,
    });

    return res.status(201).json({
      message: "Usuário barbeiro criado com sucesso.",
      user: {
        id: barberUser._id,
        name: barberUser.name,
        email: barberUser.email,
        role: barberUser.role,
        professionalId: barberUser.professionalId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao criar usuário barbeiro.",
      error: error.message,
    });
  }
});

module.exports = router;