const express = require("express");
const router = express.Router();

const {
  listarConversas,
  atualizarStatusConversa,
  buscarConversaPorId,
} = require("../controllers/conversasController");

router.get("/", listarConversas);
router.get("/:id", buscarConversaPorId);
router.patch("/:id/status", atualizarStatusConversa);

module.exports = router;