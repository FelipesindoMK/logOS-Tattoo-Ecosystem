// ===========================
//   CONECT TATTOO — supabase-app.js
//   Autenticação real + Perfis + Seguir + Chat (global e privado)
//   Depende de: supabase-config.js (URL/chave) e da lib supabase-js (CDN)
// ===========================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado local simples desta aba/sessão
const ConectState = {
  session: null,
  profile: null,
  activeConversationId: null,
  globalChannel: null,
  privateChannel: null,
};

// ── Helpers de validação ────────────────────────
function validarUsername(v) {
  return /^[a-z0-9_.]{3,20}$/.test(v);
}
function validarSenha(v) {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v);
}

// ── Cadastro real ────────────────────────────────
async function conectSignUp({ username, displayName, email, password, passwordConfirm }) {
  if (!validarUsername(username)) {
    return { error: 'Usuário inválido. Use 3-20 letras minúsculas, números, "." ou "_".' };
  }
  if (displayName.trim().length < 2) {
    return { error: 'Digite seu nome completo.' };
  }
  if (!validarSenha(password)) {
    return { error: 'Senha precisa ter 8+ caracteres, com letra e número.' };
  }
  if (password !== passwordConfirm) {
    return { error: 'As senhas não coincidem.' };
  }

  const { data: existente } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
  if (existente) {
    return { error: 'Esse @usuário já está em uso.' };
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: displayName } }
  });

  if (error) return { error: traduzErroAuth(error) };
  return { data };
}

// ── Login real ───────────────────────────────────
async function conectSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: traduzErroAuth(error) };
  return { data };
}

// ── Logout real ──────────────────────────────────
async function conectSignOut() {
  await sb.auth.signOut();
  ConectState.session = null;
  ConectState.profile = null;
  desconectarCanaisRealtime();
}

function traduzErroAuth(error) {
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('User already registered')) return 'Já existe uma conta com esse e-mail.';
  if (msg.includes('Password should be')) return 'Senha muito curta (mínimo 8 caracteres).';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
  return 'Não deu certo: ' + msg;
}

// ── Carrega o perfil do usuário logado ──────────
async function carregarPerfilAtual() {
  const { data: { session } } = await sb.auth.getSession();
  ConectState.session = session;
  if (!session) { ConectState.profile = null; return null; }

  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  ConectState.profile = profile;
  return profile;
}

// ── Buscar perfis por @usuario ──────────────────
async function buscarPerfis(termo) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, username, display_name, avatar_url, is_public')
    .ilike('username', `%${termo}%`)
    .limit(20);
  return error ? [] : data;
}

// ── Seguir / solicitar seguir ───────────────────
async function solicitarSeguir(followingId) {
  const me = ConectState.session.user.id;
  return sb.from('follows').insert({ follower_id: me, following_id: followingId, status: 'pending' });
}

async function responderSolicitacaoSeguir(followId, aceitar) {
  return sb.from('follows').update({ status: aceitar ? 'accepted' : 'blocked' }).eq('id', followId);
}

async function listarSolicitacoesSeguirRecebidas() {
  const me = ConectState.session.user.id;
  const { data } = await sb
    .from('follows')
    .select('id, follower_id, profiles!follows_follower_id_fkey(username, display_name, avatar_url)')
    .eq('following_id', me)
    .eq('status', 'pending');
  return data || [];
}

// ── Conversas privadas (solicitar / aceitar / bloquear) ──
async function solicitarConversa(outroId) {
  const me = ConectState.session.user.id;
  const [user_a, user_b] = [me, outroId].sort();
  return sb.from('conversations').insert({ user_a, user_b, requested_by: me, status: 'pending' });
}

async function responderConversa(conversationId, aceitar) {
  return sb.from('conversations').update({ status: aceitar ? 'accepted' : 'blocked' }).eq('id', conversationId);
}

async function listarConversas() {
  const me = ConectState.session.user.id;
  const { data } = await sb
    .from('conversations')
    .select('*, perfil_a:profiles!conversations_user_a_fkey(username, display_name, avatar_url), perfil_b:profiles!conversations_user_b_fkey(username, display_name, avatar_url)')
    .or(`user_a.eq.${me},user_b.eq.${me}`)
    .order('created_at', { ascending: false });
  return data || [];
}

async function fixarConversa(conv, fixar) {
  const me = ConectState.session.user.id;
  const campo = conv.user_a === me ? 'pinned_by_a' : 'pinned_by_b';
  return sb.from('conversations').update({ [campo]: fixar }).eq('id', conv.id);
}

// ── Perfil público: editar bio/instagram/público-privado ──
async function atualizarPerfilPublico({ bio, instagramHandle, isPublic }) {
  const me = ConectState.session.user.id;
  return sb.from('profiles').update({
    bio, instagram_handle: instagramHandle, is_public: isPublic
  }).eq('id', me);
}

// ── Upload de avatar ─────────────────────────────
async function enviarAvatar(file) {
  const me = ConectState.session.user.id;
  const path = `${me}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return { error: error.message };
  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  await sb.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', me);
  return { url: data.publicUrl };
}

// ── Upload de foto de trampo (até 5) ────────────
async function listarMinhasFotos() {
  const me = ConectState.session.user.id;
  const { data } = await sb.from('profile_photos').select('*').eq('profile_id', me).order('position');
  return data || [];
}

async function enviarFotoTrampo(file) {
  const me = ConectState.session.user.id;
  const fotosAtuais = await listarMinhasFotos();
  if (fotosAtuais.length >= 5) return { error: 'Limite de 5 fotos atingido. Apague uma antes de enviar outra.' };

  const path = `${me}/trampo-${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await sb.storage.from('trampos').upload(path, file);
  if (error) return { error: error.message };
  const { data } = sb.storage.from('trampos').getPublicUrl(path);

  await sb.from('profile_photos').insert({ profile_id: me, url: data.publicUrl, position: fotosAtuais.length });
  return { url: data.publicUrl };
}

async function apagarFotoTrampo(photoId) {
  return sb.from('profile_photos').delete().eq('id', photoId);
}

// ── Mensagens: global ────────────────────────────
async function carregarMensagensGlobais() {
  const { data } = await sb
    .from('messages')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('channel', 'global')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data || []).reverse();
}

async function enviarMensagemGlobal(texto) {
  const me = ConectState.session.user.id;
  return sb.from('messages').insert({ channel: 'global', sender_id: me, content: texto.trim() });
}

// ── Mensagens: privada ───────────────────────────
async function carregarMensagensConversa(conversationId) {
  const { data } = await sb
    .from('messages')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('channel', 'private')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);
  return data || [];
}

async function enviarMensagemPrivada(conversationId, texto) {
  const me = ConectState.session.user.id;
  return sb.from('messages').insert({
    channel: 'private', conversation_id: conversationId, sender_id: me, content: texto.trim()
  });
}

// ── Tempo real ────────────────────────────────────
function conectarChatGlobal(onNovaMensagem) {
  ConectState.globalChannel = sb
    .channel('chat-global')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'channel=eq.global' },
      (payload) => onNovaMensagem(payload.new))
    .subscribe();
}

function conectarConversaPrivada(conversationId, onNovaMensagem) {
  if (ConectState.privateChannel) sb.removeChannel(ConectState.privateChannel);
  ConectState.privateChannel = sb
    .channel('chat-privado-' + conversationId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onNovaMensagem(payload.new))
    .subscribe();
}

function desconectarCanaisRealtime() {
  if (ConectState.globalChannel) sb.removeChannel(ConectState.globalChannel);
  if (ConectState.privateChannel) sb.removeChannel(ConectState.privateChannel);
}

// ── Expõe pra fora ──
window.ConectAuth = { signUp: conectSignUp, signIn: conectSignIn, signOut: conectSignOut, carregarPerfilAtual, state: ConectState };
window.ConectSocial = { buscarPerfis, solicitarSeguir, responderSolicitacaoSeguir, listarSolicitacoesSeguirRecebidas, solicitarConversa, responderConversa, listarConversas, fixarConversa, atualizarPerfilPublico, enviarAvatar, listarMinhasFotos, enviarFotoTrampo, apagarFotoTrampo };
window.ConectChat = { carregarMensagensGlobais, enviarMensagemGlobal, carregarMensagensConversa, enviarMensagemPrivada, conectarChatGlobal, conectarConversaPrivada };

// ===========================
//   Ligação com a interface (UI)
// ===========================
document.addEventListener('DOMContentLoaded', () => {

  carregarPerfilAtual().then((profile) => {
    if (profile && window.ConectGate) {
      window.ConectGate.enterAsMember(true);
      preencherPerfilNaTela(profile);
    }
  });

  const gateSignup = document.getElementById('gateSignup');
  const signupModal = document.getElementById('gateSignupModal');
  const signupClose = document.getElementById('gateSignupClose');
  const signupForm = document.getElementById('gateSignupForm');
  const signupError = document.getElementById('suError');

  if (gateSignup && signupModal) {
    gateSignup.addEventListener('click', () => { signupModal.style.display = 'flex'; });
  }
  if (signupClose) signupClose.addEventListener('click', () => { signupModal.style.display = 'none'; });

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      signupError.style.display = 'none';
      const username = document.getElementById('suUsername').value.trim().toLowerCase();
      const displayName = document.getElementById('suDisplayName').value.trim();
      const email = document.getElementById('suEmail').value.trim();
      const password = document.getElementById('suPassword').value;
      const passwordConfirm = document.getElementById('suPasswordConfirm').value;

      const btn = signupForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Criando...';

      const { error } = await conectSignUp({ username, displayName, email, password, passwordConfirm });

      btn.disabled = false; btn.textContent = 'Criar conta';

      if (error) {
        signupError.style.color = '';
        signupError.textContent = error;
        signupError.style.display = 'block';
        return;
      }

      signupError.style.display = 'block';
      signupError.style.color = '#4CAF50';
      signupError.textContent = 'Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login.';
      signupForm.reset();
    });
  }

  const gateForm = document.getElementById('gateForm');
  if (gateForm) {
    const emailInput = gateForm.querySelector('input[type="email"]');
    const passInput = gateForm.querySelector('input[type="password"]');

    gateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const btn = gateForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true; btn.textContent = 'Entrando...';

      const { error } = await conectSignIn(emailInput.value.trim(), passInput.value);

      btn.disabled = false; btn.textContent = originalText;

      if (error) { alert(error); return; }

      const profile = await carregarPerfilAtual();
      if (window.ConectGate) window.ConectGate.enterAsMember(true);
      preencherPerfilNaTela(profile);
    }, true);
  }

  const gateInstagram = document.getElementById('gateInstagram');
  if (gateInstagram) {
    gateInstagram.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('Login direto com Instagram ainda não está disponível — por enquanto, cadastre-se com e-mail e senha.');
    }, true);
  }

  [document.getElementById('drawerLogoutLink'), document.getElementById('perfilLogoutBtn')].forEach((btn) => {
    if (btn) btn.addEventListener('click', () => { conectSignOut(); });
  });

  function preencherPerfilNaTela(profile) {
    if (!profile) return;
    const nomeEl = document.getElementById('perfilNome');
    if (nomeEl) nomeEl.textContent = profile.display_name;
    const userEl = document.getElementById('perfilUsername');
    if (userEl) userEl.textContent = '@' + profile.username;

    const bioEl = document.getElementById('perfilBioInput');
    if (bioEl) bioEl.value = profile.bio || '';
    const instaEl = document.getElementById('perfilInstaInput');
    if (instaEl) instaEl.value = profile.instagram_handle || '';
    const publicToggle = document.getElementById('perfilPublicoToggle');
    if (publicToggle) publicToggle.checked = profile.is_public;

    carregarMinhasFotosNaTela();
  }

  // ── Salvar perfil público (bio / instagram / público-privado) ──
  const perfilPublicoForm = document.getElementById('perfilPublicoForm');
  if (perfilPublicoForm) {
    perfilPublicoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bio = document.getElementById('perfilBioInput').value.trim();
      const instagramHandle = document.getElementById('perfilInstaInput').value.trim().replace('@', '');
      const isPublic = document.getElementById('perfilPublicoToggle').checked;
      const btn = perfilPublicoForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Salvando...';
      await atualizarPerfilPublico({ bio, instagramHandle, isPublic });
      btn.disabled = false; btn.textContent = 'Salvar perfil público';
    });
  }

  // ── Avatar ────────────────────────────────────────
  const avatarInput = document.getElementById('perfilAvatarInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files[0];
      if (!file) return;
      const { error, url } = await enviarAvatar(file);
      if (error) { alert('Erro ao enviar foto: ' + error); return; }
      const avatarBig = document.getElementById('perfilAvatarBig');
      if (avatarBig && url) avatarBig.innerHTML = `<img src="${url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    });
  }

  // ── Fotos de trampo (até 5) ────────────────────────
  async function carregarMinhasFotosNaTela() {
    const grid = document.getElementById('perfilFotosGrid');
    if (!grid || !ConectState.session) return;
    const fotos = await listarMinhasFotos();
    grid.innerHTML = fotos.map(f => `
      <div class="perfil-foto-item">
        <img src="${f.url}" alt="Trampo"/>
        <button data-del-foto="${f.id}" title="Apagar">×</button>
      </div>`).join('');
    grid.querySelectorAll('[data-del-foto]').forEach(b =>
      b.addEventListener('click', async () => { await apagarFotoTrampo(b.dataset.delFoto); carregarMinhasFotosNaTela(); }));
  }

  const fotoTrampoInput = document.getElementById('perfilFotoTrampoInput');
  if (fotoTrampoInput) {
    fotoTrampoInput.addEventListener('change', async () => {
      const file = fotoTrampoInput.files[0];
      if (!file) return;
      const { error } = await enviarFotoTrampo(file);
      fotoTrampoInput.value = '';
      if (error) { alert(error); return; }
      carregarMinhasFotosNaTela();
    });
  }

  const chatTabs = document.querySelectorAll('.chat-tab-btn');
  chatTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      chatTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.chat-tab-panel').forEach(p => p.classList.remove('active'));
      const alvo = document.querySelector(`[data-chatpanel="${tab.dataset.chattab}"]`);
      if (alvo) alvo.classList.add('active');

      if (tab.dataset.chattab === 'global') iniciarChatGlobal();
      if (tab.dataset.chattab === 'privado') carregarListaConversas();
      if (tab.dataset.chattab === 'solicitacoes') carregarSolicitacoes();
    });
  });

  let chatGlobalIniciado = false;
  async function iniciarChatGlobal() {
    if (!ConectState.session) return;
    const box = document.getElementById('chatGlobalMessages');
    if (!box) return;
    const mensagens = await carregarMensagensGlobais();
    box.innerHTML = mensagens.map(renderBolhaMensagem).join('');
    box.scrollTop = box.scrollHeight;

    if (!chatGlobalIniciado) {
      conectarChatGlobal(async (msg) => {
        const { data: autor } = await sb.from('profiles').select('username, display_name, avatar_url').eq('id', msg.sender_id).single();
        msg.profiles = autor;
        box.insertAdjacentHTML('beforeend', renderBolhaMensagem(msg));
        box.scrollTop = box.scrollHeight;
      });
      chatGlobalIniciado = true;
    }
  }

  const chatGlobalForm = document.getElementById('chatGlobalForm');
  if (chatGlobalForm) {
    chatGlobalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chatGlobalInput');
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      await enviarMensagemGlobal(texto);
    });
  }

  function renderBolhaMensagem(msg) {
    const autor = msg.profiles ? (msg.profiles.display_name || msg.profiles.username) : 'Alguém';
    const souEu = ConectState.session && msg.sender_id === ConectState.session.user.id;
    return `<div class="chat-bubble ${souEu ? 'chat-bubble-me' : ''}">
      <strong>${escapeHtml(autor)}</strong>
      <p>${escapeHtml(msg.content)}</p>
    </div>`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  async function carregarListaConversas() {
    const lista = document.getElementById('chatConversationsList');
    if (!lista || !ConectState.session) return;
    const conversas = await listarConversas();
    const me = ConectState.session.user.id;

    lista.innerHTML = conversas.filter(c => c.status === 'accepted').map((c) => {
      const outro = c.user_a === me ? c.perfil_b : c.perfil_a;
      const fixado = (c.user_a === me && c.pinned_by_a) || (c.user_b === me && c.pinned_by_b);
      return `<button class="chat-conv-item" data-conv="${c.id}">
        ${fixado ? '📌 ' : ''}${escapeHtml(outro?.display_name || outro?.username || 'Usuário')}
      </button>`;
    }).join('') || '<p class="chat-empty-hint">Nenhuma conversa aceita ainda.</p>';

    lista.querySelectorAll('.chat-conv-item').forEach((btn) => {
      btn.addEventListener('click', () => abrirConversa(btn.dataset.conv, conversas));
    });
  }

  async function abrirConversa(conversationId, conversas) {
    ConectState.activeConversationId = conversationId;
    const area = document.getElementById('chatConversationActive');
    const conv = conversas.find(c => c.id === conversationId);
    const me = ConectState.session.user.id;
    const outro = conv.user_a === me ? conv.perfil_b : conv.perfil_a;

    area.innerHTML = `
      <div class="chat-conv-header">
        <strong>${escapeHtml(outro?.display_name || outro?.username)}</strong>
        <button id="chatPinBtn">${(conv.user_a === me ? conv.pinned_by_a : conv.pinned_by_b) ? 'Desafixar' : 'Fixar'}</button>
      </div>
      <div class="chat-messages" id="chatPrivateMessages"></div>
      <form class="chat-input-row" id="chatPrivateForm">
        <input type="text" id="chatPrivateInput" maxlength="1000" placeholder="Mensagem..."/>
        <button type="submit">Enviar</button>
      </form>`;

    const box = document.getElementById('chatPrivateMessages');
    const mensagens = await carregarMensagensConversa(conversationId);
    box.innerHTML = mensagens.map(renderBolhaMensagem).join('');
    box.scrollTop = box.scrollHeight;

    conectarConversaPrivada(conversationId, async (msg) => {
      const { data: autor } = await sb.from('profiles').select('username, display_name').eq('id', msg.sender_id).single();
      msg.profiles = autor;
      box.insertAdjacentHTML('beforeend', renderBolhaMensagem(msg));
      box.scrollTop = box.scrollHeight;
    });

    document.getElementById('chatPrivateForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chatPrivateInput');
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      await enviarMensagemPrivada(conversationId, texto);
    });

    document.getElementById('chatPinBtn').addEventListener('click', async () => {
      const fixadoAtual = conv.user_a === me ? conv.pinned_by_a : conv.pinned_by_b;
      await fixarConversa(conv, !fixadoAtual);
      carregarListaConversas();
    });
  }

  async function carregarSolicitacoes() {
    const followBox = document.getElementById('chatFollowRequests');
    if (followBox) {
      const pedidos = await listarSolicitacoesSeguirRecebidas();
      followBox.innerHTML = pedidos.map((p) => `
        <div class="chat-request-item">
          <span>${escapeHtml(p.profiles?.display_name || p.profiles?.username)} quer te seguir</span>
          <button data-accept-follow="${p.id}">Aceitar</button>
          <button data-block-follow="${p.id}">Bloquear</button>
        </div>`).join('') || '<p class="chat-empty-hint">Nenhuma solicitação pendente.</p>';

      followBox.querySelectorAll('[data-accept-follow]').forEach(b =>
        b.addEventListener('click', async () => { await responderSolicitacaoSeguir(b.dataset.acceptFollow, true); carregarSolicitacoes(); }));
      followBox.querySelectorAll('[data-block-follow]').forEach(b =>
        b.addEventListener('click', async () => { await responderSolicitacaoSeguir(b.dataset.blockFollow, false); carregarSolicitacoes(); }));
    }

    const convBox = document.getElementById('chatConvRequests');
    if (convBox && ConectState.session) {
      const conversas = await listarConversas();
      const me = ConectState.session.user.id;
      const pendentes = conversas.filter(c => c.status === 'pending' && c.requested_by !== me);
      convBox.innerHTML = pendentes.map((c) => {
        const outro = c.user_a === me ? c.perfil_b : c.perfil_a;
        return `<div class="chat-request-item">
          <span>${escapeHtml(outro?.display_name || outro?.username)} quer conversar</span>
          <button data-accept-conv="${c.id}">Aceitar</button>
          <button data-block-conv="${c.id}">Bloquear</button>
        </div>`;
      }).join('') || '<p class="chat-empty-hint">Nenhuma solicitação pendente.</p>';

      convBox.querySelectorAll('[data-accept-conv]').forEach(b =>
        b.addEventListener('click', async () => { await responderConversa(b.dataset.acceptConv, true); carregarSolicitacoes(); }));
      convBox.querySelectorAll('[data-block-conv]').forEach(b =>
        b.addEventListener('click', async () => { await responderConversa(b.dataset.blockConv, false); carregarSolicitacoes(); }));
    }
  }

  const chatSearchInput = document.getElementById('chatSearchInput');
  if (chatSearchInput) {
    let timer = null;
    chatSearchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const termo = chatSearchInput.value.trim();
        const resultsBox = document.getElementById('chatSearchResults');
        if (!termo) { resultsBox.innerHTML = ''; return; }
        const perfis = await buscarPerfis(termo);
        resultsBox.innerHTML = perfis.map((p) => `
          <div class="chat-request-item">
            <span>@${escapeHtml(p.username)} — ${escapeHtml(p.display_name)}</span>
            <button data-follow="${p.id}">Seguir</button>
            <button data-msg="${p.id}">Conversar</button>
          </div>`).join('') || '<p class="chat-empty-hint">Ninguém encontrado.</p>';

        resultsBox.querySelectorAll('[data-follow]').forEach(b =>
          b.addEventListener('click', async () => { await solicitarSeguir(b.dataset.follow); b.textContent = 'Solicitado'; b.disabled = true; }));
        resultsBox.querySelectorAll('[data-msg]').forEach(b =>
          b.addEventListener('click', async () => { await solicitarConversa(b.dataset.msg); b.textContent = 'Solicitado'; b.disabled = true; }));
      }, 400);
    });
  }
});
