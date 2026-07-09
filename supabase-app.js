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

// ── Helper de segurança: nunca lê "session.user.id" direto ──────
// Esse era exatamente o bug relatado ("Cannot read properties of null
// (reading 'user')"): alguma função tentava ler ConectState.session antes
// dele existir de verdade. Toda função que precisa do usuário logado passa
// por aqui agora — se não houver sessão, devolve null em vez de quebrar.
function getMeId(userIdExplicito) {
  if (userIdExplicito) return userIdExplicito;
  return ConectState.session && ConectState.session.user ? ConectState.session.user.id : null;
}

// ── Helpers de validação ────────────────────────
function validarUsername(v) {
  return /^[a-z0-9_.]{3,20}$/.test(v);
}
function validarSenha(v) {
  return v.length >= 8 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v);
}

// ── Validação de CPF/CNPJ (dígito verificador) ──
function validarCPF(cpfMasked) {
  const cpf = (cpfMasked || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
}

function validarCNPJ(cnpjMasked) {
  const cnpj = (cnpjMasked || '').replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0, pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0; pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

// ── Cadastro real ────────────────────────────────
const ROLES_VALIDAS = ['tatuador', 'tatuadora', 'estudante', 'cliente'];

async function conectSignUp({
  username, displayName, email, password, passwordConfirm, role, aceiteTermos,
  personType, documentNumber, companyName, nickname, countryCode, state, city, phone
}) {
  if (!validarUsername(username)) {
    return { error: 'Usuário inválido. Use 3-20 letras minúsculas, números, "." ou "_".' };
  }
  if (displayName.trim().length < 2) {
    return { error: 'Digite seu nome e sobrenome.' };
  }
  if (!ROLES_VALIDAS.includes(role)) {
    return { error: 'Selecione quem você é (tatuador, tatuadora, estudante ou cliente).' };
  }
  if (personType === 'juridica') {
    if (!validarCNPJ(documentNumber)) return { error: 'CNPJ inválido.' };
    if (!companyName || companyName.trim().length < 2) return { error: 'Digite a razão social.' };
  } else {
    if (!validarCPF(documentNumber)) return { error: 'CPF inválido.' };
  }
  if (!countryCode) return { error: 'Selecione o país.' };
  if (!state || !state.trim()) return { error: 'Preencha o estado/província.' };
  if (!city || city.trim().length < 2) return { error: 'Digite a cidade.' };
  if (!phone || !phone.trim()) return { error: 'Digite o telefone.' };
  if (!validarSenha(password)) {
    return { error: 'Senha precisa ter 8+ caracteres, com letra e número.' };
  }
  if (password !== passwordConfirm) {
    return { error: 'As senhas não coincidem.' };
  }
  if (!aceiteTermos) {
    return { error: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.' };
  }

  const { data: existente } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
  if (existente) {
    return { error: 'Esse @usuário já está em uso.' };
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        username, display_name: displayName, role,
        person_type: personType, document_number: (documentNumber || '').replace(/\D/g, ''),
        company_name: personType === 'juridica' ? companyName : null,
        nickname: nickname || null,
        country_code: countryCode, state, city, phone
      }
    }
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

// ── Recuperação de senha ─────────────────────────
// Manda um e-mail com um link mágico do próprio Supabase. Ao clicar, a
// pessoa volta pro site já com uma "sessão de recuperação" temporária —
// é essa sessão que autoriza trocar a senha (sem precisar saber a antiga).
async function conectRequestPasswordReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) return { error: traduzErroAuth(error) };
  return { ok: true };
}

// Só funciona de verdade durante uma sessão de recuperação (depois de
// clicar no link do e-mail) — é o próprio Supabase quem valida isso.
async function conectUpdatePassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { error: traduzErroAuth(error) };
  return { ok: true };
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

// ── Buscar um perfil específico por ID (usado na prévia de perfil) ──
async function buscarPerfilPorId(id) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, is_public, country_code')
    .eq('id', id)
    .single();
  if (error) { console.error('[LogOS] erro ao buscar perfil por id:', error); return null; }
  return data;
}

// ── Favoritos / Referências ──────────────────────
// Reaproveita a mesma lógica de "solicitarSeguir": uma tabela genérica de
// relações (profile_relations), diferenciada pelo campo "type". Precisa da
// tabela existir no banco — veja o SQL enviado junto com esse ajuste.
async function alternarRelacao(targetId, tipo, ativar) {
  const me = getMeId();
  if (!me) return { error: 'Você precisa estar logado.' };
  if (ativar) {
    return sb.from('profile_relations').insert({ owner_id: me, target_id: targetId, type: tipo });
  }
  return sb.from('profile_relations').delete().eq('owner_id', me).eq('target_id', targetId).eq('type', tipo);
}

async function estaNaRelacao(targetId, tipo) {
  const me = getMeId();
  if (!me) return false;
  const { data } = await sb.from('profile_relations').select('id')
    .eq('owner_id', me).eq('target_id', targetId).eq('type', tipo).maybeSingle();
  return !!data;
}

async function listarRelacoes(tipo) {
  const me = getMeId();
  if (!me) return [];
  const { data } = await sb.from('profile_relations')
    .select('target_id, profiles!profile_relations_target_id_fkey(id, username, display_name, avatar_url)')
    .eq('owner_id', me).eq('type', tipo)
    .order('created_at', { ascending: false });
  return (data || []).map(r => r.profiles).filter(Boolean);
}

// ── Destaques (stories): fotos de trampo de perfis públicos ──────
async function carregarDestaques() {
  const me = getMeId();
  const { data } = await sb
    .from('profile_photos')
    .select('id, url, profile_id, profiles!inner(id, username, avatar_url, is_public)')
    .eq('profiles.is_public', true)
    .order('created_at', { ascending: false })
    .limit(20);
  if (!data) return [];
  // Agrupa por perfil (pega a foto mais recente de cada um), ignora o próprio usuário
  const porPerfil = new Map();
  for (const item of data) {
    if (item.profile_id === me) continue;
    if (!porPerfil.has(item.profile_id)) porPerfil.set(item.profile_id, item);
  }
  return Array.from(porPerfil.values());
}

async function listarFotosDoPerfil(profileId) {
  const { data } = await sb.from('profile_photos').select('*').eq('profile_id', profileId).order('position');
  return data || [];
}

// ── Seguir / solicitar seguir ───────────────────
async function solicitarSeguir(followingId) {
  const me = getMeId();
  if (!me) return { error: 'Você precisa estar logado para seguir alguém.' };
  return sb.from('follows').insert({ follower_id: me, following_id: followingId, status: 'pending' });
}

async function responderSolicitacaoSeguir(followId, aceitar) {
  return sb.from('follows').update({ status: aceitar ? 'accepted' : 'blocked' }).eq('id', followId);
}

async function listarSolicitacoesSeguirRecebidas() {
  const me = getMeId();
  if (!me) return [];
  const { data } = await sb
    .from('follows')
    .select('id, follower_id, profiles!follows_follower_id_fkey(username, display_name, avatar_url)')
    .eq('following_id', me)
    .eq('status', 'pending');
  return data || [];
}

// ── Conversas privadas (solicitar / aceitar / bloquear) ──
async function solicitarConversa(outroId) {
  const me = getMeId();
  if (!me) return { error: 'Você precisa estar logado para iniciar uma conversa.' };
  const [user_a, user_b] = [me, outroId].sort();
  return sb.from('conversations').insert({ user_a, user_b, requested_by: me, status: 'pending' });
}

async function responderConversa(conversationId, aceitar) {
  return sb.from('conversations').update({ status: aceitar ? 'accepted' : 'blocked' }).eq('id', conversationId);
}

async function listarConversas() {
  const me = getMeId();
  if (!me) return [];
  const { data } = await sb
    .from('conversations')
    .select('*, perfil_a:profiles!conversations_user_a_fkey(username, display_name, avatar_url), perfil_b:profiles!conversations_user_b_fkey(username, display_name, avatar_url)')
    .or(`user_a.eq.${me},user_b.eq.${me}`)
    .order('created_at', { ascending: false });
  return data || [];
}

async function fixarConversa(conv, fixar) {
  const me = getMeId();
  if (!me) return { error: 'Você precisa estar logado.' };
  const campo = conv.user_a === me ? 'pinned_by_a' : 'pinned_by_b';
  return sb.from('conversations').update({ [campo]: fixar }).eq('id', conv.id);
}

// ── Perfil público: editar bio/instagram/público-privado ──
// Aceita um userId explícito (usado logo após login/cadastro, quando ainda
// não dá pra confiar 100% no ConectState.session assíncrono) — se não vier,
// cai pro usuário da sessão atual.
async function atualizarPerfilPublico({ bio, instagramHandle, isPublic, countryCode }, userId) {
  const me = getMeId(userId);
  if (!me) return { error: 'Você precisa estar logado para salvar o perfil.' };
  const payload = { bio, instagram_handle: instagramHandle, is_public: isPublic };
  if (countryCode) payload.country_code = countryCode;
  return sb.from('profiles').update(payload).eq('id', me);
}

// ── Upload de avatar ─────────────────────────────
async function enviarAvatar(file, userId) {
  const me = getMeId(userId);
  if (!me) return { error: 'Você precisa estar logado para enviar uma foto.' };
  const path = `${me}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return { error: error.message };
  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  await sb.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', me);
  return { url: data.publicUrl };
}

// ── Upload de foto de trampo (até 5) ────────────
async function listarMinhasFotos(userId) {
  const me = getMeId(userId);
  if (!me) return [];
  const { data } = await sb.from('profile_photos').select('*').eq('profile_id', me).order('position');
  return data || [];
}

async function enviarFotoTrampo(file, userId) {
  const me = getMeId(userId);
  if (!me) return { error: 'Você precisa estar logado para enviar uma foto.' };
  const fotosAtuais = await listarMinhasFotos(me);
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
  const { data, error } = await sb
    .from('messages')
    .select('*, profiles(username, display_name, avatar_url, country_code)')
    .eq('channel', 'global')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('[LogOS] erro ao carregar mensagens globais:', error);
  return (data || []).reverse();
}

async function enviarMensagemGlobal(texto) {
  const me = getMeId();
  if (!me) return { error: 'Você precisa estar logado para enviar mensagens.' };
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
  const me = getMeId();
  if (!me) return { error: 'Você precisa estar logado para enviar mensagens.' };
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
window.ConectSocial = {
  buscarPerfis, buscarPerfilPorId, solicitarSeguir, responderSolicitacaoSeguir, listarSolicitacoesSeguirRecebidas,
  solicitarConversa, responderConversa, listarConversas, fixarConversa, atualizarPerfilPublico,
  enviarAvatar, listarMinhasFotos, enviarFotoTrampo, apagarFotoTrampo,
  alternarRelacao, estaNaRelacao, listarRelacoes, carregarDestaques, listarFotosDoPerfil
};
window.ConectChat = { carregarMensagensGlobais, enviarMensagemGlobal, carregarMensagensConversa, enviarMensagemPrivada, conectarChatGlobal, conectarConversaPrivada };

// ===========================
//   Ligação com a interface (UI)
// ===========================
document.addEventListener('DOMContentLoaded', () => {

  // ── Sequência obrigatória ao carregar a página ──────────────
  // 1) Pergunta pro Supabase se existe uma sessão válida.
  // 2) Se existir MAS o usuário não marcou "manter conectado" numa visita
  //    anterior, essa sessão é encerrada na hora — regra do sistema, porque
  //    o site guarda dados sensíveis. O gate volta a aparecer.
  // 3) Se existir E ele tinha marcado "manter conectado", libera direto,
  //    sem reabrir o modal de ajuste de perfil (isso é só pra logins novos).
  //
  // O BUG do chat vazio na primeira vez que se abre a Rede era exatamente
  // aqui: essa checagem é assíncrona (leva uma fração de segundo), mas o
  // script.js já escondia o gate e mostrava a Hero 2 na hora, de forma
  // otimista, pra não piscar a tela de login à toa. Se a pessoa clicasse em
  // "Rede" bem rápido, ANTES dessa Promise terminar, `ConectState.session`
  // ainda estava `null` — o chat via isso, desistia de carregar, e nunca
  // tentava de novo sozinho. Por isso resolvia entrar noutra aba e voltar:
  // aí sim a sessão já tinha chegado.
  //
  // A correção: guardamos essa checagem numa Promise só (authProntoPromise)
  // e o chat espera ela terminar antes de decidir se carrega ou não —
  // em vez de checar a sessão na hora e desistir se ainda não chegou.
  const authProntoPromise = carregarPerfilAtual().then(async (profile) => {
    const lembrarConectado = localStorage.getItem('conect_remember') === 'true';

    if (profile && !lembrarConectado) {
      await conectSignOut();
      if (window.ConectGate) window.ConectGate.logoutAndShowGate();
      return;
    }

    if (profile && window.ConectGate) {
      window.ConectGate.enterAsMember(true);
      preencherPerfilNaTela(profile);
      iniciarPreviaRedeGlobal();
    }
  }).catch((err) => {
    // Se isso disparar, vai aparecer em vermelho no Console (F12) — é a
    // forma mais rápida de descobrir por que o "Bem-vindo" ou o chat não
    // atualizaram: alguma coisa nessa checagem inicial quebrou no meio.
    console.error('[LogOS] erro na checagem inicial de sessão:', err);
  });

  // Mostrar/ocultar senha — funciona em qualquer campo com botão .su-eye
  // (cadastro, nova senha na recuperação, etc.), não só num formulário fixo.
  document.addEventListener('click', (e) => {
    const botao = e.target.closest('.su-eye');
    if (!botao) return;
    const input = document.getElementById(botao.dataset.eyeFor);
    if (!input) return;
    const mostrando = input.type === 'text';
    input.type = mostrando ? 'password' : 'text';
    botao.style.opacity = mostrando ? '0.6' : '1';
  });

  // ── Cadastro (modal) ────────────────────────────────────────
  const gateSignup = document.getElementById('gateSignup');
  const signupModal = document.getElementById('gateSignupModal');
  const signupClose = document.getElementById('gateSignupClose');
  const signupForm = document.getElementById('gateSignupForm');
  const signupError = document.getElementById('suError');

  if (gateSignup && signupModal) {
    gateSignup.addEventListener('click', () => { signupModal.style.display = 'flex'; });
  }
  if (signupClose) signupClose.addEventListener('click', () => { signupModal.style.display = 'none'; });

  // ---------- Países (nome, DDI, bandeira, sigla) ----------
  const SU_PAISES = [
    { sigla: 'BR', nome: 'Brasil',         ddi: '+55',  bandeira: '🇧🇷' },
    { sigla: 'PT', nome: 'Portugal',       ddi: '+351', bandeira: '🇵🇹' },
    { sigla: 'US', nome: 'Estados Unidos', ddi: '+1',   bandeira: '🇺🇸' },
    { sigla: 'AR', nome: 'Argentina',      ddi: '+54',  bandeira: '🇦🇷' },
    { sigla: 'UY', nome: 'Uruguai',        ddi: '+598', bandeira: '🇺🇾' },
    { sigla: 'PY', nome: 'Paraguai',       ddi: '+595', bandeira: '🇵🇾' },
    { sigla: 'CL', nome: 'Chile',          ddi: '+56',  bandeira: '🇨🇱' },
    { sigla: 'CO', nome: 'Colômbia',       ddi: '+57',  bandeira: '🇨🇴' },
    { sigla: 'MX', nome: 'México',         ddi: '+52',  bandeira: '🇲🇽' },
    { sigla: 'ES', nome: 'Espanha',        ddi: '+34',  bandeira: '🇪🇸' },
    { sigla: 'FR', nome: 'França',         ddi: '+33',  bandeira: '🇫🇷' },
    { sigla: 'DE', nome: 'Alemanha',       ddi: '+49',  bandeira: '🇩🇪' },
    { sigla: 'IT', nome: 'Itália',         ddi: '+39',  bandeira: '🇮🇹' },
    { sigla: 'GB', nome: 'Reino Unido',    ddi: '+44',  bandeira: '🇬🇧' },
    { sigla: 'CA', nome: 'Canadá',         ddi: '+1',   bandeira: '🇨🇦' },
    { sigla: 'JP', nome: 'Japão',          ddi: '+81',  bandeira: '🇯🇵' },
    { sigla: 'AO', nome: 'Angola',         ddi: '+244', bandeira: '🇦🇴' },
    { sigla: 'MZ', nome: 'Moçambique',     ddi: '+258', bandeira: '🇲🇿' },
  ];

  const SU_ESTADOS_BR = [
    ['AC','Acre'], ['AL','Alagoas'], ['AP','Amapá'], ['AM','Amazonas'],
    ['BA','Bahia'], ['CE','Ceará'], ['DF','Distrito Federal'], ['ES','Espírito Santo'],
    ['GO','Goiás'], ['MA','Maranhão'], ['MT','Mato Grosso'], ['MS','Mato Grosso do Sul'],
    ['MG','Minas Gerais'], ['PA','Pará'], ['PB','Paraíba'], ['PR','Paraná'],
    ['PE','Pernambuco'], ['PI','Piauí'], ['RJ','Rio de Janeiro'], ['RN','Rio Grande do Norte'],
    ['RS','Rio Grande do Sul'], ['RO','Rondônia'], ['RR','Roraima'], ['SC','Santa Catarina'],
    ['SP','São Paulo'], ['SE','Sergipe'], ['TO','Tocantins']
  ];

  const suTipoFisica = document.getElementById('suTipoFisica');
  const suTipoJuridica = document.getElementById('suTipoJuridica');
  const suFieldCPF = document.getElementById('suFieldCPF');
  const suFieldCNPJ = document.getElementById('suFieldCNPJ');
  const suFieldRazao = document.getElementById('suFieldRazao');
  const suCPF = document.getElementById('suCPF');
  const suCNPJ = document.getElementById('suCNPJ');
  const suRazaoSocial = document.getElementById('suRazaoSocial');
  const suErrCPF = document.getElementById('suErrCPF');
  const suErrCNPJ = document.getElementById('suErrCNPJ');
  const suPais = document.getElementById('suPais');
  const suDDI = document.getElementById('suDDI');
  const suTelefone = document.getElementById('suTelefone');
  const suFieldEstadoBR = document.getElementById('suEstadoBR');
  const suFieldEstadoOutro = document.getElementById('suEstadoOutro');
  const suCidade = document.getElementById('suCidade');

  if (signupForm && suPais) {
    // Popula país e estados BR
    SU_PAISES.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.sigla;
      opt.textContent = `${p.bandeira} ${p.nome}`;
      if (p.sigla === 'BR') opt.selected = true;
      suPais.appendChild(opt);
    });
    SU_ESTADOS_BR.forEach(([sigla, nome]) => {
      const opt = document.createElement('option');
      opt.value = sigla;
      opt.textContent = `${nome} (${sigla})`;
      suFieldEstadoBR.appendChild(opt);
    });

    function suAtualizaTipoPessoa() {
      const juridica = suTipoJuridica.checked;
      suFieldCPF.style.display = juridica ? 'none' : 'block';
      suFieldCNPJ.style.display = juridica ? 'block' : 'none';
      suFieldRazao.style.display = juridica ? 'block' : 'none';
      suCPF.required = !juridica;
      suCNPJ.required = juridica;
      if (juridica) { suCPF.value = ''; suErrCPF.textContent = ''; }
      else { suCNPJ.value = ''; suRazaoSocial.value = ''; suErrCNPJ.textContent = ''; }
    }
    suTipoFisica.addEventListener('change', suAtualizaTipoPessoa);
    suTipoJuridica.addEventListener('change', suAtualizaTipoPessoa);

    function suAtualizaPais() {
      const pais = SU_PAISES.find((p) => p.sigla === suPais.value) || SU_PAISES[0];
      const brasil = pais.sigla === 'BR';
      suDDI.textContent = `${pais.bandeira} ${pais.ddi}`;
      suTelefone.placeholder = (brasil ? '(DDD) Telefone' : 'Número de telefone') + ' *';
      suTelefone.value = '';
      suFieldEstadoBR.style.display = brasil ? 'block' : 'none';
      suFieldEstadoOutro.style.display = brasil ? 'none' : 'block';
      suFieldEstadoBR.required = brasil;
      suFieldEstadoOutro.required = !brasil;
      if (brasil) suFieldEstadoOutro.value = ''; else suFieldEstadoBR.selectedIndex = 0;
    }
    suPais.addEventListener('change', suAtualizaPais);

    function suMaskCPF(v) {
      v = v.replace(/\D/g, '').slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      return v;
    }
    function suMaskCNPJ(v) {
      v = v.replace(/\D/g, '').slice(0, 14);
      v = v.replace(/(\d{2})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1/$2');
      v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
      return v;
    }
    function suMaskTelefone(v) {
      v = v.replace(/\D/g, '').slice(0, 11);
      if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
      else v = v.replace(/(\d{0,2})/, '($1');
      return v.trim();
    }
    function suMaskTelefoneGenerico(v) {
      v = v.replace(/\D/g, '').slice(0, 14);
      return v.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
    }

    suCPF.addEventListener('input', (e) => { e.target.value = suMaskCPF(e.target.value); });
    suCNPJ.addEventListener('input', (e) => { e.target.value = suMaskCNPJ(e.target.value); });
    suTelefone.addEventListener('input', (e) => {
      const brasil = suPais.value === 'BR';
      e.target.value = brasil ? suMaskTelefone(e.target.value) : suMaskTelefoneGenerico(e.target.value);
    });
    suCPF.addEventListener('blur', () => {
      if (!suCPF.value) { suErrCPF.textContent = ''; return; }
      suErrCPF.textContent = validarCPF(suCPF.value) ? '' : 'CPF inválido.';
    });
    suCNPJ.addEventListener('blur', () => {
      if (!suCNPJ.value) { suErrCNPJ.textContent = ''; return; }
      suErrCNPJ.textContent = validarCNPJ(suCNPJ.value) ? '' : 'CNPJ inválido.';
    });

    suAtualizaTipoPessoa();
    suAtualizaPais();
  }

  // Modais de Termos de Uso / Política de Privacidade (link dentro do cadastro)
  const suLinkTermos = document.getElementById('suLinkTermos');
  const suLinkPrivacidade = document.getElementById('suLinkPrivacidade');
  if (suLinkTermos) {
    suLinkTermos.addEventListener('click', (e) => {
      e.preventDefault();
      const m = document.getElementById('suModalTermos');
      if (m) m.classList.add('open');
    });
  }
  if (suLinkPrivacidade) {
    suLinkPrivacidade.addEventListener('click', (e) => {
      e.preventDefault();
      const m = document.getElementById('suModalPrivacidade');
      if (m) m.classList.add('open');
    });
  }
  document.querySelectorAll('[data-su-close-legal]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const m = document.getElementById(botao.dataset.suCloseLegal);
      if (m) m.classList.remove('open');
    });
  });
  [document.getElementById('suModalTermos'), document.getElementById('suModalPrivacidade')].forEach((overlay) => {
    if (!overlay) return;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      signupError.style.display = 'none';
      const username = document.getElementById('suUsername').value.trim().toLowerCase();
      const nome = document.getElementById('suNome').value.trim();
      const sobrenome = document.getElementById('suSobrenome').value.trim();
      const displayName = `${nome} ${sobrenome}`.trim();
      const apelido = document.getElementById('suApelido').value.trim();
      const role = document.getElementById('suRole').value;
      const personType = suTipoJuridica.checked ? 'juridica' : 'fisica';
      const documentNumber = personType === 'juridica' ? suCNPJ.value : suCPF.value;
      const companyName = suRazaoSocial.value.trim();
      const countryCode = suPais.value;
      const brasil = countryCode === 'BR';
      const state = brasil ? suFieldEstadoBR.value : suFieldEstadoOutro.value.trim();
      const city = suCidade.value.trim();
      const paisObj = SU_PAISES.find((p) => p.sigla === countryCode) || SU_PAISES[0];
      const phone = `${paisObj.ddi} ${suTelefone.value}`.trim();
      const email = document.getElementById('suEmail').value.trim();
      const password = document.getElementById('suPassword').value;
      const passwordConfirm = document.getElementById('suPasswordConfirm').value;
      const aceiteTermos = document.getElementById('suAceiteTermos').checked;

      const btn = signupForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Criando...';

      const { data, error } = await conectSignUp({
        username, displayName, email, password, passwordConfirm, role, aceiteTermos,
        personType, documentNumber, companyName, nickname: apelido, countryCode, state, city, phone
      });

      btn.disabled = false; btn.textContent = 'Criar conta';

      if (error) {
        signupError.style.color = '';
        signupError.textContent = error;
        signupError.style.display = 'block';
        return;
      }

      signupForm.reset();
      signupModal.style.display = 'none';

      // Se o projeto Supabase tiver confirmação de e-mail desligada (comum
      // em fase de testes), o cadastro já vem com sessão ativa — nesse caso
      // seguimos direto pro fluxo de "recém-logado": perfil pré-formado
      // (criado pelo trigger on_auth_user_created) + modal de ajuste.
      if (data && data.session && data.user) {
        const userId = data.user.id;
        const profile = await carregarPerfilAtual();
        if (window.ConectGate) window.ConectGate.enterAsMember(false); // exige login de novo na próxima visita, a não ser que marque "manter conectado" depois
        preencherPerfilNaTela(profile);
        iniciarPreviaRedeGlobal();
        abrirModalOnboarding(userId);
        return;
      }

      // Confirmação de e-mail exigida: ainda não há sessão de verdade,
      // então não libera nada — pede pra confirmar e depois logar.
      signupError.style.display = 'block';
      signupError.style.color = '#4CAF50';
      signupError.textContent = 'Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login.';
    });
  }

  // ── Login ────────────────────────────────────────────────────
  const gateForm = document.getElementById('gateForm');
  const gateLoginError = document.getElementById('gateLoginError');
  const gateLoginHelpSignup = document.getElementById('gateLoginHelpSignup');

  // Perfil "incompleto" = nunca passou pelo modal de boas-vindas (sem bio e
  // sem foto ainda). Serve pra não ficar mostrando o modal toda hora depois
  // que a pessoa já ajustou o perfil uma vez.
  function perfilEstaIncompleto(profile) {
    if (!profile) return false;
    return !profile.bio && !profile.avatar_url;
  }

  if (gateLoginHelpSignup && signupModal) {
    gateLoginHelpSignup.addEventListener('click', () => {
      if (gateLoginError) gateLoginError.style.display = 'none';
      gateLoginHelpSignup.style.display = 'none';
      signupModal.style.display = 'flex';
    });
  }

  if (gateForm) {
    const emailInput = document.getElementById('gateEmail');
    const passInput = document.getElementById('gatePassword');
    const rememberInput = document.getElementById('gateRememberMe');

    gateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (gateLoginError) { gateLoginError.style.display = 'none'; gateLoginError.style.color = ''; }
      if (gateLoginHelpSignup) gateLoginHelpSignup.style.display = 'none';

      const btn = gateForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true; btn.textContent = 'Entrando...';

      const { data, error } = await conectSignIn(emailInput.value.trim(), passInput.value);

      btn.disabled = false; btn.textContent = originalText;

      if (error) {
        if (gateLoginError) { gateLoginError.textContent = error; gateLoginError.style.display = 'block'; }
        else alert(error);
        // Ajuda a pessoa a entender o que fazer: se a conta não existe ou a
        // senha está errada, mostra o atalho pra criar conta.
        if (gateLoginHelpSignup && (error.includes('incorretos') || error.includes('Confirme seu e-mail'))) {
          gateLoginHelpSignup.style.display = 'block';
        }
        return;
      }

      const lembrar = !!(rememberInput && rememberInput.checked);
      const profile = await carregarPerfilAtual();
      if (window.ConectGate) window.ConectGate.enterAsMember(lembrar);
      preencherPerfilNaTela(profile);
      iniciarPreviaRedeGlobal();

      // Login real confirmado — mostra o modal opcional de ajuste de perfil
      // (foto, bio, instagram) só se ainda não tiver sido preenchido antes.
      // O usuário pode pular ou fechar a qualquer momento.
      const userId = data && data.user ? data.user.id : null;
      if (perfilEstaIncompleto(profile)) abrirModalOnboarding(userId);

      gateForm.reset();
    }, true);
  }

  // ── Esqueci minha senha ──────────────────────────────────────
  const gateForgotLink = document.getElementById('gateForgotLink');
  const forgotPasswordOverlay = document.getElementById('forgotPasswordOverlay');
  const forgotPasswordClose = document.getElementById('forgotPasswordClose');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const forgotPasswordError = document.getElementById('forgotPasswordError');
  const forgotPasswordSuccess = document.getElementById('forgotPasswordSuccess');

  if (gateForgotLink && forgotPasswordOverlay) {
    gateForgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotPasswordError.style.display = 'none';
      forgotPasswordSuccess.style.display = 'none';
      forgotPasswordForm.reset();
      // Aproveita o e-mail já digitado no login, se tiver
      const gateEmailVal = document.getElementById('gateEmail');
      if (gateEmailVal && gateEmailVal.value) document.getElementById('forgotPasswordEmail').value = gateEmailVal.value;
      forgotPasswordOverlay.classList.add('open');
    });
  }
  if (forgotPasswordClose) forgotPasswordClose.addEventListener('click', () => forgotPasswordOverlay.classList.remove('open'));
  if (forgotPasswordOverlay) {
    forgotPasswordOverlay.addEventListener('click', (e) => { if (e.target === forgotPasswordOverlay) forgotPasswordOverlay.classList.remove('open'); });
  }
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      forgotPasswordError.style.display = 'none';
      forgotPasswordSuccess.style.display = 'none';
      const email = document.getElementById('forgotPasswordEmail').value.trim();
      const btn = forgotPasswordForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Enviando...';

      const { error } = await conectRequestPasswordReset(email);

      btn.disabled = false; btn.textContent = 'Enviar link de recuperação';

      if (error) {
        forgotPasswordError.textContent = error;
        forgotPasswordError.style.display = 'block';
        return;
      }
      forgotPasswordSuccess.textContent = 'Link enviado! Confira seu e-mail (e a caixa de spam) e clique nele pra criar uma senha nova.';
      forgotPasswordSuccess.style.display = 'block';
      forgotPasswordForm.reset();
    });
  }

  // ── Definir nova senha (fluxo automático ao clicar no link do e-mail) ──
  // O Supabase detecta sozinho que a pessoa chegou através de um link de
  // recuperação e dispara o evento "PASSWORD_RECOVERY" — é aí que abrimos
  // o modal, sem precisar analisar a URL manualmente.
  const resetPasswordOverlay = document.getElementById('resetPasswordOverlay');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const resetPasswordError = document.getElementById('resetPasswordError');

  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' && resetPasswordOverlay) {
      // Fecha qualquer outro modal que esteja aberto, pra não competir
      if (forgotPasswordOverlay) forgotPasswordOverlay.classList.remove('open');
      if (signupModal) signupModal.style.display = 'none';
      resetPasswordOverlay.classList.add('open');
    }
  });

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetPasswordError.style.display = 'none';
      const novaSenha = document.getElementById('resetPasswordNew').value;
      const confirmar = document.getElementById('resetPasswordConfirm').value;

      if (!validarSenha(novaSenha)) {
        resetPasswordError.textContent = 'A senha precisa ter 8+ caracteres, com letra e número.';
        resetPasswordError.style.display = 'block';
        return;
      }
      if (novaSenha !== confirmar) {
        resetPasswordError.textContent = 'As senhas não coincidem.';
        resetPasswordError.style.display = 'block';
        return;
      }

      const btn = resetPasswordForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Salvando...';

      const { error } = await conectUpdatePassword(novaSenha);

      btn.disabled = false; btn.textContent = 'Salvar nova senha';

      if (error) {
        resetPasswordError.textContent = error;
        resetPasswordError.style.display = 'block';
        return;
      }

      // Por segurança, não deixamos a sessão de recuperação "logada" sozinha —
      // pede um login novo, já com a senha nova, do zero.
      await conectSignOut();
      resetPasswordOverlay.classList.remove('open');
      resetPasswordForm.reset();
      if (window.ConectGate) window.ConectGate.logoutAndShowGate();
      if (gateLoginError) {
        gateLoginError.textContent = '';
        gateLoginError.style.color = '#4CAF50';
        gateLoginError.textContent = 'Senha alterada! Faça login com a senha nova.';
        gateLoginError.style.display = 'block';
      }
    });
  }

  // ── Modal de ajuste de perfil pós-login (skippable) ─────────
  const onboardingOverlay = document.getElementById('onboardingOverlay');
  const onboardingForm = document.getElementById('onboardingForm');
  const onboardingClose = document.getElementById('onboardingClose');
  const onboardingSkip = document.getElementById('onboardingSkip');
  const onboardingAvatarInput = document.getElementById('onboardingAvatarInput');
  const onboardingAvatarPreview = document.getElementById('onboardingAvatarPreview');
  const onboardingError = document.getElementById('onboardingError');
  const onboardingSuccess = document.getElementById('onboardingSuccess');

  let onboardingUserId = null;

  function abrirModalOnboarding(userId) {
    if (!onboardingOverlay || !userId) return;
    onboardingUserId = userId;
    if (onboardingError) onboardingError.style.display = 'none';
    if (onboardingSuccess) onboardingSuccess.style.display = 'none';
    if (onboardingForm) onboardingForm.reset();
    if (onboardingAvatarPreview) onboardingAvatarPreview.innerHTML = '?';
    onboardingOverlay.classList.add('open');
  }

  function fecharModalOnboarding() {
    if (onboardingOverlay) onboardingOverlay.classList.remove('open');
    onboardingUserId = null;
  }

  if (onboardingClose) onboardingClose.addEventListener('click', fecharModalOnboarding);
  if (onboardingSkip) onboardingSkip.addEventListener('click', fecharModalOnboarding);
  if (onboardingOverlay) {
    onboardingOverlay.addEventListener('click', (e) => {
      if (e.target === onboardingOverlay) fecharModalOnboarding();
    });
  }

  if (onboardingAvatarInput) {
    onboardingAvatarInput.addEventListener('change', async () => {
      const file = onboardingAvatarInput.files[0];
      if (!file || !onboardingUserId) return;
      if (onboardingAvatarPreview) onboardingAvatarPreview.textContent = '...';
      const { error, url } = await enviarAvatar(file, onboardingUserId);
      if (error) {
        if (onboardingError) { onboardingError.textContent = 'Erro ao enviar foto: ' + error; onboardingError.style.display = 'block'; }
        if (onboardingAvatarPreview) onboardingAvatarPreview.textContent = '?';
        return;
      }
      if (onboardingAvatarPreview && url) {
        onboardingAvatarPreview.innerHTML = `<img src="${url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">`;
      }
      const avatarBig = document.getElementById('perfilAvatarBig');
      if (avatarBig && url) avatarBig.innerHTML = `<img src="${url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    });
  }

  if (onboardingForm) {
    onboardingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!onboardingUserId) { fecharModalOnboarding(); return; }
      if (onboardingError) onboardingError.style.display = 'none';
      if (onboardingSuccess) onboardingSuccess.style.display = 'none';

      const bio = document.getElementById('onboardingBio').value.trim();
      const instagramHandle = document.getElementById('onboardingInsta').value.trim().replace('@', '');
      const saveBtn = document.getElementById('onboardingSave');
      saveBtn.disabled = true; saveBtn.textContent = 'Salvando...';

      const { error } = await atualizarPerfilPublico({ bio, instagramHandle, isPublic: true }, onboardingUserId);

      saveBtn.disabled = false; saveBtn.textContent = 'Salvar e continuar';

      if (error) {
        if (onboardingError) { onboardingError.textContent = typeof error === 'string' ? error : 'Não foi possível salvar. Tente de novo.'; onboardingError.style.display = 'block'; }
        return;
      }

      const profile = await carregarPerfilAtual();
      preencherPerfilNaTela(profile);

      if (onboardingSuccess) { onboardingSuccess.textContent = 'Perfil salvo!'; onboardingSuccess.style.display = 'block'; }
      setTimeout(fecharModalOnboarding, 900);
    });
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

    // "Bem vindo, Felipe" na Hero 2 — usa o nome de exibição de verdade,
    // não mais um texto fixo tipo "Tatuador".
    const hubWelcomeName = document.getElementById('hubWelcomeName');
    if (hubWelcomeName) hubWelcomeName.textContent = profile.display_name || ('@' + profile.username);

    const bioEl = document.getElementById('perfilBioInput');
    if (bioEl) bioEl.value = profile.bio || '';
    const instaEl = document.getElementById('perfilInstaInput');
    if (instaEl) instaEl.value = profile.instagram_handle || '';
    const paisEl = document.getElementById('perfilPaisInput');
    if (paisEl) paisEl.value = profile.country_code || 'BR';
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
      const paisEl = document.getElementById('perfilPaisInput');
      const countryCode = paisEl ? paisEl.value : undefined;
      const btn = perfilPublicoForm.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Salvando...';
      const { error } = await atualizarPerfilPublico({ bio, instagramHandle, isPublic, countryCode });
      btn.disabled = false; btn.textContent = 'Salvar perfil público';
      if (error) alert(typeof error === 'string' ? error : 'Não foi possível salvar. Faça login novamente e tente de novo.');
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
      if (tab.dataset.chattab === 'favoritos') carregarFavoritos();
      if (tab.dataset.chattab === 'referencias') carregarReferencias();
    });
  });

  let chatGlobalIniciado = false;

  // A assinatura em tempo real do chat global serve tanto pra atualizar as
  // mensagens (quando a tela de Rede está aberta) quanto a barrinha de
  // prévia no widget de canto (que funciona mesmo com a Rede fechada).
  function garantirAssinaturaChatGlobal() {
    if (chatGlobalIniciado) return;
    conectarChatGlobal(async (msg) => {
      const { data: autor } = await sb.from('profiles').select('username, display_name, avatar_url, country_code').eq('id', msg.sender_id).single();
      msg.profiles = autor;
      atualizarPreviaRede(msg);
      const box = document.getElementById('chatGlobalMessages');
      if (box) {
        box.insertAdjacentHTML('beforeend', renderBolhaMensagem(msg));
        box.scrollTop = box.scrollHeight;
      }
    });
    chatGlobalIniciado = true;
  }

  async function iniciarChatGlobal() {
    // Espera a checagem inicial de sessão terminar antes de decidir se carrega.
    // Sem isso, clicar em "Rede" rápido demais (antes da sessão restaurada
    // terminar de carregar) fazia o chat desistir e nunca mais tentar de novo.
    try { await authProntoPromise; } catch (err) { console.error('[Rede] erro ao aguardar sessão:', err); }
    if (!ConectState.session) return;
    const box = document.getElementById('chatGlobalMessages');
    if (!box) return;
    try {
      const mensagens = await carregarMensagensGlobais();
      box.innerHTML = mensagens.map(renderBolhaMensagem).join('');
      box.scrollTop = box.scrollHeight;
      if (mensagens.length) atualizarPreviaRede(mensagens[mensagens.length - 1]);
    } catch (err) {
      console.error('[Rede] erro ao carregar mensagens globais:', err);
      box.innerHTML = '<p class="chat-empty-hint">Não deu pra carregar as mensagens agora. Tenta de novo em alguns segundos.</p>';
    }
    garantirAssinaturaChatGlobal();
  }

  // Carrega só a prévia (barrinha do widget de canto) sem precisar abrir a
  // tela de Rede inteira — chamada assim que o login/sessão é confirmado.
  async function iniciarPreviaRedeGlobal() {
    try { await authProntoPromise; } catch (err) { return; }
    if (!ConectState.session) return;
    try {
      const mensagens = await carregarMensagensGlobais();
      if (mensagens.length) atualizarPreviaRede(mensagens[mensagens.length - 1]);
    } catch (err) {
      console.error('[Rede] erro ao carregar prévia:', err);
    }
    garantirAssinaturaChatGlobal();
  }
  window.ConectChat.iniciarPreviaRedeGlobal = iniciarPreviaRedeGlobal;

  // Exposto pro script.js poder carregar o chat global assim que o painel de
  // Chat é aberto (pela aba do drawer ou pelo botão de chat da Hero 2) — a
  // aba "Global" já abre marcada como ativa no HTML, então sem isso o
  // carregamento só rodava se a pessoa clicasse manualmente na aba.
  window.ConectChat.iniciarChatGlobal = iniciarChatGlobal;

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

  // Converte um código de país (ex: "BR") num emoji de bandeira (🇧🇷),
  // usando os símbolos regionais do Unicode — não precisa de nenhuma imagem.
  function flagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  function renderBolhaMensagem(msg) {
    const perfil = msg.profiles || {};
    const autor = perfil.display_name || perfil.username || 'Alguém';
    const souEu = ConectState.session && msg.sender_id === ConectState.session.user.id;
    const bandeira = flagEmoji(perfil.country_code || 'BR');
    const avatarHtml = perfil.avatar_url
      ? `<img src="${perfil.avatar_url}" alt="">`
      : `<span>${escapeHtml((perfil.username || '?')[0].toUpperCase())}</span>`;

    return `<div class="chat-bubble ${souEu ? 'chat-bubble-me' : ''}">
      ${souEu ? '' : `<div class="chat-bubble-avatar" data-uid="${msg.sender_id}">${avatarHtml}<span class="chat-bubble-flag">${bandeira}</span></div>`}
      <div class="chat-bubble-body">
        <strong ${souEu ? '' : `data-uid="${msg.sender_id}"`}>${escapeHtml(autor)}</strong>
        <p>${escapeHtml(msg.content)}</p>
      </div>
    </div>`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Barrinha de prévia da Rede (no botão do widget de canto) ────
  // Mostra o nick + começo da última mensagem do chat global, sem precisar
  // abrir a tela toda — só um "estão conversando por aqui" visual.
  function atualizarPreviaRede(msg) {
    const barra = document.getElementById('redePreviewText');
    if (!barra || !msg) return;
    const nome = msg.profiles ? (msg.profiles.username || msg.profiles.display_name) : 'alguém';
    barra.textContent = `${nome}: ${msg.content}`;
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
        <button id="chatPinBtn" title="Fixa essa conversa no topo da sua lista — não tem relação com favoritar o perfil da pessoa.">${(conv.user_a === me ? conv.pinned_by_a : conv.pinned_by_b) ? '📌 Fixada no topo (toque pra desafixar)' : '📌 Fixar no topo da lista'}</button>
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

      const badge = document.getElementById('chatBadgeSolicitacoes');
      if (badge) {
        const followBox2 = document.getElementById('chatFollowRequests');
        const totalPendentes = pendentes.length + (followBox2 ? followBox2.querySelectorAll('.chat-request-item').length : 0);
        if (totalPendentes > 0) { badge.textContent = totalPendentes; badge.style.display = 'inline-flex'; }
        else { badge.style.display = 'none'; }
      }
    }
  }

  // ── Favoritos / Referências ─────────────────────
  function renderListaRelacao(perfis, tipo, container) {
    if (!perfis.length) {
      container.innerHTML = `<p class="chat-empty-hint">${tipo === 'favorito' ? 'Nenhum favorito ainda.' : 'Nenhuma referência salva ainda.'}</p>`;
      return;
    }
    container.innerHTML = perfis.map((p) => `
      <div class="chat-request-item">
        <span class="chat-request-item-name">
          <span class="chat-request-item-avatar">${p.avatar_url ? `<img src="${p.avatar_url}" alt="">` : '?'}</span>
          @${escapeHtml(p.username)} — ${escapeHtml(p.display_name)}
        </span>
        <button data-remove-relacao="${p.id}" data-tipo="${tipo}">Remover</button>
      </div>`).join('');

    container.querySelectorAll('[data-remove-relacao]').forEach(b =>
      b.addEventListener('click', async () => {
        await alternarRelacao(b.dataset.removeRelacao, b.dataset.tipo, false);
        if (b.dataset.tipo === 'favorito') carregarFavoritos(); else carregarReferencias();
      }));
  }

  async function carregarFavoritos() {
    const box = document.getElementById('chatFavoritosList');
    if (!box) return;
    renderListaRelacao(await listarRelacoes('favorito'), 'favorito', box);
  }

  async function carregarReferencias() {
    const box = document.getElementById('chatReferenciasList');
    if (!box) return;
    renderListaRelacao(await listarRelacoes('referencia'), 'referencia', box);
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
            <span class="chat-request-item-name">
              <span class="chat-request-item-avatar">${p.avatar_url ? `<img src="${p.avatar_url}" alt="">` : '?'}</span>
              @${escapeHtml(p.username)} — ${escapeHtml(p.display_name)}
            </span>
            <button data-follow="${p.id}">Seguir</button>
            <button data-msg="${p.id}">Conversar</button>
            <button data-fav="${p.id}" title="Favoritar">★</button>
            <button data-ref="${p.id}" title="Referência">🔖</button>
          </div>`).join('') || '<p class="chat-empty-hint">Ninguém encontrado.</p>';

        resultsBox.querySelectorAll('[data-follow]').forEach(b =>
          b.addEventListener('click', async () => { await solicitarSeguir(b.dataset.follow); b.textContent = 'Solicitado'; b.disabled = true; }));
        resultsBox.querySelectorAll('[data-msg]').forEach(b =>
          b.addEventListener('click', async () => { await solicitarConversa(b.dataset.msg); b.textContent = 'Solicitado'; b.disabled = true; }));
        resultsBox.querySelectorAll('[data-fav]').forEach(b =>
          b.addEventListener('click', async () => { await alternarRelacao(b.dataset.fav, 'favorito', true); b.textContent = '✓'; b.disabled = true; }));
        resultsBox.querySelectorAll('[data-ref]').forEach(b =>
          b.addEventListener('click', async () => { await alternarRelacao(b.dataset.ref, 'referencia', true); b.textContent = '✓'; b.disabled = true; }));
      }, 400);
    });
  }

  // ── Emojis de inserção rápida no chat global ────
  const chatEmojiRow = document.getElementById('chatEmojiRow');
  if (chatEmojiRow) {
    chatEmojiRow.querySelectorAll('[data-emoji]').forEach((b) => {
      b.addEventListener('click', () => {
        const input = document.getElementById('chatGlobalInput');
        if (input) { input.value += b.dataset.emoji; input.focus(); }
      });
    });
  }

  // ── Modal de prévia de perfil (clique no nome, no chat global) ──
  const profilePreviewOverlay = document.getElementById('profilePreviewOverlay');
  const profilePreviewClose = document.getElementById('profilePreviewClose');
  const profilePreviewAvatar = document.getElementById('profilePreviewAvatar');
  const profilePreviewFollowBtn = document.getElementById('profilePreviewFollowBtn');
  const profilePreviewFavBtn = document.getElementById('profilePreviewFavBtn');
  const profilePreviewRefBtn = document.getElementById('profilePreviewRefBtn');
  const profilePreviewMsgBtn = document.getElementById('profilePreviewMsgBtn');
  const profilePreviewFullBtn = document.getElementById('profilePreviewFullBtn');
  let previewTargetId = null;
  let previewTargetPerfil = null;

  async function abrirPreviaPerfil(userId) {
    if (!userId || !profilePreviewOverlay) return;
    const perfil = await buscarPerfilPorId(userId);
    if (!perfil) return;
    previewTargetId = userId;
    previewTargetPerfil = perfil;

    document.getElementById('profilePreviewName').textContent = perfil.display_name || perfil.username;
    document.getElementById('profilePreviewUsername').textContent = '@' + perfil.username;
    document.getElementById('profilePreviewBio').textContent = perfil.bio || 'Sem bio ainda.';
    if (profilePreviewAvatar) {
      profilePreviewAvatar.classList.remove('expanded');
      profilePreviewAvatar.innerHTML = perfil.avatar_url ? `<img src="${perfil.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '?';
    }

    if (profilePreviewFollowBtn) { profilePreviewFollowBtn.disabled = false; profilePreviewFollowBtn.textContent = 'Seguir'; }
    if (profilePreviewMsgBtn) { profilePreviewMsgBtn.disabled = false; profilePreviewMsgBtn.textContent = 'Mandar mensagem'; }
    const jaFavorito = await estaNaRelacao(userId, 'favorito');
    const jaReferencia = await estaNaRelacao(userId, 'referencia');
    if (profilePreviewFavBtn) profilePreviewFavBtn.style.color = jaFavorito ? 'var(--rl-line-a)' : '';
    if (profilePreviewRefBtn) profilePreviewRefBtn.style.color = jaReferencia ? 'var(--rl-line-a)' : '';

    profilePreviewOverlay.classList.add('open');
  }

  function fecharPreviaPerfil() {
    if (profilePreviewOverlay) profilePreviewOverlay.classList.remove('open');
    previewTargetId = null;
  }

  if (profilePreviewClose) profilePreviewClose.addEventListener('click', fecharPreviaPerfil);
  if (profilePreviewOverlay) profilePreviewOverlay.addEventListener('click', (e) => { if (e.target === profilePreviewOverlay) fecharPreviaPerfil(); });

  // Toque na foto pequena = amplia ali mesmo; toca de novo = fecha e volta ao normal.
  if (profilePreviewAvatar) {
    profilePreviewAvatar.addEventListener('click', () => {
      profilePreviewAvatar.classList.toggle('expanded');
    });
  }

  if (profilePreviewFollowBtn) {
    profilePreviewFollowBtn.addEventListener('click', async () => {
      if (!previewTargetId) return;
      await solicitarSeguir(previewTargetId);
      profilePreviewFollowBtn.textContent = 'Solicitado'; profilePreviewFollowBtn.disabled = true;
    });
  }
  if (profilePreviewFavBtn) {
    profilePreviewFavBtn.addEventListener('click', async () => {
      if (!previewTargetId) return;
      const ativo = profilePreviewFavBtn.style.color !== '';
      await alternarRelacao(previewTargetId, 'favorito', !ativo);
      profilePreviewFavBtn.style.color = ativo ? '' : 'var(--rl-line-a)';
    });
  }
  if (profilePreviewRefBtn) {
    profilePreviewRefBtn.addEventListener('click', async () => {
      if (!previewTargetId) return;
      const ativo = profilePreviewRefBtn.style.color !== '';
      await alternarRelacao(previewTargetId, 'referencia', !ativo);
      profilePreviewRefBtn.style.color = ativo ? '' : 'var(--rl-line-a)';
    });
  }
  // "Mandar mensagem" cria a solicitação de conversa — some pra fila de
  // "Pedidos de conversa" (aba Solicitações) do outro tatuador. Só vira
  // conversa de verdade depois que ele aceitar.
  if (profilePreviewMsgBtn) {
    profilePreviewMsgBtn.addEventListener('click', async () => {
      if (!previewTargetId) return;
      const { error } = await solicitarConversa(previewTargetId);
      profilePreviewMsgBtn.disabled = true;
      profilePreviewMsgBtn.textContent = error ? 'Já solicitado' : 'Solicitação enviada';
    });
  }
  if (profilePreviewFullBtn) {
    profilePreviewFullBtn.addEventListener('click', () => {
      if (!previewTargetId) return;
      abrirPerfilCompleto(previewTargetId, previewTargetPerfil);
    });
  }

  // Clique delegado nos nomes das mensagens do chat global/privado (abre a prévia)
  document.addEventListener('click', (e) => {
    const nome = e.target.closest('[data-uid]');
    if (nome) abrirPreviaPerfil(nome.dataset.uid);
  });

  // ── Tela de Perfil Completo (modelo inicial) ────
  const fullProfileOverlay = document.getElementById('fullProfileOverlay');
  const fullProfileClose = document.getElementById('fullProfileClose');
  const fullProfileFollowBtn = document.getElementById('fullProfileFollowBtn');
  const fullProfileFavBtn = document.getElementById('fullProfileFavBtn');
  const fullProfileRefBtn = document.getElementById('fullProfileRefBtn');
  const fullProfileMsgBtn = document.getElementById('fullProfileMsgBtn');
  let fullProfileTargetId = null;

  async function abrirPerfilCompleto(userId, perfilJaCarregado) {
    if (!userId || !fullProfileOverlay) return;
    const perfil = perfilJaCarregado || await buscarPerfilPorId(userId);
    if (!perfil) return;
    fullProfileTargetId = userId;

    document.getElementById('fullProfileName').textContent = perfil.display_name || perfil.username;
    document.getElementById('fullProfileUsername').textContent = '@' + perfil.username;
    document.getElementById('fullProfileBio').textContent = perfil.bio || 'Sem bio ainda.';
    const avatarEl = document.getElementById('fullProfileAvatar');
    avatarEl.innerHTML = perfil.avatar_url ? `<img src="${perfil.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '?';

    const instaLink = document.getElementById('fullProfileInsta');
    if (perfil.instagram_handle) {
      instaLink.href = `https://instagram.com/${perfil.instagram_handle}`;
      instaLink.textContent = '@' + perfil.instagram_handle + ' no Instagram ↗';
      instaLink.style.display = 'inline';
    } else {
      instaLink.style.display = 'none';
    }

    if (fullProfileFollowBtn) { fullProfileFollowBtn.disabled = false; fullProfileFollowBtn.textContent = 'Seguir'; }
    if (fullProfileMsgBtn) { fullProfileMsgBtn.disabled = false; fullProfileMsgBtn.textContent = 'Mandar mensagem'; }
    const jaFavorito = await estaNaRelacao(userId, 'favorito');
    const jaReferencia = await estaNaRelacao(userId, 'referencia');
    if (fullProfileFavBtn) fullProfileFavBtn.style.color = jaFavorito ? 'var(--rl-line-a)' : '';
    if (fullProfileRefBtn) fullProfileRefBtn.style.color = jaReferencia ? 'var(--rl-line-a)' : '';

    const fotos = await listarFotosDoPerfil(userId);
    const grid = document.getElementById('fullProfileFotosGrid');
    grid.innerHTML = fotos.length
      ? fotos.map(f => `<div class="perfil-foto-item"><img src="${f.url}" alt=""></div>`).join('')
      : '<p class="chat-empty-hint">Sem fotos de trabalho ainda.</p>';

    fecharPreviaPerfil();
    fullProfileOverlay.classList.add('open');
  }

  function fecharPerfilCompleto() {
    if (fullProfileOverlay) fullProfileOverlay.classList.remove('open');
    fullProfileTargetId = null;
  }

  if (fullProfileClose) fullProfileClose.addEventListener('click', fecharPerfilCompleto);
  if (fullProfileOverlay) fullProfileOverlay.addEventListener('click', (e) => { if (e.target === fullProfileOverlay) fecharPerfilCompleto(); });
  if (fullProfileFollowBtn) {
    fullProfileFollowBtn.addEventListener('click', async () => {
      if (!fullProfileTargetId) return;
      await solicitarSeguir(fullProfileTargetId);
      fullProfileFollowBtn.textContent = 'Solicitado'; fullProfileFollowBtn.disabled = true;
    });
  }
  if (fullProfileFavBtn) {
    fullProfileFavBtn.addEventListener('click', async () => {
      if (!fullProfileTargetId) return;
      const ativo = fullProfileFavBtn.style.color !== '';
      await alternarRelacao(fullProfileTargetId, 'favorito', !ativo);
      fullProfileFavBtn.style.color = ativo ? '' : 'var(--rl-line-a)';
    });
  }
  if (fullProfileRefBtn) {
    fullProfileRefBtn.addEventListener('click', async () => {
      if (!fullProfileTargetId) return;
      const ativo = fullProfileRefBtn.style.color !== '';
      await alternarRelacao(fullProfileTargetId, 'referencia', !ativo);
      fullProfileRefBtn.style.color = ativo ? '' : 'var(--rl-line-a)';
    });
  }
  if (fullProfileMsgBtn) {
    fullProfileMsgBtn.addEventListener('click', async () => {
      if (!fullProfileTargetId) return;
      const { error } = await solicitarConversa(fullProfileTargetId);
      fullProfileMsgBtn.disabled = true;
      fullProfileMsgBtn.textContent = error ? 'Já solicitado' : 'Solicitação enviada';
    });
  }

  // ── Barra de destaques (stories): fotos de trampo de outros tatuadores ──
  const redeStoriesBar = document.getElementById('redeStoriesBar');
  const redeStoriesEmpty = document.getElementById('redeStoriesEmpty');
  const storyViewerOverlay = document.getElementById('storyViewerOverlay');
  const storyViewerImage = document.getElementById('storyViewerImage');
  const storyViewerName = document.getElementById('storyViewerName');
  const storyViewerClose = document.getElementById('storyViewerClose');
  const storyViewerBurst = document.getElementById('storyViewerBurst');
  const storyReactionRow = document.getElementById('storyReactionRow');

  async function carregarDestaquesUI() {
    if (!redeStoriesBar || !ConectState.session) return;
    const destaques = await carregarDestaques();
    redeStoriesBar.querySelectorAll('.rede-story:not(.rede-story-add)').forEach(el => el.remove());
    if (redeStoriesEmpty) redeStoriesEmpty.style.display = destaques.length ? 'none' : 'block';

    destaques.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'rede-story';
      el.innerHTML = `
        <div class="rede-story-ring"><img src="${item.url}" alt=""></div>
        <span>@${escapeHtml(item.profiles.username)}</span>`;
      el.addEventListener('click', () => abrirDestaque(item));
      redeStoriesBar.appendChild(el);
    });
  }

  function abrirDestaque(item) {
    if (!storyViewerOverlay) return;
    storyViewerImage.src = item.url;
    storyViewerName.textContent = '@' + item.profiles.username;
    storyViewerOverlay.classList.add('open');
  }

  if (storyViewerClose) storyViewerClose.addEventListener('click', () => storyViewerOverlay.classList.remove('open'));
  if (storyViewerOverlay) storyViewerOverlay.addEventListener('click', (e) => { if (e.target === storyViewerOverlay) storyViewerOverlay.classList.remove('open'); });

  // Reação por emoji nos destaques — feedback visual na hora (ainda não fica
  // salvo no banco; dá pra guardar de verdade numa próxima fase, se quiser).
  if (storyReactionRow) {
    storyReactionRow.querySelectorAll('[data-emoji]').forEach((b) => {
      b.addEventListener('click', () => {
        if (!storyViewerBurst) return;
        const span = document.createElement('span');
        span.textContent = b.dataset.emoji;
        span.style.left = (30 + Math.random() * 40) + '%';
        storyViewerBurst.appendChild(span);
        setTimeout(() => span.remove(), 1100);
      });
    });
  }

  // "Postar" no topo da barra de destaques — reaproveita o upload de foto de
  // trampo (o mesmo do My Studio); a foto entra na vitrine automaticamente
  // porque os destaques são lidos direto das fotos de trampo públicas.
  const redeStoryAdd = document.getElementById('redeStoryAdd');
  if (redeStoryAdd) {
    redeStoryAdd.addEventListener('click', () => {
      const tempInput = document.createElement('input');
      tempInput.type = 'file'; tempInput.accept = 'image/*';
      tempInput.addEventListener('change', async () => {
        const file = tempInput.files[0];
        if (!file) return;
        const { error } = await enviarFotoTrampo(file);
        if (error) { alert(error); return; }
        carregarDestaquesUI();
        carregarMinhasFotosNaTela();
      });
      tempInput.click();
    });
  }

  // Carrega os destaques toda vez que o painel de Rede é aberto
  window.ConectChat.carregarDestaquesUI = carregarDestaquesUI;
  const iniciarChatGlobalOriginal = iniciarChatGlobal;
  window.ConectChat.iniciarChatGlobal = async function () {
    await iniciarChatGlobalOriginal();
    carregarDestaquesUI();
    carregarSolicitacoes(); // mantém o número no ícone de Solicitações sempre atualizado
  };
});
