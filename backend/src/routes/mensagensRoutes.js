const express = require("express");
const router = express.Router();

const {
  listarMensagens,
  enviarMensagem,
} = require("../controllers/mensagensController");

router.get("/:conversaId", listarMensagens);
router.post("/:conversaId", enviarMensagem);

module.exports = router;