const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../database/database.sqlite");

function listarModalidades(req, res) {
  const db = new sqlite3.Database(dbPath);

  db.all(
    "SELECT * FROM modalidades WHERE ativo = 1 ORDER BY id ASC",
    [],
    (err, rows) => {
      db.close();

      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      return res.json(rows);
    }
  );
}

function criarModalidade(req, res) {
  const { nome, descricao } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório" });
  }

  const db = new sqlite3.Database(dbPath);

  db.run(
    "INSERT INTO modalidades (nome, descricao) VALUES (?, ?)",
    [nome, descricao || null],
    function (err) {
      db.close();

      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      return res.json({
        id: this.lastID,
        nome,
        descricao: descricao || null,
      });
    }
  );
}

module.exports = {
  listarModalidades,
  criarModalidade,
};