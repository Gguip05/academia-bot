require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const initDb = require("./database/init");

const authRoutes = require("./routes/authRoutes");
const modalidadesRoutes = require("./routes/modalidadesRoutes");
const contatosRoutes = require("./routes/contatosRoutes");
const conversasRoutes = require("./routes/conversasRoutes");
const mensagensRoutes = require("./routes/mensagensRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.resolve(__dirname, "./database/database.sqlite");

// middlewares globais
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "../../frontend/public")));

// healthcheck
app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensagem: "API Academia rodando 🚀",
  });
});


// rota dinâmica do bot
const SAUDACOES = new Set([
  "oi",
  "ola",
  "olá",
  "bom dia",
  "boa tarde",
  "boa noite",
  "menu",
  "inicio",
  "início",
  "começar",
  "comecar",
]);

const mensagemInicial = `🏋️ *Academia One Saúde & Esportes*

Olá! Seja bem-vindo(a) 👋
Sou o assistente virtual da Academia One.

Escolha uma opção para continuar:

1️⃣ Modalidades
2️⃣ Planos
3️⃣ Estrutura
4️⃣ Horários
5️⃣ Localização
6️⃣ Personal
7️⃣ Aplicativo
8️⃣ Falar com a equipe

Digite o número da opção desejada 👇`;

const respostasMenu = {
  "2": `Perfeito! Vou te ajudar com os *planos* da Academia One.

Posso te explicar:
✔ valores
✔ benefícios
✔ qual plano combina melhor com seu objetivo

Se quiser, já me diga:
👉 você busca emagrecimento, ganho de massa ou condicionamento?`,

  "3": `Ótimo! Vou te passar mais detalhes sobre a *estrutura* da Academia One.

Temos um ambiente pensado para oferecer conforto, organização e uma experiência de treino de alto nível.

Se quiser, posso te encaminhar com nossa equipe para te mostrar tudo com mais detalhes.`,

  "4": `Perfeito! Vou te informar os *horários disponíveis*.

Se quiser agilizar, me diga:
👉 qual período você prefere? manhã, tarde ou noite?`,

  "5": `Certo! Vou te passar a *localização* da Academia One.

Se quiser, também posso deixar seu atendimento encaminhado para nossa equipe te enviar o endereço completo e o melhor ponto de referência.`,

  "6": `Perfeito! Vou te passar informações sobre o serviço de *personal*.

Se quiser adiantar, me diga:
👉 você procura acompanhamento individual, montagem de treino ou foco em resultado específico?`,

  "7": `Ótimo! Vou te ajudar com informações sobre o *aplicativo* da Academia One.

Se quiser, nossa equipe pode te explicar como funciona o acesso e os recursos disponíveis.`,

  "8": `Perfeito! Vou encaminhar seu atendimento para nossa equipe.

Em instantes, um atendente pode continuar com você por aqui 👊`,
};

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function montarMenuModalidades(modalidades) {
  const lista = modalidades.map((m, i) => `${i + 1}️⃣ ${m.nome}`).join("\n");

  return `🔥 *Nossas Modalidades*

${lista}

Digite o número da modalidade 👇`;
}

function montarRespostaModalidade(nomeModalidade) {
  return `Perfeito! Você escolheu *${nomeModalidade}* 💪

Um de nossos atendentes vai te chamar em instantes para te passar:

✔ valores
✔ horários
✔ como funciona

Se quiser adiantar, me diga:
👉 você já pratica ou está começando agora?`;
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

app.post("/mensagem", async (req, res) => {
  const { nome, telefone, mensagem } = req.body;
  const textoOriginal = String(mensagem || "").trim();
  const textoNormalizado = normalizarTexto(textoOriginal);

  if (!telefone || !textoOriginal) {
    return res.status(400).json({
      erro: "telefone e mensagem são obrigatórios",
    });
  }

  const db = new sqlite3.Database(dbPath);

  try {
    const modalidades = await dbAll(
      db,
      "SELECT * FROM modalidades WHERE ativo = 1 ORDER BY id ASC"
    );

    // 1) garante contato
    let contato = await dbGet(
      db,
      "SELECT * FROM contatos WHERE telefone = ?",
      [telefone]
    );

    if (!contato) {
      const insertContato = await dbRun(
        db,
        "INSERT INTO contatos (nome, telefone) VALUES (?, ?)",
        [nome || "Sem nome", telefone]
      );

      contato = {
        id: insertContato.lastID,
        nome: nome || "Sem nome",
        telefone,
      };
    }

    // 2) busca a conversa mais recente desse contato
    let conversa = await dbGet(
      db,
      `
      SELECT *
      FROM conversas
      WHERE contato_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [contato.id]
    );

    if (!conversa) {
      const insertConversa = await dbRun(
        db,
        "INSERT INTO conversas (contato_id, status) VALUES (?, ?)",
        [contato.id, "novo_lead"]
      );

      conversa = {
        id: insertConversa.lastID,
        contato_id: contato.id,
        status: "novo_lead",
        modalidade_id: null,
      };
    }

    // 3) última mensagem da conversa para entender contexto
    const ultimaMensagem = await dbGet(
      db,
      `
      SELECT remetente_tipo, conteudo
      FROM mensagens
      WHERE conversa_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [conversa.id]
    );

    const aguardandoEscolhaDeModalidade =
      ultimaMensagem &&
      ultimaMensagem.remetente_tipo === "bot" &&
      String(ultimaMensagem.conteudo).includes("🔥 *Nossas Modalidades*");

    const salvarTroca = async ({
      conversaId,
      mensagemUsuario,
      respostaBot,
      status = "novo_lead",
      modalidadeId = null,
    }) => {
      await dbRun(
        db,
        "INSERT INTO mensagens (conversa_id, remetente_tipo, conteudo) VALUES (?, ?, ?)",
        [conversaId, "usuario", mensagemUsuario]
      );

      await dbRun(
        db,
        "INSERT INTO mensagens (conversa_id, remetente_tipo, conteudo) VALUES (?, ?, ?)",
        [conversaId, "bot", respostaBot]
      );

      await dbRun(
        db,
        `
        UPDATE conversas
        SET atualizado_em = CURRENT_TIMESTAMP,
            status = ?,
            modalidade_id = COALESCE(modalidade_id, ?)
        WHERE id = ?
        `,
        [status, modalidadeId, conversaId]
      );
    };

    // 4) saudação / reabertura do menu principal
    if (SAUDACOES.has(textoNormalizado)) {
      await salvarTroca({
        conversaId: conversa.id,
        mensagemUsuario: textoOriginal,
        respostaBot: mensagemInicial,
        status: "novo_lead",
      });

      return res.json({
        resposta: mensagemInicial,
        contato_id: contato.id,
        conversa_id: conversa.id,
      });
    }

    // 5) submenu de modalidades
    if (textoOriginal === "1" && !aguardandoEscolhaDeModalidade) {
      const menuModalidades = montarMenuModalidades(modalidades);

      await salvarTroca({
        conversaId: conversa.id,
        mensagemUsuario: textoOriginal,
        respostaBot: menuModalidades,
        status: "novo_lead",
      });

      return res.json({
        resposta: menuModalidades,
        contato_id: contato.id,
        conversa_id: conversa.id,
      });
    }

    // 6) se estiver dentro do submenu, aí sim número = modalidade
    if (aguardandoEscolhaDeModalidade && /^\d+$/.test(textoOriginal)) {
      const escolhaIndex = Number(textoOriginal) - 1;
      const modalidadeEscolhida = modalidades[escolhaIndex];

      if (!modalidadeEscolhida) {
        const menuModalidades = montarMenuModalidades(modalidades);

        await salvarTroca({
          conversaId: conversa.id,
          mensagemUsuario: textoOriginal,
          respostaBot: `Não encontrei essa modalidade.\n\n${menuModalidades}`,
          status: "novo_lead",
        });

        return res.json({
          resposta: `Não encontrei essa modalidade.\n\n${menuModalidades}`,
          contato_id: contato.id,
          conversa_id: conversa.id,
        });
      }

      const respostaBot = montarRespostaModalidade(modalidadeEscolhida.nome);

      await salvarTroca({
        conversaId: conversa.id,
        mensagemUsuario: textoOriginal,
        respostaBot,
        status: "novo_lead",
        modalidadeId: modalidadeEscolhida.id,
      });

      return res.json({
        resposta: respostaBot,
        contato_id: contato.id,
        conversa_id: conversa.id,
        dados: {
          nome: contato.nome,
          telefone: contato.telefone,
          modalidade: modalidadeEscolhida.nome,
        },
      });
    }

    // 7) rotas do menu principal (2 a 8)
    if (respostasMenu[textoOriginal]) {
      const respostaBot = respostasMenu[textoOriginal];

      await salvarTroca({
        conversaId: conversa.id,
        mensagemUsuario: textoOriginal,
        respostaBot,
        status: "novo_lead",
      });

      return res.json({
        resposta: respostaBot,
        contato_id: contato.id,
        conversa_id: conversa.id,
      });
    }

    // 8) fallback amigável
    await salvarTroca({
      conversaId: conversa.id,
      mensagemUsuario: textoOriginal,
      respostaBot: mensagemInicial,
      status: "novo_lead",
    });

    return res.json({
      resposta: mensagemInicial,
      contato_id: contato.id,
      conversa_id: conversa.id,
    });
  } catch (error) {
    return res.status(500).json({
      erro: error.message || "Erro interno ao processar mensagem",
    });
  } finally {
    db.close();
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// força UTF-8
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// rotas da API
app.use("/auth", authRoutes);
app.use("/modalidades", modalidadesRoutes);
app.use("/contatos", contatosRoutes);
app.use("/conversas", conversasRoutes);
app.use("/mensagens", mensagensRoutes);

// rota não encontrada
app.use((req, res) => {
  return res.status(404).json({
    erro: "Rota não encontrada",
  });
});

// inicializa banco antes de subir servidor
initDb();

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});