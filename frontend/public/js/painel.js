const API_BASE = "";

let conversas = [];
let conversaSelecionada = null;
let mensagensAtuais = [];

const conversationList = document.getElementById("conversationList");
const conversationCount = document.getElementById("conversationCount");
const conversationSearch = document.getElementById("conversationSearch");
const statusFilter = document.getElementById("statusFilter");

const statConversas = document.getElementById("statConversas");
const statNovos = document.getElementById("statNovos");
const statAndamento = document.getElementById("statAndamento");
const statAtualizacao = document.getElementById("statAtualizacao");

const chatAvatar = document.getElementById("chatAvatar");
const chatContactName = document.getElementById("chatContactName");
const chatContactMeta = document.getElementById("chatContactMeta");
const chatMessages = document.getElementById("chatMessages");
const chatStatusSelect = document.getElementById("chatStatusSelect");
const messageInput = document.getElementById("messageInput");
const detailsContent = document.getElementById("detailsContent");

const refreshButton = document.getElementById("refreshButton");
const updateStatusButton = document.getElementById("updateStatusButton");
const sendMessageButton = document.getElementById("sendMessageButton");

function formatStatus(status) {
    const mapa = {
        novo_lead: "Novo lead",
        em_atendimento: "Em atendimento",
        atendido: "Atendido",
    };

    return mapa[status] || status;
}

function formatTimeNow() {
    return new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getInitials(nome) {
    if (!nome) return "?";
    return nome.trim().charAt(0).toUpperCase();
}

function escapeHtml(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function request(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, options);

    if (!response.ok) {
        let errorMessage = "Erro ao comunicar com a API";

        try {
            const errorData = await response.json();
            errorMessage = errorData.erro || errorMessage;
        } catch (_) { }

        throw new Error(errorMessage);
    }

    return response.json();
}

function renderStats() {
    statConversas.textContent = conversas.length;
    statNovos.textContent = conversas.filter(
        (item) => item.status === "novo_lead"
    ).length;
    statAndamento.textContent = conversas.filter(
        (item) => item.status === "em_atendimento"
    ).length;
    statAtualizacao.textContent = formatTimeNow();
}

function getFilteredConversas() {
    const termo = conversationSearch.value.trim().toLowerCase();

    return conversas.filter((item) => {
        const nome = (item.contato_nome || "").toLowerCase();
        const telefone = (item.contato_telefone || "").toLowerCase();
        return nome.includes(termo) || telefone.includes(termo);
    });
}

function renderConversationList() {
    const lista = getFilteredConversas();

    conversationCount.textContent = lista.length;

    if (!lista.length) {
        conversationList.innerHTML = `
      <div class="empty-state">
        Nenhuma conversa encontrada.
      </div>
    `;
        return;
    }

    conversationList.innerHTML = lista
        .map((item) => {
            const ativa = conversaSelecionada?.id === item.id ? "active" : "";
            const preview =
                item.ultima_mensagem || "Sem mensagens recentes nesta conversa.";

            return `
        <div class="conversation-item ${ativa}" data-id="${item.id}">
          <div class="conversation-top">
            <div class="conversation-name">${escapeHtml(item.contato_nome || "Sem nome")}</div>
            <div class="conversation-time">${escapeHtml(
                (item.atualizado_em || "").slice(11, 16) || "--:--"
            )}</div>
          </div>

          <div class="conversation-meta">
            <span class="mini-badge badge-modality">
              ${escapeHtml(item.modalidade_nome || "Sem modalidade")}
            </span>
            <span class="mini-badge badge-status status-${escapeHtml(item.status)}">
              ${escapeHtml(formatStatus(item.status))}
            </span>
          </div>

          <div class="conversation-phone">
            ${escapeHtml(item.contato_telefone || "")}
          </div>

          <div class="conversation-preview">
            ${escapeHtml(preview)}
          </div>
        </div>
      `;
        })
        .join("");

    document.querySelectorAll(".conversation-item").forEach((element) => {
        element.addEventListener("click", () => {
            const id = Number(element.dataset.id);
            selecionarConversa(id);
        });
    });
}

function renderChatHeader(conversa) {
    if (!conversa) {
        chatAvatar.textContent = "?";
        chatContactName.textContent = "Selecione uma conversa";
        chatContactMeta.textContent = "As mensagens aparecerão aqui";
        chatStatusSelect.value = "novo_lead";
        return;
    }

    chatAvatar.textContent = getInitials(conversa.contato_nome);
    chatContactName.textContent = conversa.contato_nome || "Sem nome";
    chatContactMeta.textContent = `${conversa.contato_telefone || ""} • ${conversa.modalidade_nome || "Sem modalidade"
        }`;
    chatStatusSelect.value = conversa.status || "novo_lead";
}

function renderMessages() {
    if (!conversaSelecionada) {
        chatMessages.innerHTML = `
      <div class="empty-state">
        Selecione uma conversa na esquerda para visualizar o atendimento.
      </div>
    `;
        return;
    }

    if (!mensagensAtuais.length) {
        chatMessages.innerHTML = `
      <div class="empty-state">
        Nenhuma mensagem registrada nesta conversa.
      </div>
    `;
        return;
    }

    chatMessages.innerHTML = mensagensAtuais
        .map((mensagem) => {
            const outgoing =
                mensagem.remetente_tipo === "atendente" ||
                mensagem.remetente_tipo === "bot";

            return `
        <div class="message-row ${outgoing ? "outgoing" : "incoming"}">
          <div class="message-bubble">
            <div class="message-text">${escapeHtml(mensagem.conteudo)}</div>
            <div class="message-meta">
              <span>${escapeHtml(mensagem.remetente_tipo)}</span>
              <span>${escapeHtml(
                (mensagem.created_at || "").slice(11, 16) || ""
            )}</span>
            </div>
          </div>
        </div>
      `;
        })
        .join("");

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderDetails() {
    if (!conversaSelecionada) {
        detailsContent.innerHTML = `
      <div class="empty-state">
        Selecione uma conversa para ver os detalhes do lead.
      </div>
    `;
        return;
    }

    detailsContent.innerHTML = `
    <div class="detail-card">
      <h4>Contato</h4>

      <div class="detail-item">
        <span class="detail-label">Nome</span>
        <span class="detail-value">${escapeHtml(
        conversaSelecionada.contato_nome || "Sem nome"
    )}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Telefone</span>
        <span class="detail-value">${escapeHtml(
        conversaSelecionada.contato_telefone || "-"
    )}</span>
      </div>
    </div>

    <div class="detail-card">
      <h4>Conversa</h4>

      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">${escapeHtml(
        formatStatus(conversaSelecionada.status)
    )}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Modalidade</span>
        <span class="detail-value">${escapeHtml(
        conversaSelecionada.modalidade_nome || "-"
    )}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Criada em</span>
        <span class="detail-value">${escapeHtml(
        conversaSelecionada.criado_em || "-"
    )}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Atualizada em</span>
        <span class="detail-value">${escapeHtml(
        conversaSelecionada.atualizado_em || "-"
    )}</span>
      </div>
    </div>
  `;
}

async function carregarConversas() {
    const status = statusFilter.value;
    const query = status ? `?status=${encodeURIComponent(status)}` : "";

    const data = await request(`/conversas${query}`);
    conversas = data.map((item) => ({
        ...item,
        ultima_mensagem: "",
    }));

    renderStats();

    if (conversaSelecionada) {
        const atualizada = conversas.find((item) => item.id === conversaSelecionada.id);
        if (atualizada) {
            conversaSelecionada = { ...conversaSelecionada, ...atualizada };
        }
    }

    renderConversationList();
}

async function carregarMensagens(conversaId) {
    mensagensAtuais = await request(`/mensagens/${conversaId}`);
    renderMessages();
}

async function carregarConversaDetalhe(conversaId) {
    conversaSelecionada = await request(`/conversas/${conversaId}`);
    renderChatHeader(conversaSelecionada);
    renderDetails();
}

async function selecionarConversa(conversaId) {
    await carregarConversaDetalhe(conversaId);
    await carregarMensagens(conversaId);
    renderConversationList();
}

async function atualizarStatus() {
    if (!conversaSelecionada) {
        alert("Selecione uma conversa primeiro.");
        return;
    }

    const status = chatStatusSelect.value;

    await request(`/conversas/${conversaSelecionada.id}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ status }),
    });

    await carregarConversaDetalhe(conversaSelecionada.id);
    await carregarConversas();
    renderDetails();
}

async function enviarMensagem() {
    if (!conversaSelecionada) {
        alert("Selecione uma conversa primeiro.");
        return;
    }

    const conteudo = messageInput.value.trim();
    if (!conteudo) return;

    await request(`/mensagens/${conversaSelecionada.id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            remetente_tipo: "atendente",
            conteudo,
        }),
    });

    messageInput.value = "";
    await carregarMensagens(conversaSelecionada.id);
    await carregarConversaDetalhe(conversaSelecionada.id);
    await carregarConversas();
}

async function init() {
    try {
        await carregarConversas();

        if (conversas.length > 0) {
            await selecionarConversa(conversas[0].id);
        }
    } catch (error) {
        console.error(error);
        conversationList.innerHTML = `
      <div class="empty-state">
        Erro ao carregar painel: ${escapeHtml(error.message)}
      </div>
    `;
    }
}

refreshButton.addEventListener("click", init);
updateStatusButton.addEventListener("click", atualizarStatus);
sendMessageButton.addEventListener("click", enviarMensagem);

conversationSearch.addEventListener("input", renderConversationList);
statusFilter.addEventListener("change", init);

messageInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        await enviarMensagem();
    }
});

init();