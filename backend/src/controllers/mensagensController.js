const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../database/database.sqlite");

function listarMensagens(req, res) {
  const { conversaId } = req.params;

  const db = new sqlite3.Database(dbPath);

  db.all(
    "SELECT * FROM mensagens WHERE conversa_id = ? ORDER BY id ASC",
    [conversaId],
    (err, rows) => {
      db.close();

      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      return res.json(rows);
    }
  );
}

function enviarMensagem(req, res) {
  const { conversaId } = req.params;
  const { conteudo, remetente_tipo } = req.body;

  if (!conteudo || !remetente_tipo) {
    return res.status(400).json({
      erro: "conteudo e remetente_tipo são obrigatórios",
    });
  }

  const db = new sqlite3.Database(dbPath);

  db.run(
    "INSERT INTO mensagens (conversa_id, remetente_tipo, conteudo) VALUES (?, ?, ?)",
    [conversaId, remetente_tipo, conteudo],
    function (err) {
      if (err) {
        db.close();
        return res.status(500).json({ erro: err.message });
      }

      db.run(
        `
  UPDATE conversas
  SET atualizado_em = CURRENT_TIMESTAMP,
      status = 'em_atendimento'
  WHERE id = ?
  `,
        [conversaId],
        (updateErr) => {
          db.close();

          if (updateErr) {
            return res.status(500).json({ erro: updateErr.message });
          }

          return res.json({
            mensagem: "Mensagem enviada com sucesso",
            mensagem_id: this.lastID,
            conversa_id: Number(conversaId),
            remetente_tipo,
            conteudo,
          });
        }
      );
    }
  );
}

module.exports = {
  listarMensagens,
  enviarMensagem,
};