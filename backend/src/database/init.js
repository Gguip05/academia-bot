const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "database.sqlite");

function initDb() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Erro ao abrir banco:", err.message);
      return;
    }

    console.log("Banco conectado com sucesso");
  });

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS modalidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS contatos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        telefone TEXT NOT NULL UNIQUE,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS conversas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contato_id INTEGER NOT NULL,
        modalidade_id INTEGER,
        status TEXT NOT NULL DEFAULT 'novo_lead',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contato_id) REFERENCES contatos(id),
        FOREIGN KEY (modalidade_id) REFERENCES modalidades(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversa_id INTEGER NOT NULL,
        remetente_tipo TEXT NOT NULL,
        conteudo TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversa_id) REFERENCES conversas(id)
      )
    `);

    db.get("SELECT COUNT(*) AS count FROM modalidades", [], (err, row) => {
      if (err) {
        console.error("Erro ao contar modalidades:", err.message);
        db.close();
        return;
      }

      if (row.count === 0) {
        const modalidadesIniciais = [
          "Musculação",
          "Natação",
          "Lutas",
          "Pilates",
          "Cross",
          "Coletivas",
        ];

        const stmt = db.prepare("INSERT INTO modalidades (nome) VALUES (?)");

        modalidadesIniciais.forEach((nome) => {
          stmt.run(nome);
        });

        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            console.error("Erro ao finalizar seed:", finalizeErr.message);
          } else {
            console.log("Modalidades iniciais inseridas");
          }

          db.close((closeErr) => {
            if (closeErr) {
              console.error("Erro ao fechar banco:", closeErr.message);
            }
          });
        });

        return;
      }

      db.close((closeErr) => {
        if (closeErr) {
          console.error("Erro ao fechar banco:", closeErr.message);
        }
      });
    });
  });
}

module.exports = initDb;