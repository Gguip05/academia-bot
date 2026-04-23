const express = require("express");
const router = express.Router();

const {
  listarModalidades,
  criarModalidade,
} = require("../controllers/modalidadesController");

router.get("/", listarModalidades);
router.post("/", criarModalidade);

module.exports = router;