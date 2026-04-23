const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../database/database.sqlite");

function listarConversas(req, res) {
  const { status } = req.query;
  const db = new sqlite3.Database(dbPath);

  let sql = `
    SELECT
      conversas.id,
      conversas.status,
      conversas.criado_em,
      conversas.atualizado_em,
      contatos.nome AS contato_nome,
      contatos.telefone AS contato_telefone,
      modalidades.nome AS modalidade_nome,
      (
        SELECT mensagens.conteudo
        FROM mensagens
        WHERE mensagens.conversa_id = conversas.id
        ORDER BY mensagens.id DESC
        LIMIT 1
      ) AS ultima_mensagem
    FROM conversas
    INNER JOIN contatos ON contatos.id = conversas.contato_id
    LEFT JOIN modalidades ON modalidades.id = conversas.modalidade_id
  `;

  const params = [];

  if (status) {
    sql += ` WHERE conversas.status = ? `;
    params.push(status);
  }

  sql += ` ORDER BY conversas.atualizado_em DESC `;

  db.all(sql, params, (err, rows) => {
    db.close();

    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    return res.json(rows);
  });
}

function atualizarStatusConversa(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const db = new sqlite3.Database(dbPath);

  db.run(
    `
    UPDATE conversas
    SET status = ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [status, id],
    function (err) {
      db.close();

      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: "Conversa não encontrada" });
      }

      return res.json({
        mensagem: "Status atualizado com sucesso",
        conversa_id: Number(id),
        status,
      });
    }
  );
}
function buscarConversaPorId(req, res) {
  const { id } = req.params;

  const db = new sqlite3.Database(dbPath);

  db.get(
    `
    SELECT
      conversas.id,
      conversas.status,
      conversas.criado_em,
      conversas.atualizado_em,
      contatos.id AS contato_id,
      contatos.nome AS contato_nome,
      contatos.telefone AS contato_telefone,
      modalidades.id AS modalidade_id,
      modalidades.nome AS modalidade_nome
    FROM conversas
    INNER JOIN contatos ON contatos.id = conversas.contato_id
    LEFT JOIN modalidades ON modalidades.id = conversas.modalidade_id
    WHERE conversas.id = ?
    `,
    [id],
    (err, row) => {
      db.close();

      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (!row) {
        return res.status(404).json({ erro: "Conversa não encontrada" });
      }

      return res.json(row);
    }
  );
}
module.exports = {
  listarConversas,
  atualizarStatusConversa,
  buscarConversaPorId,
};