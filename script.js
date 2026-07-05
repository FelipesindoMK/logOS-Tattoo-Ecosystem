// ===========================
//   CONECT TATTOO — script.js
// ===========================

document.addEventListener('DOMContentLoaded', () => {

  // ── TEMA: CLEAN / DARK / TEC ─────────────────────
  const htmlEl = document.documentElement;
  const themeButtons = document.querySelectorAll('.hub-theme-btn');
  const validThemes = ['clean', 'dark', 'tec'];
  const savedTheme = localStorage.getItem('conectTattooTheme');
  const initialTheme = validThemes.includes(savedTheme) ? savedTheme : 'dark';
  htmlEl.setAttribute('data-theme', initialTheme);

  function setActiveThemeButton(theme) {
    themeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-theme-option') === theme);
    });
  }
  setActiveThemeButton(initialTheme);

  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme-option');
      if (!validThemes.includes(theme)) return;
      htmlEl.setAttribute('data-theme', theme);
      localStorage.setItem('conectTattooTheme', theme);
      setActiveThemeButton(theme);
    });
  });

  // ── NOME DO USUÁRIO NO "BEM VINDO" ─────────────────────
  const welcomeName = document.getElementById('hubWelcomeName');
  if (welcomeName) {
    const savedName = localStorage.getItem('conectTattooUserName');
    if (savedName) welcomeName.textContent = savedName;
  }

  // ── GATE (porta de entrada) ─────────────────────
  // O acesso ao site só é liberado pelo supabase-app.js, depois de uma
  // autenticação REAL (login ou cadastro) bem-sucedida no Supabase — este
  // arquivo cuida só da parte visual do gate (mostrar/esconder, tema, drawer).
  // Não existe mais acesso como visitante: sem conta, não passa da Hero 1.
  const gate = document.getElementById('gate');
  const gateCard = document.getElementById('gateCard');
  const gateScrollHint = document.getElementById('gateScrollHint');
  const gateForm = document.getElementById('gateForm');
  const gateSignup = document.getElementById('gateSignup');
  const gateInstagram = document.getElementById('gateInstagram');

  const drawerLoginLink = document.getElementById('drawerLoginLink');
  const drawerCadastroLink = document.getElementById('drawerCadastroLink');
  const drawerProfileLink = document.getElementById('drawerProfileLink');
  const drawerChatLink = document.getElementById('drawerChatLink');
  const drawerLogoutLink = document.getElementById('drawerLogoutLink');

  function getAccessType() {
    return localStorage.getItem('conect_access'); // 'member' | null
  }

  function setAccessType(type) {
    localStorage.setItem('conect_access', type);
  }

  // ── PWA / Persistência de login ─────────────────
  // "Manter conectado": regra do sistema.
  // - Se o usuário MARCAR a caixinha no login, a sessão real do Supabase
  //   fica valendo entre visitas (inclusive abrindo pelo atalho da PWA).
  // - Se ele NÃO marcar, o supabase-app.js força um logout automático toda
  //   vez que o site é reaberto, mesmo que o Supabase tenha guardado a sessão
  //   sozinho no localStorage — porque o site lida com dados sensíveis.
  // A flag abaixo é só a "preferência" marcada pelo usuário; quem decide de
  // fato se a sessão é válida é sempre o Supabase (supabase-app.js).
  function getLembrarConectado() {
    return localStorage.getItem('conect_remember') === 'true';
  }

  function setLembrarConectado(valor) {
    localStorage.setItem('conect_remember', valor ? 'true' : 'false');
  }

  // Usado só pra decidir a UI ANTES do supabase-app.js confirmar a sessão de
  // verdade (evita o "flash" do gate aparecendo e sumindo rapidinho).
  function pareceTerSessaoSupabase() {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  }

  // Mantidos por compatibilidade: refletem o acesso "member" na tela (drawer,
  // cabeçalho do perfil etc.) — quem manda ligar/desligar isso de verdade é
  // sempre a autenticação real do Supabase, nunca estes helpers sozinhos.
  function getAuthToken() {
    return getLembrarConectado() ? 'ok' : null;
  }

  function reflectAccessInUI() {
    const access = getAccessType();
    const isMember = access === 'member';
    const hasToken = !!getAuthToken();

    // Link de Perfil só aparece pra quem é membro (cadastrado/logado).
    if (drawerProfileLink) drawerProfileLink.style.display = isMember ? 'flex' : 'none';
    if (drawerChatLink) drawerChatLink.style.display = isMember ? 'flex' : 'none';
    if (drawerLoginLink) drawerLoginLink.style.display = isMember ? 'none' : 'flex';
    if (drawerCadastroLink) drawerCadastroLink.style.display = isMember ? 'none' : 'flex';
    // "Trocar de conta / Sair" só aparece quando o login está persistente (com authToken)
    if (drawerLogoutLink) drawerLogoutLink.style.display = (isMember && hasToken) ? 'flex' : 'none';

    // Reflete também na seção de Perfil (placeholder — preencherPerfilNaTela
    // no supabase-app.js substitui isso pelos dados reais assim que carrega)
    const perfilNome = document.getElementById('perfilNome');
    const perfilPlanoTag = document.getElementById('perfilPlanoTag');
    const perfilAvatarBig = document.getElementById('perfilAvatarBig');
    if (perfilNome && perfilPlanoTag && perfilAvatarBig && isMember) {
      perfilPlanoTag.textContent = 'Plano Free';
    }
  }

  function openSite() {
    gate.classList.add('gate-hidden');
    document.body.style.overflow = '';
    document.body.classList.remove('gate-locked');
  }

  // Leva o usuário direto pra seção "Meu Perfil" (2ª opção do menu, logo
  // após "Voltar ao início") — é a tela que funciona como home nativa do
  // app quando ele já está logado (ex: abrindo pelo atalho da PWA).
  // Usa requestAnimationFrame porque openContentPanel/contentOverlay só
  // terminam de ser inicializados mais abaixo neste mesmo DOMContentLoaded;
  // no próximo frame, o carregamento síncrono já terminou e tudo já existe.
  function goToPerfilHub() {
    requestAnimationFrame(() => openContentPanel('panel-perfilhub'));
  }

  // Chamado pelo supabase-app.js SOMENTE depois de confirmar uma sessão real
  // (login ou cadastro bem-sucedidos no Supabase). "persist" aqui só controla
  // se a preferência "manter conectado" fica marcada pra próxima visita.
  function enterAsMember(persist) {
    setAccessType('member');
    setLembrarConectado(!!persist);
    reflectAccessInUI();
    openSite();
  }

  // Chamado tanto pelo botão "Sair" quanto pelo supabase-app.js quando a
  // sessão precisa ser encerrada (logout manual ou "manter conectado" não
  // marcado numa visita anterior).
  function logoutAndShowGate() {
    localStorage.removeItem('conect_access');
    setLembrarConectado(false);
    reflectAccessInUI();
    gate.classList.remove('gate-hidden');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('gate-locked');
    window.scrollTo({ top: 0 });
  }

  // Tela principal fixa é a HERO (menu radial) — não navega mais direto pro
  // "My Studio". Só garante que o site abre e o overlay de conteúdo (se
  // tiver algum painel aberto de uma visita anterior) comece fechado.
  function goToHeroMenu() {
    requestAnimationFrame(() => {
      const overlay = document.getElementById('contentOverlay');
      if (overlay) overlay.classList.remove('open');
    });
  }

  // Enquanto o supabase-app.js confirma (de forma assíncrona) se a sessão
  // guardada ainda é válida, decide uma UI inicial razoável pra evitar o
  // "flash" do gate aparecendo e sumindo: se o usuário marcou "manter
  // conectado" da última vez E parece haver uma sessão do Supabase salva,
  // já libera a tela; senão, mantém o gate fechado (login obrigatório).
  if (getLembrarConectado() && pareceTerSessaoSupabase()) {
    reflectAccessInUI();
    gate.classList.add('gate-hidden');
    document.body.style.overflow = '';
    document.body.classList.remove('gate-locked');
    goToHeroMenu();
  } else {
    reflectAccessInUI(); // ainda reflete o estado salvo (ex: ícone de perfil), só não pula o gate
    document.body.style.overflow = 'hidden';
    document.body.classList.add('gate-locked');
  }

  // gateForm, gateSignup e gateInstagram NÃO liberam mais o acesso sozinhos
  // aqui — quem faz isso é o supabase-app.js, só depois de confirmar login
  // ou cadastro reais. Isso evita a tela ficar travada em "salvando" com uma
  // sessão falsa (o bug que motivou esse ajuste). Não existe mais botão de
  // "visitante": sem conta real, não sai da Hero 1.

  if (drawerLogoutLink) {
    drawerLogoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      logoutAndShowGate();
    });
  }

  // Expõe pro supabase-app.js poder abrir/fechar o gate a partir do login/logout reais
  window.ConectGate = { enterAsMember, logoutAndShowGate, reflectAccessInUI, goToPerfilHub };

  // Enquanto o gate estiver ativo: tentar rolar mostra o aviso piscando,
  // mas não libera a navegação de verdade.
  function triggerGateWarning() {
    if (gate.classList.contains('gate-hidden')) return;
    gateScrollHint.classList.add('show');
    gateCard.classList.remove('pulse-warning');
    // reinicia a animação
    void gateCard.offsetWidth;
    gateCard.classList.add('pulse-warning');
    clearTimeout(window.__gateHintTimeout);
    window.__gateHintTimeout = setTimeout(() => gateScrollHint.classList.remove('show'), 2200);
  }

  ['wheel', 'touchmove', 'keydown'].forEach(evt => {
    window.addEventListener(evt, (e) => {
      if (gate.classList.contains('gate-hidden')) return;
      const isScrollKey = evt === 'keydown' && ['ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(e.key);
      if (evt === 'wheel' || evt === 'touchmove' || isScrollKey) {
        triggerGateWarning();
      }
    }, { passive: true });
  });

  // Logout (na seção de Perfil) — volta ao estado sem acesso e mostra o gate de novo
  const perfilLogoutBtn = document.getElementById('perfilLogoutBtn');
  if (perfilLogoutBtn) {
    perfilLogoutBtn.addEventListener('click', () => {
      logoutAndShowGate();
      closeContentOverlay();
    });
  }

  // ── Menu trigger (3 linhas) + Drawer lateral ────
  const menuTrigger = document.getElementById('menuTrigger');
  const sideDrawer = document.getElementById('sideDrawer');
  const sideDrawerOverlay = document.getElementById('sideDrawerOverlay');
  const sideDrawerClose = document.getElementById('sideDrawerClose');
  const drawerHomeLink = document.getElementById('drawerHomeLink');

  function openDrawer() {
    menuTrigger.classList.add('active');
    sideDrawer.classList.add('open');
    sideDrawerOverlay.classList.add('open');
  }
  function closeDrawer() {
    menuTrigger.classList.remove('active');
    sideDrawer.classList.remove('open');
    sideDrawerOverlay.classList.remove('open');
  }

  if (menuTrigger) {
    menuTrigger.addEventListener('click', () => {
      sideDrawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
  }
  if (sideDrawerClose) sideDrawerClose.addEventListener('click', closeDrawer);
  if (sideDrawerOverlay) sideDrawerOverlay.addEventListener('click', closeDrawer);

  if (drawerHomeLink) {
    drawerHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      closeContentOverlay();
    });
  }
  if (drawerChatLink) {
    drawerChatLink.addEventListener('click', () => closeDrawer());
  }
  if (drawerProfileLink) {
    drawerProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      goToPerfilHub();
    });
  }

  // ── Fade-in on scroll ──────────────────────────
  const fadeEls = document.querySelectorAll('.fade-in');
  const fadeObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); fadeObs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  fadeEls.forEach(el => fadeObs.observe(el));
  // Como os painéis começam com display:none, força a visibilidade dos
  // elementos .fade-in assim que o painel correspondente é aberto (ver
  // openContentPanel mais abaixo, que também chama isto).
  function refreshFadeInsIn(container) {
    if (!container) return;
    container.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }

  // ── 4 Faixas fullscreen → abrem o overlay de conteúdo ──
  const contentOverlay = document.getElementById('contentOverlay');
  const contentOverlayScroll = document.getElementById('contentOverlayScroll');
  const contentBackBtn = document.getElementById('contentBackBtn');
  const hubStripes = document.querySelectorAll('.hub-stripe, .hub-card, .hub-rbar');

  function openContentPanel(targetId) {
    document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(targetId);
    if (panel) {
      panel.classList.add('active');
      refreshFadeInsIn(panel);
    }
    contentOverlay.classList.add('open');
    if (contentOverlayScroll) contentOverlayScroll.scrollTop = 0;

    // A aba "Global" do chat já abre marcada como ativa no HTML, então sem
    // isso as mensagens só carregavam depois de clicar manualmente numa aba
    // e voltar. Garante que carrega assim que a tela de chat é aberta,
    // não importa por qual botão (drawer ou widget da Hero 2).
    if (targetId === 'panel-chat' && window.ConectChat && window.ConectChat.iniciarChatGlobal) {
      window.ConectChat.iniciarChatGlobal();
    }
  }

  function closeContentOverlay() {
    contentOverlay.classList.remove('open');
  }

  hubStripes.forEach(stripe => {
    stripe.addEventListener('click', (e) => {
      // Para cards e barras radiais, abre direto (sem comportamento touch-open)
      if (stripe.classList.contains('hub-card') || stripe.classList.contains('hub-rbar')) {
        const targetId = stripe.dataset.target;
        if (targetId) openContentPanel(targetId);
        return;
      }

      const isTouchDevice = window.matchMedia('(hover: none)').matches;
      if (isTouchDevice && !stripe.classList.contains('touch-open')) {
        hubStripes.forEach(s => s.classList.remove('touch-open'));
        stripe.classList.add('touch-open');
        e.preventDefault();
        return;
      }

      const targetId = stripe.dataset.target;
      if (targetId) openContentPanel(targetId);
    });
  });

  if (contentBackBtn) contentBackBtn.addEventListener('click', closeContentOverlay);

  // ── Navegação por links internos (#id) ──────────
  // Como o conteúdo agora vive dentro de 4 painéis (que abrem por cima das
  // 4 faixas), um link tipo href="#materiais" precisa: 1) achar em qual
  // painel esse id mora, 2) abrir esse painel se ainda não estiver aberto,
  // 3) rolar até o elemento dentro do scroll interno do overlay.
  function findPanelContaining(targetEl) {
    return targetEl.closest('.content-panel');
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const panel = findPanelContaining(target);

      if (panel) {
        // O alvo vive dentro de um dos 4 painéis — abre o painel certo
        // (caso ainda não esteja aberto) e depois rola até o elemento.
        const alreadyActive = panel.classList.contains('active') && contentOverlay.classList.contains('open');
        if (!alreadyActive) openContentPanel(panel.id);

        // Pequeno delay pra garantir que o painel já está visível antes de medir a posição
        requestAnimationFrame(() => {
          const top = target.getBoundingClientRect().top - contentOverlayScroll.getBoundingClientRect().top + contentOverlayScroll.scrollTop - 16;
          contentOverlayScroll.scrollTo({ top, behavior: 'smooth' });
        });
      } else if (target.id === 'hero') {
        // Link de volta pras 4 faixas
        closeContentOverlay();
      }
    });
  });

  // ── Estilo pills ───────────────────────────────
  document.querySelectorAll('.estilo-pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.estilo-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
    });
  });

  // ── Filtros de ebooks ──────────────────────────
  const filtros = document.querySelectorAll('.filtro-pill');
  const ebookCards = document.querySelectorAll('.ebook-card');

  function filterEbooks(tipo) {
    ebookCards.forEach(card => {
      const cat = card.querySelector('.ebook-cat')?.textContent.toLowerCase() || '';
      const isFree = !!card.querySelector('.free-text');
      const isPremium = card.classList.contains('destaque');
      let show = true;

      if (tipo === 'gratuitos') show = isFree;
      else if (tipo === 'ebooks') show = !isFree && !isPremium;
      else if (tipo === 'apostilas completas') show = isPremium;
      else if (tipo === 'ofício') show = cat.includes('ofício');
      else if (tipo === 'segurança') show = cat.includes('segurança');
      else if (tipo === 'técnica') show = cat.includes('técnica');
      else show = true; // todos

      card.style.display = show ? '' : 'none';
    });
  }

  filtros.forEach(f => {
    f.addEventListener('click', () => {
      filtros.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      filterEbooks(f.textContent.trim().toLowerCase());
    });
  });

  // ── Toast ──────────────────────────────────────
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  // ── Lead forms ─────────────────────────────────
  function handleForm(formId, successId, toastMsg) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      const leads = JSON.parse(localStorage.getItem('conect_leads') || '[]');
      if (!leads.some(l => l.email === email)) {
        leads.push({ email, source: formId, ts: new Date().toISOString() });
        localStorage.setItem('conect_leads', JSON.stringify(leads));
      }
      form.style.display = 'none';
      const s = document.getElementById(successId);
      if (s) s.style.display = 'block';
      showToast(toastMsg);
    });
  }

  handleForm('mainLeadForm', 'mainLeadSuccess', '✓ Acesso enviado! Bem-vindo ao Conect Tattoo.');
  handleForm('especialistasForm', 'especialistasSuccess', '✓ Te avisamos no lançamento!');

  // ── Filtros de videoaulas ──────────────────────
  const filtrosVideo = document.querySelectorAll('.filtro-pill-video');
  const videoCards = document.querySelectorAll('.video-card');

  function filterVideos(tipo) {
    videoCards.forEach(card => {
      const cat = card.dataset.cat || '';
      const isFree = card.dataset.free === 'true';
      let show = true;
      if (tipo === 'gratuitas') show = isFree;
      else if (['ofício','segurança','técnica'].includes(tipo)) show = cat === tipo;
      else show = true;
      card.style.display = show ? '' : 'none';
    });
  }

  filtrosVideo.forEach(f => {
    f.addEventListener('click', () => {
      filtrosVideo.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      filterVideos(f.textContent.trim().toLowerCase());
    });
  });

  // ── Filtros de avaliações ───────────────────────
  const filtrosAvaliacao = document.querySelectorAll('.filtro-pill-avaliacao');
  const avaliacaoCards = document.querySelectorAll('.avaliacao-card');

  function filterAvaliacoes(tipo) {
    avaliacaoCards.forEach(card => {
      const cat = card.dataset.cat || '';
      const show = tipo === 'todos' ? true : cat === tipo;
      card.style.display = show ? '' : 'none';
    });
  }

  filtrosAvaliacao.forEach(f => {
    f.addEventListener('click', () => {
      filtrosAvaliacao.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      filterAvaliacoes(f.textContent.trim().toLowerCase());
    });
  });

  // ── Curtidas no Feed (visual, sem persistência) ─
  document.querySelectorAll('.feed-like').forEach(btn => {
    btn.addEventListener('click', () => {
      const countSpan = btn.childNodes[btn.childNodes.length - 1];
      let count = parseInt(btn.textContent.trim().match(/\d+/)?.[0] || '0');
      const liked = btn.classList.toggle('liked');
      count = liked ? count + 1 : count - 1;
      btn.innerHTML = btn.querySelector('svg').outerHTML + ' ' + count;
    });
  });

  // ── Modal de Checkout ──────────────────────────
  // NOTA PARA INTEGRAÇÃO: este modal hoje só simula o fluxo visualmente.
  // Para conectar Mercado Pago / Stripe de verdade:
  //  1. No submit do #checkoutForm, capturar nome/email do form.
  //  2. Chamar seu backend (ex: fetch('/api/criar-pagamento', {...}))
  //     passando { produto: currentCheckoutItem, nome, email }.
  //  3. O backend cria a preferência/sessão de pagamento no gateway
  //     e retorna uma URL de checkout.
  //  4. Redirecionar: window.location.href = urlDoGateway;
  //  5. Após pagamento confirmado (webhook no backend), liberar acesso
  //     ao ebook/vídeo/curso (ex: enviar e-mail com link, ou checar
  //     status numa página "minha conta").

  const checkoutOverlay = document.getElementById('checkoutOverlay');
  const checkoutTitle = document.getElementById('checkoutTitle');
  const checkoutItemName = document.getElementById('checkoutItemName');
  const checkoutPrice = document.getElementById('checkoutPrice');
  const checkoutClose = document.getElementById('checkoutClose');
  const checkoutForm = document.getElementById('checkoutForm');

  let currentCheckoutItem = null;

  function openCheckout(title, price) {
    currentCheckoutItem = { title, price };
    checkoutTitle.textContent = title;
    checkoutItemName.textContent = title;
    checkoutPrice.textContent = price ? `R$ ${price}` : 'Grátis';
    checkoutOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckout() {
    checkoutOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title || 'Produto Conect Tattoo';
      const price = btn.dataset.price || '';
      openCheckout(title, price);
    });
  });

  document.querySelectorAll('.btn-download, .btn-watch').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title || 'Conteúdo gratuito';
      showToast(`✓ "${title}" liberado! Verifique seu acesso.`);
      // NOTA: aqui entraria a liberação real do arquivo/vídeo gratuito,
      // por exemplo abrindo o PDF/vídeo ou enviando por e-mail.
    });
  });

  checkoutClose.addEventListener('click', closeCheckout);
  checkoutOverlay.addEventListener('click', (e) => {
    if (e.target === checkoutOverlay) closeCheckout();
  });

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: integrar Mercado Pago / Stripe aqui (ver nota acima).
    showToast(`✓ Pedido recebido! Em breve você receberá o acesso por e-mail.`);
    closeCheckout();
    checkoutForm.reset();
  });

  // ── Auto Atendimento ─────────────────────────────
  // NOTA PARA INTEGRAÇÃO: hoje este formulário só gera um preview visual
  // do card. Para enviar de verdade pro WhatsApp do studio:
  //  1. No submit, montar a URL do WhatsApp: https://wa.me/55XXXXXXXXXXX?text=...
  //     com a mensagem formatada (use encodeURIComponent no texto).
  //  2. Ou, se preferir capturar no seu CRM antes, enviar os dados pra um
  //     endpoint próprio (fetch) que registra o lead e dispara a notificação
  //     pro studio (ex: via API oficial do WhatsApp Business).
  //  3. O número de WhatsApp do studio fica fixo no código ou configurável
  //     no Perfil — hoje não há onde cadastrá-lo ainda.

  const abrirAutoAtendimentoBtn = document.getElementById('abrirAutoAtendimento');
  const autoatendOverlay = document.getElementById('autoatendOverlay');
  const autoatendClose = document.getElementById('autoatendClose');
  const autoatendForm = document.getElementById('autoatendForm');
  const autoatendResult = document.getElementById('autoatendResult');
  const autoatendCardBody = document.getElementById('autoatendCardBody');
  const autoatendNovaSolicitacao = document.getElementById('autoatendNovaSolicitacao');
  const aaReferenciaBtn = document.getElementById('aaReferenciaBtn');
  const aaReferenciaInput = document.getElementById('aaReferencia');
  const aaReferenciaLabel = document.getElementById('aaReferenciaLabel');

  function openAutoatend() {
    if (autoatendOverlay) autoatendOverlay.classList.add('open');
  }
  function closeAutoatend() {
    if (autoatendOverlay) autoatendOverlay.classList.remove('open');
  }

  if (abrirAutoAtendimentoBtn) abrirAutoAtendimentoBtn.addEventListener('click', openAutoatend);
  if (autoatendClose) autoatendClose.addEventListener('click', closeAutoatend);
  if (autoatendOverlay) {
    autoatendOverlay.addEventListener('click', (e) => {
      if (e.target === autoatendOverlay) closeAutoatend();
    });
  }

  if (aaReferenciaBtn && aaReferenciaInput) {
    aaReferenciaBtn.addEventListener('click', () => aaReferenciaInput.click());
    aaReferenciaInput.addEventListener('change', () => {
      const file = aaReferenciaInput.files[0];
      if (file) {
        aaReferenciaLabel.textContent = file.name;
        aaReferenciaBtn.classList.add('has-file');
      }
    });
  }

  if (autoatendForm) {
    autoatendForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome = document.getElementById('aaNome').value.trim();
      const contato = document.getElementById('aaContato').value.trim();
      const local = document.getElementById('aaLocal').value.trim();
      const tamanho = document.getElementById('aaTamanho').value.trim();
      const data = document.getElementById('aaData').value;
      const temReferencia = aaReferenciaInput.files.length > 0;

      const dataFormatada = data
        ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'A combinar';

      autoatendCardBody.innerHTML = `
        <div class="autoatend-card-row"><strong>Nome:</strong> <span>${nome}</span></div>
        <div class="autoatend-card-row"><strong>Contato:</strong> <span>${contato}</span></div>
        <div class="autoatend-card-row"><strong>Local:</strong> <span>${local}</span></div>
        <div class="autoatend-card-row"><strong>Tamanho:</strong> <span>${tamanho}</span></div>
        <div class="autoatend-card-row"><strong>Disponibilidade:</strong> <span>${dataFormatada}</span></div>
        <div class="autoatend-card-row"><strong>Referência:</strong> <span>${temReferencia ? 'Anexada ✓' : 'Não enviada'}</span></div>
      `;

      autoatendForm.style.display = 'none';
      autoatendResult.style.display = 'block';
    });
  }

  if (autoatendNovaSolicitacao) {
    autoatendNovaSolicitacao.addEventListener('click', () => {
      autoatendForm.reset();
      aaReferenciaLabel.textContent = 'Anexar referência de imagem (opcional)';
      aaReferenciaBtn.classList.remove('has-file');
      autoatendResult.style.display = 'none';
      autoatendForm.style.display = 'flex';
    });
  }

  // ── Widget de Canto: Wallet · Chat · Shopping (mockup visual, sem persistência) ─
  const cornerWidget = document.getElementById('cornerWidget');
  const cornerPanels = {
    walletToggle: document.getElementById('walletPanel'),
  };

  function closeAllCornerPanels() {
    Object.values(cornerPanels).forEach(panel => panel && panel.classList.remove('open'));
  }

  Object.keys(cornerPanels).forEach(btnId => {
    const btn = document.getElementById(btnId);
    const panel = cornerPanels[btnId];
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const wasOpen = panel.classList.contains('open');
      closeAllCornerPanels();
      if (!wasOpen) panel.classList.add('open');
    });
  });

  // O botão "Chat" do widget de canto abre a tela de chat de verdade
  // (Comunidade/Chat, com chat global e privado) — antes ele abria só um
  // mockup escrito "Em breve", sem nenhuma função real.
  const chatToggleBtn = document.getElementById('chatToggle');
  if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', () => {
      closeAllCornerPanels();
      openContentPanel('panel-chat');
    });
  }

  // ── SHOPPING — tela cheia (topbar + submenu + 5 sub-telas) ─────
  // O botão "Shopping" do widget de canto agora abre esta tela cheia
  // (antes abria só um mini-modal "em breve"). A navegação entre as
  // sub-telas (Compras, Preço Baixo, Avaliações, Treinamento,
  // Necessidade Studio) é local a este painel — não usa o
  // contentOverlay das 4 faixas principais.
  const shoppingToggleBtn = document.getElementById('shoppingToggle');
  const shoppingOverlay = document.getElementById('shoppingOverlay');
  const shoppingScroll = document.getElementById('shoppingScroll');
  const shoppingBackBtn = document.getElementById('shoppingBackBtn');
  const shoppingMenuTrigger = document.getElementById('shoppingMenuTrigger');
  const shoppingCartBtn = document.getElementById('shoppingCartBtn');
  const shoppingSubnavBtns = document.querySelectorAll('.shopping-subnav-btn');
  const shoppingPanels = document.querySelectorAll('.shopping-panel');

  function openShoppingOverlay() {
    if (!shoppingOverlay) return;
    shoppingOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (shoppingScroll) shoppingScroll.scrollTop = 0;
  }

  function closeShoppingOverlay() {
    if (!shoppingOverlay) return;
    shoppingOverlay.classList.remove('open');
    document.body.style.overflow = '';
    closeDrawer();
  }

  if (shoppingToggleBtn) {
    shoppingToggleBtn.addEventListener('click', () => {
      closeAllCornerPanels();
      openShoppingOverlay();
    });
  }
  if (shoppingBackBtn) shoppingBackBtn.addEventListener('click', closeShoppingOverlay);

  // Hamburguer próprio da tela de Shopping — abre o mesmo drawer lateral
  // (perfil, ajuda etc.) usado no resto do site.
  if (shoppingMenuTrigger) {
    shoppingMenuTrigger.addEventListener('click', () => {
      shoppingMenuTrigger.classList.toggle('active');
      sideDrawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
  }

  // "Início" do drawer também precisa fechar a tela de Shopping quando
  // ela está aberta (senão o usuário fica preso nela por cima do hub).
  if (drawerHomeLink) {
    drawerHomeLink.addEventListener('click', () => closeShoppingOverlay());
  }

  // (o botão de carrinho ganha sua função real mais abaixo, junto com a lógica de Compras)

  function openShoppingPanel(targetId) {
    shoppingSubnavBtns.forEach(b => b.classList.toggle('active', b.dataset.shopTarget === targetId));
    shoppingPanels.forEach(p => p.classList.toggle('active', p.id === targetId));
    if (shoppingScroll) shoppingScroll.scrollTop = 0;
  }

  shoppingSubnavBtns.forEach(btn => {
    btn.addEventListener('click', () => openShoppingPanel(btn.dataset.shopTarget));
  });

  // ── SHOPPING · Dados & lógica das 5 sub-telas ───────────────────
  // Catálogo mock (front-end apenas — sem integração real de estoque/pagamento ainda).
  const SHOP_ICONS = {
    maquinas: '<rect x="4" y="9" width="16" height="7" rx="2"/><path d="M8 9V6a2 2 0 012-2h4a2 2 0 012 2v3"/><line x1="9" y1="19" x2="15" y2="19"/>',
    impressoras: '<rect x="3" y="7" width="18" height="9" rx="1"/><path d="M7 7V4h10v3"/><rect x="7" y="16" width="10" height="4"/>',
    cartuchos: '<path d="M12 2v6M12 8l4 3v9a2 2 0 01-2 2h-4a2 2 0 01-2-2v-9l4-3z"/>',
    transfer: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/>',
    tintas: '<path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"/>',
    bioseguranca: '<path d="M12 2l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V6l7-4z"/><path d="M9.5 12l1.8 1.8L14.5 10"/>',
    setup: '<path d="M6 3v9a2 2 0 002 2h1v6M18 3v9a2 2 0 01-2 2h-1v6"/><path d="M9 14h6"/>',
    hardware: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M11 18.5h2"/>',
    peles: '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>',
    kits: '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>',
    ebooks: '<path d="M4 5a2 2 0 012-2h6v18H6a2 2 0 00-2 2V5z"/><path d="M20 5a2 2 0 00-2-2h-6v18h6a2 2 0 012 2V5z"/>',
    tintatreino: '<path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"/>',
    vaselina: '<path d="M8 3h8v3l1 2v11a2 2 0 01-2 2H9a2 2 0 01-2-2V8l1-2z"/><path d="M8 8h8"/>',
  };
  const SHOP_CAT_LABELS = {
    maquinas: 'Máquinas', impressoras: 'Impressoras', cartuchos: 'Cartuchos', transfer: 'Transfer',
    tintas: 'Tintas', bioseguranca: 'Biossegurança', setup: 'Setup', hardware: 'Hardware',
    peles: 'Peles Artificiais', kits: 'Kit Treino', ebooks: 'Ebooks', tintatreino: 'Tinta de Treino', vaselina: 'Vaselina',
  };
  function shopIconSvg(cat, cls) {
    return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">${SHOP_ICONS[cat] || SHOP_ICONS.maquinas}</svg>`;
  }

  // Subtipos usados como barra de filtro dentro de Avaliações e como agrupador
  // visual dentro de cada categoria em Preço Baixo.
  const SHOP_SUBTYPES = {
    maquinas: [{ key: 'bobina', label: 'Bobina' }, { key: 'rotativa', label: 'Rotativa' }, { key: 'hibrida', label: 'Híbrida' }, { key: 'pen', label: 'Pen' }],
    cartuchos: [{ key: 'linha', label: 'Round Liner' }, { key: 'magnum-reta', label: 'Magnum Reta' }, { key: 'magnum-curva', label: 'Magnum Curva' }, { key: 'bucha', label: 'Bucha' }],
    tintas: [{ key: 'electric-ink', label: 'Electric Ink' }, { key: 'dynamic', label: 'Dynamic' }, { key: 'intenze', label: 'Intenze' }],
    transfer: [{ key: 'termico', label: 'Papel Térmico' }, { key: 'carbono', label: 'Papel Carbono' }],
    impressoras: [{ key: 'termica', label: 'Térmica' }, { key: 'inkjet', label: 'InkJet' }],
    bioseguranca: [{ key: 'luvas', label: 'Luvas' }, { key: 'mascaras', label: 'Máscaras' }, { key: 'alcool', label: 'Álcool/Antisséptico' }, { key: 'descartaveis', label: 'Descartáveis' }],
  };

  // Perfis fictícios usados nos comentários de Avaliações — só pra popular o
  // protótipo (dados de teste, sem usuários reais por trás).
  const SHOP_REVIEWERS = [
    { name: 'Bruna Alves', handle: '@bruna.tattoo', color: '#C9A24C' },
    { name: 'Diego Martins', handle: '@diegoink', color: '#7ED0A0' },
    { name: 'Larissa Nunes', handle: '@larissa.studio', color: '#E8654F' },
    { name: 'Thiago Souza', handle: '@thiagosouza.tt', color: '#8AB4E8' },
    { name: 'Camila Rocha', handle: '@camilarocha.art', color: '#D48AE8' },
    { name: 'Rafael Lima', handle: '@rafalima.tattoo', color: '#E8C24C' },
  ];
  function shopAvatar(idx) {
    const r = SHOP_REVIEWERS[idx % SHOP_REVIEWERS.length];
    const initials = r.name.split(' ').map(w => w[0]).slice(0, 2).join('');
    return `<span class="shop-avatar" style="background:${r.color}22;color:${r.color};border-color:${r.color}55;">${initials}</span>`;
  }

  const SHOP_PRODUCTS = [
    { id: 'p1', cat: 'maquinas', subtype: 'rotativa', brand: 'Magnum', name: 'Rotativa Pulse X3', price: 890, rating: 4.9, reviews: 312, desc: 'Máquina rotativa de alta precisão, curso de 3.5mm, ideal pra sombreado e realismo.' },
    { id: 'p2', cat: 'maquinas', subtype: 'bobina', brand: 'Kwadron', name: 'Bobina Classic Pro', price: 540, rating: 4.3, reviews: 187, desc: 'Bobina tradicional, robusta, ótima entrada pra quem está migrando de pistola.' },
    { id: 'p3', cat: 'maquinas', subtype: 'hibrida', brand: 'Ambition', name: 'Wireless Atom V2', price: 1290, rating: 4.1, reviews: 98, desc: 'Máquina sem fio com bateria de longa duração, boa autonomia pra atendimentos longos.' },
    { id: 'p4', cat: 'impressoras', subtype: 'termica', brand: 'Yollow', name: 'Stencil Print T200', price: 1590, rating: 4.8, reviews: 154, desc: 'Impressora térmica dedicada a stencil, imprime direto no papel transfer.' },
    { id: 'p5', cat: 'impressoras', subtype: 'inkjet', brand: 'Wormhole', name: 'InkJet Therm Compact', price: 990, rating: 4.0, reviews: 61, desc: 'Compacta e portátil, boa opção pra quem atende em mais de um estúdio.' },
    { id: 'p6', cat: 'cartuchos', subtype: 'linha', brand: 'Kwadron', name: 'RL Precision 0.30mm (cx 20un)', price: 89, rating: 4.7, reviews: 203, desc: 'Cartucho round liner, agulhas calibradas, ótimo pra linhas finas e contornos.' },
    { id: 'p7', cat: 'cartuchos', subtype: 'magnum-curva', brand: 'Cheyenne', name: 'MG Soft Shader 0.35mm (cx 20un)', price: 96, rating: 4.2, reviews: 76, desc: 'Magnum shader macio, entrega de tinta uniforme pra sombreados suaves.' },
    { id: 'p8', cat: 'transfer', subtype: 'termico', brand: 'Spirit', name: 'ThermoCopy Sensitive (100fls)', price: 79, rating: 4.6, reviews: 142, desc: 'Papel transfer térmico, transferência nítida mesmo em peles mais oleosas.' },
    { id: 'p9', cat: 'transfer', subtype: 'termico', brand: 'Magnum', name: 'EasyStencil Roll', price: 64, rating: 3.9, reviews: 54, desc: 'Rolo de papel transfer, custo-benefício pra quem tem alto volume de atendimento.' },
    { id: 'p10', cat: 'tintas', subtype: 'electric-ink', brand: 'Electric Ink', name: 'Pigment Black Deep 30ml', price: 68, rating: 4.9, reviews: 288, desc: 'Preto profundo de alta pigmentação, referência em realismo e blackwork.' },
    { id: 'p11', cat: 'tintas', subtype: 'electric-ink', brand: 'Electric Ink', name: 'Color Vivid Set 12', price: 320, rating: 4.4, reviews: 119, desc: 'Kit com 12 cores vivas, ótima saturação pra trabalhos coloridos.' },
    { id: 'p12', cat: 'tintas', subtype: 'dynamic', brand: 'Dynamic', name: 'Organic Pure Line 15ml', price: 54, rating: 4.1, reviews: 67, desc: 'Linha orgânica, fórmula mais suave pra peles sensíveis.' },
    { id: 'p13', cat: 'bioseguranca', subtype: 'luvas', brand: 'Supermax', name: 'Luva Nitrílica P/M/G (cx 100un)', price: 42, rating: 4.5, reviews: 210, desc: 'Luva sem látex, resistente, disponível nos tamanhos P, M e G.' },
    { id: 'p14', cat: 'bioseguranca', subtype: 'descartaveis', brand: 'Cremer', name: 'Campo Cirúrgico Descartável (pct 50un)', price: 38, rating: 4.3, reviews: 88, desc: 'Campo estéril descartável, essencial pra montagem da bancada.' },
    { id: 'p15', cat: 'bioseguranca', subtype: 'descartaveis', brand: 'Magnum', name: 'Filme PVC Protetor (rolo 28cm)', price: 22, rating: 4.0, reviews: 45, desc: 'Filme plástico pra proteção de máquina, fonte e superfícies de trabalho.' },
    { id: 'p16', cat: 'setup', brand: 'Magnum', name: 'Maca de Tatuagem Hidráulica', price: 2400, rating: 4.6, reviews: 58, desc: 'Maca hidráulica com regulagem de altura e encosto, estrutura reforçada.' },
    { id: 'p17', cat: 'setup', brand: 'ErgoStudio', name: 'Cadeira Reclinável Studio', price: 1650, rating: 4.4, reviews: 39, desc: 'Cadeira reclinável em courvin, fácil higienização entre atendimentos.' },
    { id: 'p18', cat: 'setup', brand: 'ErgoStudio', name: 'Mocho Ergonômico c/ Rodinha', price: 480, rating: 4.5, reviews: 71, desc: 'Mocho com apoio lombar, ideal pra sessões longas sem dor nas costas.' },
    { id: 'p19', cat: 'setup', brand: 'Inox Studio', name: 'Carrinho Auxiliar Inox', price: 590, rating: 4.3, reviews: 28, desc: 'Carrinho em inox com rodinhas, organiza máquina, tintas e descartáveis.' },
    { id: 'p20', cat: 'hardware', brand: 'Apple', name: 'iPad 9ª Geração (design de stencil)', price: 3200, rating: 4.8, reviews: 144, desc: 'Ótimo pra desenhar direto o stencil e mostrar referências ao cliente.' },
    { id: 'p21', cat: 'hardware', brand: 'JBL', name: 'Fone Bluetooth Studio', price: 350, rating: 4.2, reviews: 66, desc: 'Fone sem fio resistente, bom isolamento pra sessões longas.' },
    { id: 'p22', cat: 'cartuchos', subtype: 'magnum-reta', brand: 'Kwadron', name: 'Magnum Reta Firm 0.35mm (cx 20un)', price: 92, rating: 4.4, reviews: 90, desc: 'Magnum reta firme, boa entrega de tinta pra preenchimento denso.' },
    { id: 'p23', cat: 'cartuchos', subtype: 'bucha', brand: 'Cheyenne', name: 'Bucha Classic 1207 (cx 12un)', price: 58, rating: 4.0, reviews: 52, desc: 'Bucha tradicional pra quem usa máquina de bobina com agulha solta.' },
    { id: 'p24', cat: 'maquinas', subtype: 'pen', brand: 'Cheyenne', name: 'Pen Grip Slim', price: 760, rating: 4.5, reviews: 140, desc: 'Formato caneta, empunhadura mais leve pra sessões de precisão.' },
    { id: 'p25', cat: 'tintas', subtype: 'intenze', brand: 'Intenze', name: 'Intenze True Black 30ml', price: 74, rating: 4.6, reviews: 140, desc: 'Preto de secagem rápida, muito usado em traços finos e lettering.' },
    { id: 'p26', cat: 'transfer', subtype: 'carbono', brand: 'Spirit', name: 'CarbonCopy Classic (100fls)', price: 58, rating: 4.0, reviews: 38, desc: 'Papel carbono tradicional, alternativa mais barata ao térmico.' },
    { id: 'p27', cat: 'bioseguranca', subtype: 'mascaras', brand: 'Descarpack', name: 'Máscara Cirúrgica Tripla (cx 50un)', price: 34, rating: 4.3, reviews: 65, desc: 'Máscara tripla camada, uso obrigatório durante todo o atendimento.' },
    { id: 'p28', cat: 'bioseguranca', subtype: 'alcool', brand: 'Rioquímica', name: 'Álcool 70% Antisséptico 1L', price: 19, rating: 4.6, reviews: 99, desc: 'Antisséptico pra assepsia de pele e superfícies antes e depois da sessão.' },

    // ---- Máquinas: mais marcas por sub-tipo (Bobina, Rotativa, Híbrida, Pen) ----
    { id: 'p29', cat: 'maquinas', subtype: 'bobina', brand: 'Cheyenne', name: 'Bobina Thunder 2.0', price: 610, rating: 4.4, reviews: 96, desc: 'Bobina tradicional, boa entrada pra quem gosta do estilo clássico de máquina.' },
    { id: 'p30', cat: 'maquinas', subtype: 'bobina', brand: 'Steel Bee', name: 'Bobina Classic Line', price: 495, rating: 4.1, reviews: 142, desc: 'Bobina tradicional, boa entrada pra quem gosta do estilo clássico de máquina.' },
    { id: 'p31', cat: 'maquinas', subtype: 'bobina', brand: 'InkForge', name: 'Bobina Heavy Duty', price: 580, rating: 4.2, reviews: 88, desc: 'Bobina tradicional, boa entrada pra quem gosta do estilo clássico de máquina.' },
    { id: 'p32', cat: 'maquinas', subtype: 'bobina', brand: 'Titan Tattoo', name: 'Bobina Prime 8-Wrap', price: 620, rating: 4.0, reviews: 65, desc: 'Bobina tradicional, boa entrada pra quem gosta do estilo clássico de máquina.' },
    { id: 'p33', cat: 'maquinas', subtype: 'rotativa', brand: 'Bishop', name: 'Rotativa Rotary Neo', price: 950, rating: 4.7, reviews: 210, desc: 'Rotativa moderna, curso suave e baixo ruído durante a sessão.' },
    { id: 'p34', cat: 'maquinas', subtype: 'rotativa', brand: 'Ambition', name: 'Rotativa Forte Mini', price: 870, rating: 4.5, reviews: 175, desc: 'Rotativa moderna, curso suave e baixo ruído durante a sessão.' },
    { id: 'p35', cat: 'maquinas', subtype: 'rotativa', brand: 'Cheyenne', name: 'Rotativa Hawk Thunder', price: 1050, rating: 4.8, reviews: 260, desc: 'Rotativa moderna, curso suave e baixo ruído durante a sessão.' },
    { id: 'p36', cat: 'maquinas', subtype: 'rotativa', brand: 'Vortex Tattoo', name: 'Rotativa Spin Compact', price: 780, rating: 4.2, reviews: 90, desc: 'Rotativa moderna, curso suave e baixo ruído durante a sessão.' },
    { id: 'p37', cat: 'maquinas', subtype: 'hibrida', brand: 'EZ Tattoo', name: 'Híbrida Flex Wireless', price: 1190, rating: 4.3, reviews: 80, desc: 'Híbrida sem fio, praticidade pra atender em qualquer lugar do estúdio.' },
    { id: 'p38', cat: 'maquinas', subtype: 'hibrida', brand: 'Bishop', name: 'Híbrida Rotary V6 Wireless', price: 1350, rating: 4.6, reviews: 130, desc: 'Híbrida sem fio, praticidade pra atender em qualquer lugar do estúdio.' },
    { id: 'p39', cat: 'maquinas', subtype: 'hibrida', brand: 'Titan Tattoo', name: 'Híbrida PowerCore', price: 1090, rating: 4.0, reviews: 55, desc: 'Híbrida sem fio, praticidade pra atender em qualquer lugar do estúdio.' },
    { id: 'p40', cat: 'maquinas', subtype: 'hibrida', brand: 'NeoInk', name: 'Híbrida UltraLight', price: 990, rating: 4.1, reviews: 70, desc: 'Híbrida sem fio, praticidade pra atender em qualquer lugar do estúdio.' },
    { id: 'p41', cat: 'maquinas', subtype: 'pen', brand: 'Ambition', name: 'Pen Ultra V2', price: 820, rating: 4.6, reviews: 175, desc: 'Formato caneta, empunhadura leve pra sessões de precisão.' },
    { id: 'p42', cat: 'maquinas', subtype: 'pen', brand: 'Steel Bee', name: 'Pen Slim Grip', price: 690, rating: 4.3, reviews: 110, desc: 'Formato caneta, empunhadura leve pra sessões de precisão.' },
    { id: 'p43', cat: 'maquinas', subtype: 'pen', brand: 'InkForge', name: 'Pen Titanium Light', price: 880, rating: 4.4, reviews: 95, desc: 'Formato caneta, empunhadura leve pra sessões de precisão.' },
    { id: 'p44', cat: 'maquinas', subtype: 'pen', brand: 'CraftInk', name: 'Pen Compact Pro', price: 610, rating: 4.0, reviews: 60, desc: 'Formato caneta, empunhadura leve pra sessões de precisão.' },

    // ---- Cartuchos: mais marcas por sub-tipo (Round Liner, Magnum Reta, Magnum Curva, Bucha) ----
    { id: 'p45', cat: 'cartuchos', subtype: 'linha', brand: 'Cheyenne', name: 'RL Safety 0.25mm (cx 20un)', price: 94, rating: 4.5, reviews: 150, desc: 'Round liner calibrado, ótimo pra linhas finas e contornos.' },
    { id: 'p46', cat: 'cartuchos', subtype: 'linha', brand: 'EZ Tattoo', name: 'RL EZ Revolution 0.30mm (cx 20un)', price: 85, rating: 4.3, reviews: 120, desc: 'Round liner calibrado, ótimo pra linhas finas e contornos.' },
    { id: 'p47', cat: 'cartuchos', subtype: 'linha', brand: 'Bishop', name: 'RL Rotary Cartridge 0.30mm (cx 20un)', price: 99, rating: 4.6, reviews: 175, desc: 'Round liner calibrado, ótimo pra linhas finas e contornos.' },
    { id: 'p48', cat: 'cartuchos', subtype: 'linha', brand: 'CraftInk', name: 'RL Precision Lite (cx 20un)', price: 78, rating: 4.0, reviews: 60, desc: 'Round liner calibrado, ótimo pra linhas finas e contornos.' },
    { id: 'p49', cat: 'cartuchos', subtype: 'magnum-reta', brand: 'Cheyenne', name: 'MG Reta Safety 0.35mm (cx 20un)', price: 98, rating: 4.3, reviews: 85, desc: 'Magnum reta, boa entrega de tinta pra preenchimento denso.' },
    { id: 'p50', cat: 'cartuchos', subtype: 'magnum-reta', brand: 'EZ Tattoo', name: 'MG Reta Revolution 0.40mm (cx 20un)', price: 90, rating: 4.1, reviews: 70, desc: 'Magnum reta, boa entrega de tinta pra preenchimento denso.' },
    { id: 'p51', cat: 'cartuchos', subtype: 'magnum-reta', brand: 'Bishop', name: 'MG Reta Rotary 0.35mm (cx 20un)', price: 105, rating: 4.5, reviews: 110, desc: 'Magnum reta, boa entrega de tinta pra preenchimento denso.' },
    { id: 'p52', cat: 'cartuchos', subtype: 'magnum-reta', brand: 'CraftInk', name: 'MG Reta Lite 0.30mm (cx 20un)', price: 82, rating: 4.0, reviews: 45, desc: 'Magnum reta, boa entrega de tinta pra preenchimento denso.' },
    { id: 'p53', cat: 'cartuchos', subtype: 'magnum-curva', brand: 'Kwadron', name: 'MG Curva Precision 0.35mm (cx 20un)', price: 94, rating: 4.4, reviews: 130, desc: 'Magnum curva/shader, sombreado suave e uniforme.' },
    { id: 'p54', cat: 'cartuchos', subtype: 'magnum-curva', brand: 'EZ Tattoo', name: 'MG Curva Revolution 0.40mm (cx 20un)', price: 88, rating: 4.1, reviews: 68, desc: 'Magnum curva/shader, sombreado suave e uniforme.' },
    { id: 'p55', cat: 'cartuchos', subtype: 'magnum-curva', brand: 'Bishop', name: 'MG Curva Rotary 0.35mm (cx 20un)', price: 102, rating: 4.6, reviews: 140, desc: 'Magnum curva/shader, sombreado suave e uniforme.' },
    { id: 'p56', cat: 'cartuchos', subtype: 'magnum-curva', brand: 'CraftInk', name: 'MG Curva Lite 0.30mm (cx 20un)', price: 76, rating: 3.9, reviews: 50, desc: 'Magnum curva/shader, sombreado suave e uniforme.' },
    { id: 'p57', cat: 'cartuchos', subtype: 'bucha', brand: 'Kwadron', name: 'Bucha Round 1207', price: 60, rating: 4.2, reviews: 70, desc: 'Bucha tradicional pra quem usa agulha solta com bobina.' },
    { id: 'p58', cat: 'cartuchos', subtype: 'bucha', brand: 'Steel Bee', name: 'Bucha Flat 1205', price: 55, rating: 4.0, reviews: 40, desc: 'Bucha tradicional pra quem usa agulha solta com bobina.' },
    { id: 'p59', cat: 'cartuchos', subtype: 'bucha', brand: 'InkForge', name: 'Bucha Magnum 1207M1', price: 65, rating: 4.3, reviews: 58, desc: 'Bucha tradicional pra quem usa agulha solta com bobina.' },
    { id: 'p60', cat: 'cartuchos', subtype: 'bucha', brand: 'CraftInk', name: 'Bucha Standard 1203', price: 48, rating: 3.8, reviews: 30, desc: 'Bucha tradicional pra quem usa agulha solta com bobina.' },

    // ---- Tintas: mais marcas por sub-tipo (Electric Ink, Dynamic, Intenze) ----
    { id: 'p61', cat: 'tintas', subtype: 'electric-ink', brand: 'Electric Ink', name: 'White Opaque 30ml', price: 62, rating: 4.5, reviews: 95, desc: 'Pigmentação alta, referência em realismo e blackwork.' },
    { id: 'p62', cat: 'tintas', subtype: 'electric-ink', brand: 'Electric Ink', name: 'Grey Wash Set 4', price: 210, rating: 4.6, reviews: 130, desc: 'Pigmentação alta, referência em realismo e blackwork.' },
    { id: 'p63', cat: 'tintas', subtype: 'electric-ink', brand: 'Electric Ink', name: 'Brown Sepia 30ml', price: 65, rating: 4.2, reviews: 70, desc: 'Pigmentação alta, referência em realismo e blackwork.' },
    { id: 'p64', cat: 'tintas', subtype: 'dynamic', brand: 'Dynamic', name: 'Classic Black 30ml', price: 58, rating: 4.4, reviews: 110, desc: 'Fórmula orgânica, mais suave pra peles sensíveis.' },
    { id: 'p65', cat: 'tintas', subtype: 'dynamic', brand: 'Dynamic', name: 'Viking Black 30ml', price: 66, rating: 4.6, reviews: 140, desc: 'Fórmula orgânica, mais suave pra peles sensíveis.' },
    { id: 'p66', cat: 'tintas', subtype: 'dynamic', brand: 'Dynamic', name: 'Color Company Set 6', price: 260, rating: 4.3, reviews: 85, desc: 'Fórmula orgânica, mais suave pra peles sensíveis.' },
    { id: 'p67', cat: 'tintas', subtype: 'dynamic', brand: 'Dynamic', name: 'Persian Red 15ml', price: 50, rating: 4.0, reviews: 55, desc: 'Fórmula orgânica, mais suave pra peles sensíveis.' },
    { id: 'p68', cat: 'tintas', subtype: 'intenze', brand: 'Intenze', name: 'Zuper Black 30ml', price: 78, rating: 4.7, reviews: 160, desc: 'Secagem rápida, ótimo pra traço fino e lettering.' },
    { id: 'p69', cat: 'tintas', subtype: 'intenze', brand: 'Intenze', name: 'White Ice 30ml', price: 60, rating: 4.3, reviews: 70, desc: 'Secagem rápida, ótimo pra traço fino e lettering.' },
    { id: 'p70', cat: 'tintas', subtype: 'intenze', brand: 'Intenze', name: 'Color Set 8', price: 290, rating: 4.5, reviews: 95, desc: 'Secagem rápida, ótimo pra traço fino e lettering.' },
    { id: 'p71', cat: 'tintas', subtype: 'intenze', brand: 'Intenze', name: 'Fusion Grey Wash 30ml', price: 68, rating: 4.1, reviews: 60, desc: 'Secagem rápida, ótimo pra traço fino e lettering.' },

    // ---- Produtos (Transfer): mais marcas por sub-tipo (Térmico, Carbono) ----
    { id: 'p72', cat: 'transfer', subtype: 'termico', brand: 'Yollow', name: 'Papel Térmico HD (100fls)', price: 84, rating: 4.5, reviews: 100, desc: 'Papel transfer térmico, transferência nítida mesmo em pele oleosa.' },
    { id: 'p73', cat: 'transfer', subtype: 'termico', brand: 'Kwadron', name: 'Papel Térmico Sensitive Plus (100fls)', price: 88, rating: 4.4, reviews: 78, desc: 'Papel transfer térmico, transferência nítida mesmo em pele oleosa.' },
    { id: 'p74', cat: 'transfer', subtype: 'termico', brand: 'Wormhole', name: 'Papel Térmico Compact (50fls)', price: 46, rating: 4.0, reviews: 40, desc: 'Papel transfer térmico, transferência nítida mesmo em pele oleosa.' },
    { id: 'p75', cat: 'transfer', subtype: 'carbono', brand: 'Magnum', name: 'CarbonCopy Standard (100fls)', price: 52, rating: 3.9, reviews: 40, desc: 'Papel carbono tradicional, alternativa custo-benefício ao térmico.' },
    { id: 'p76', cat: 'transfer', subtype: 'carbono', brand: 'Kwadron', name: 'Papel Carbono Precision (100fls)', price: 60, rating: 4.2, reviews: 55, desc: 'Papel carbono tradicional, alternativa custo-benefício ao térmico.' },
    { id: 'p77', cat: 'transfer', subtype: 'carbono', brand: 'Yollow', name: 'Papel Carbono HD (100fls)', price: 64, rating: 4.3, reviews: 62, desc: 'Papel carbono tradicional, alternativa custo-benefício ao térmico.' },
    { id: 'p78', cat: 'transfer', subtype: 'carbono', brand: 'Wormhole', name: 'Papel Carbono Lite (50fls)', price: 34, rating: 3.8, reviews: 25, desc: 'Papel carbono tradicional, alternativa custo-benefício ao térmico.' },

    // ---- Impressoras: mais marcas por sub-tipo (Térmica, InkJet) ----
    { id: 'p79', cat: 'impressoras', subtype: 'termica', brand: 'Kwadron', name: 'Stencil Print Mini T100', price: 990, rating: 4.4, reviews: 70, desc: 'Impressora térmica dedicada a stencil.' },
    { id: 'p80', cat: 'impressoras', subtype: 'termica', brand: 'Magnum', name: 'Térmica ProCopy 300', price: 1450, rating: 4.6, reviews: 88, desc: 'Impressora térmica dedicada a stencil.' },
    { id: 'p81', cat: 'impressoras', subtype: 'termica', brand: 'CraftInk', name: 'Térmica Studio Basic', price: 850, rating: 4.1, reviews: 45, desc: 'Impressora térmica dedicada a stencil.' },
    { id: 'p82', cat: 'impressoras', subtype: 'termica', brand: 'Bishop', name: 'Térmica Rotary Print Pro', price: 1780, rating: 4.7, reviews: 60, desc: 'Impressora térmica dedicada a stencil.' },
    { id: 'p83', cat: 'impressoras', subtype: 'inkjet', brand: 'HP', name: 'InkJet Tattoo Ready 210', price: 780, rating: 3.9, reviews: 50, desc: 'Impressora compacta, boa pra levar entre estúdios.' },
    { id: 'p84', cat: 'impressoras', subtype: 'inkjet', brand: 'Epson', name: 'InkJet EcoStencil 310', price: 920, rating: 4.2, reviews: 66, desc: 'Impressora compacta, boa pra levar entre estúdios.' },
    { id: 'p85', cat: 'impressoras', subtype: 'inkjet', brand: 'Canon', name: 'InkJet Portable Mini', price: 690, rating: 4.0, reviews: 38, desc: 'Impressora compacta, boa pra levar entre estúdios.' },
    { id: 'p86', cat: 'impressoras', subtype: 'inkjet', brand: 'CraftInk', name: 'InkJet Studio Flex', price: 850, rating: 4.1, reviews: 42, desc: 'Impressora compacta, boa pra levar entre estúdios.' },

    // ---- Biossegurança: mais marcas por sub-tipo (Luvas, Máscaras, Álcool, Descartáveis) ----
    { id: 'p87', cat: 'bioseguranca', subtype: 'luvas', brand: 'Descarpack', name: 'Luva Nitrílica Preta (cx 100un)', price: 46, rating: 4.4, reviews: 130, desc: 'Luva sem látex, resistente pro dia a dia do atendimento.' },
    { id: 'p88', cat: 'bioseguranca', subtype: 'luvas', brand: 'Cremer', name: 'Luva Látex P/M/G (cx 100un)', price: 36, rating: 4.0, reviews: 90, desc: 'Luva sem látex, resistente pro dia a dia do atendimento.' },
    { id: 'p89', cat: 'bioseguranca', subtype: 'luvas', brand: 'Supermax', name: 'Luva Vinil Sem Pó (cx 100un)', price: 32, rating: 3.8, reviews: 60, desc: 'Luva sem látex, resistente pro dia a dia do atendimento.' },
    { id: 'p90', cat: 'bioseguranca', subtype: 'luvas', brand: 'MedSafe', name: 'Luva Nitrílica Extra Grip (cx 100un)', price: 50, rating: 4.6, reviews: 150, desc: 'Luva sem látex, resistente pro dia a dia do atendimento.' },
    { id: 'p91', cat: 'bioseguranca', subtype: 'mascaras', brand: 'Cremer', name: 'Máscara PFF2 (un)', price: 8, rating: 4.5, reviews: 200, desc: 'Máscara tripla camada, uso obrigatório durante o atendimento.' },
    { id: 'p92', cat: 'bioseguranca', subtype: 'mascaras', brand: 'Supermax', name: 'Máscara Cirúrgica Dupla (cx 50un)', price: 28, rating: 4.0, reviews: 70, desc: 'Máscara tripla camada, uso obrigatório durante o atendimento.' },
    { id: 'p93', cat: 'bioseguranca', subtype: 'mascaras', brand: 'MedSafe', name: 'Máscara Cirúrgica Colorida (cx 50un)', price: 36, rating: 4.2, reviews: 80, desc: 'Máscara tripla camada, uso obrigatório durante o atendimento.' },
    { id: 'p94', cat: 'bioseguranca', subtype: 'mascaras', brand: 'Rioquímica', name: 'Máscara Tripla Hospitalar (cx 50un)', price: 38, rating: 4.4, reviews: 90, desc: 'Máscara tripla camada, uso obrigatório durante o atendimento.' },
    { id: 'p95', cat: 'bioseguranca', subtype: 'alcool', brand: 'Cremer', name: 'Álcool Gel 70% 500ml', price: 15, rating: 4.3, reviews: 85, desc: 'Antisséptico pra assepsia de pele e superfícies antes e depois da sessão.' },
    { id: 'p96', cat: 'bioseguranca', subtype: 'alcool', brand: 'Supermax', name: 'Álcool Isopropílico 1L', price: 24, rating: 4.5, reviews: 60, desc: 'Antisséptico pra assepsia de pele e superfícies antes e depois da sessão.' },
    { id: 'p97', cat: 'bioseguranca', subtype: 'alcool', brand: 'MedSafe', name: 'Álcool Spray Antisséptico 500ml', price: 18, rating: 4.2, reviews: 70, desc: 'Antisséptico pra assepsia de pele e superfícies antes e depois da sessão.' },
    { id: 'p98', cat: 'bioseguranca', subtype: 'alcool', brand: 'Descarpack', name: 'Álcool 70% 5L (galão)', price: 65, rating: 4.7, reviews: 40, desc: 'Antisséptico pra assepsia de pele e superfícies antes e depois da sessão.' },
    { id: 'p99', cat: 'bioseguranca', subtype: 'descartaveis', brand: 'Descarpack', name: 'Lençol Descartável TNT (rolo)', price: 45, rating: 4.3, reviews: 70, desc: 'Descartável essencial pra montagem da bancada.' },
    { id: 'p100', cat: 'bioseguranca', subtype: 'descartaveis', brand: 'MedSafe', name: 'Touca Descartável (cx 100un)', price: 20, rating: 4.1, reviews: 55, desc: 'Descartável essencial pra montagem da bancada.' },
    { id: 'p101', cat: 'bioseguranca', subtype: 'descartaveis', brand: 'Rioquímica', name: 'Avental Descartável TNT (pct 10un)', price: 32, rating: 4.0, reviews: 40, desc: 'Descartável essencial pra montagem da bancada.' },

    // ---- Treinamento: Peles Artificiais ----
    { id: 'p102', cat: 'peles', brand: 'TattooSkin', name: 'Pele Sintética Silicone 3 Camadas', price: 45, rating: 4.6, reviews: 88, desc: 'Simula derme, epiderme e subcutâneo — ótima pra treinar profundidade de agulhamento.' },
    { id: 'p103', cat: 'peles', brand: 'PraticaPele', name: 'Pele de Treino Dupla Face', price: 32, rating: 4.3, reviews: 60, desc: 'Duas faces de treino na mesma placa, custo-benefício pra praticar bastante.' },
    { id: 'p104', cat: 'peles', brand: 'SkinArt', name: 'Pele Sintética Braço Realista', price: 58, rating: 4.7, reviews: 102, desc: 'Formato anatômico de braço, textura bem próxima da pele real.' },
    { id: 'p105', cat: 'peles', brand: 'RealSkin', name: 'Pele Treino Kit 5 Unidades', price: 140, rating: 4.5, reviews: 74, desc: 'Kit com 5 peças, rende várias sessões de prática sem precisar comprar toda hora.' },

    // ---- Treinamento: Kit Treino ----
    { id: 'p106', cat: 'kits', brand: 'StartInk', name: 'Kit Iniciante Completo', price: 320, rating: 4.4, reviews: 90, desc: 'Máquina básica, cartuchos, tinta de treino e pele sintética — tudo pra começar.' },
    { id: 'p107', cat: 'kits', brand: 'TattooLab', name: 'Kit Treino Intermediário', price: 480, rating: 4.6, reviews: 65, desc: 'Pra quem já treinou o básico e quer praticar sombreado e cor.' },
    { id: 'p108', cat: 'kits', brand: 'PraticaPro', name: 'Kit Treino Profissional', price: 690, rating: 4.7, reviews: 110, desc: 'Kit completo com peles variadas, cartuchos de vários tipos e tintas de treino.' },
    { id: 'p109', cat: 'kits', brand: 'StartInk', name: 'Kit Bolso Iniciante Mini', price: 190, rating: 4.1, reviews: 40, desc: 'Versão compacta do kit iniciante, ótimo custo pra testar antes de investir mais.' },

    // ---- Treinamento: Ebooks ----
    { id: 'p110', cat: 'ebooks', brand: 'Conect Academy', name: 'Ebook: Primeiros Passos na Tatuagem', price: 39, rating: 4.8, reviews: 210, desc: 'Guia completo pra quem está começando, da postura até o primeiro traço.' },
    { id: 'p111', cat: 'ebooks', brand: 'Conect Academy', name: 'Ebook: Sombreado e Realismo', price: 49, rating: 4.6, reviews: 150, desc: 'Técnicas de sombreado progressivo pra quem já domina o traço.' },
    { id: 'p112', cat: 'ebooks', brand: 'Magnum School', name: 'Ebook: Biossegurança na Prática', price: 29, rating: 4.7, reviews: 130, desc: 'Protocolos de bancada, descarte e assepsia explicados passo a passo.' },
    { id: 'p113', cat: 'ebooks', brand: 'Magnum School', name: 'Ebook: Calibragem de Máquina', price: 35, rating: 4.5, reviews: 95, desc: 'Como ajustar curso e agulhamento pra cada tipo de máquina.' },

    // ---- Treinamento: Tinta de Treino ----
    { id: 'p114', cat: 'tintatreino', brand: 'PracticeInk', name: 'Tinta de Treino Preta 30ml', price: 24, rating: 4.3, reviews: 80, desc: 'Não é pra pele real — feita só pra praticar em pele sintética ou papel.' },
    { id: 'p115', cat: 'tintatreino', brand: 'TreinoColor', name: 'Tinta de Treino Colorida Set 4', price: 68, rating: 4.2, reviews: 55, desc: 'Set de 4 cores pra treinar preenchimento e mistura sem gastar tinta de verdade.' },
    { id: 'p116', cat: 'tintatreino', brand: 'PracticeInk', name: 'Tinta de Treino Lavável 60ml', price: 32, rating: 4.0, reviews: 42, desc: 'Sai fácil da pele sintética, ótima pra repetir o mesmo desenho várias vezes.' },

    // ---- Treinamento: Vaselina ----
    { id: 'p117', cat: 'vaselina', brand: 'DermaCare', name: 'Vaselina Neutra 100g', price: 12, rating: 4.5, reviews: 120, desc: 'Uso geral durante a sessão, ajuda a deslizar a máquina e proteger a pele.' },
    { id: 'p118', cat: 'vaselina', brand: 'SkinProtect', name: 'Vaselina Pós-Tattoo 200g', price: 22, rating: 4.6, reviews: 95, desc: 'Formulada pra cicatrização, boa pra recomendar ao cliente depois da sessão.' },
    { id: 'p119', cat: 'vaselina', brand: 'DermaCare', name: 'Vaselina em Bisnaga 50g', price: 9, rating: 4.2, reviews: 60, desc: 'Formato compacto, fácil de guardar na maleta de treino.' },
  ];
  // Código único por produto — determinístico a partir do id (dá pra copiar em
  // Avaliações e colar na busca de Preço Baixo).
  function shopCodeFor(id) { const h = shopHash('code-' + id); return String(100000 + (h % 900000)); }
  SHOP_PRODUCTS.forEach(p => { p.code = shopCodeFor(p.id); });
  function shopFmt(v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
  function shopStars(rating) {
    const full = Math.round(rating);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  }
  function shopProductById(id) { return SHOP_PRODUCTS.find(p => p.id === id); }
  function shopCopyCode(code) {
    const done = () => showToast(`Código #${code} copiado — cole na busca de Preço Baixo`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => shopCopyFallback(code, done));
    } else {
      shopCopyFallback(code, done);
    }
  }
  function shopCopyFallback(code, done) {
    const temp = document.createElement('textarea');
    temp.value = code;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    try { document.execCommand('copy'); done(); } catch (e) { showToast('Não foi possível copiar automaticamente'); }
    document.body.removeChild(temp);
  }

  // ---- Carrinho (persistido no localStorage do navegador) ----
  let shopCart = {};
  try { shopCart = JSON.parse(localStorage.getItem('conect_shop_cart') || '{}'); } catch (e) { shopCart = {}; }

  function shopSaveCart() { localStorage.setItem('conect_shop_cart', JSON.stringify(shopCart)); }
  function shopCartCount() { return Object.values(shopCart).reduce((a, b) => a + b, 0); }
  function shopCartSubtotal() {
    return Object.entries(shopCart).reduce((sum, [id, qty]) => {
      const p = shopProductById(id);
      return sum + (p ? p.price * qty : 0);
    }, 0);
  }
  function shopAddToCart(id, qty) {
    qty = qty || 1;
    shopCart[id] = (shopCart[id] || 0) + qty;
    shopSaveCart();
    shopUpdateCartBadge();
    const p = shopProductById(id);
    showToast(p ? `${p.name} adicionado ao carrinho` : 'Produto adicionado ao carrinho');
  }
  function shopSetQty(id, qty) {
    if (qty <= 0) { delete shopCart[id]; } else { shopCart[id] = qty; }
    shopSaveCart();
    shopUpdateCartBadge();
    shopRenderCart();
  }
  function shopUpdateCartBadge() {
    const badge = document.getElementById('shoppingCartCount');
    if (badge) badge.textContent = shopCartCount();
  }

  // ---- Catálogo: grid + busca + filtro ----
  const shopProductGrid = document.getElementById('shopProductGrid');
  const shopSearchInput = document.getElementById('shopSearchInput');
  const shopCategoryPills = document.getElementById('shopCategoryPills');
  let shopActiveCat = 'todos';

  function shopRenderGrid() {
    if (!shopProductGrid) return;
    const term = (shopSearchInput && shopSearchInput.value || '').trim().toLowerCase();
    const list = SHOP_PRODUCTS.filter(p => {
      const matchesCat = shopActiveCat === 'todos' || p.cat === shopActiveCat;
      const matchesTerm = !term || p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term);
      return matchesCat && matchesTerm;
    });
    shopProductGrid.innerHTML = list.map(p => `
      <button class="shop-product-card" data-product-id="${p.id}">
        <div class="shop-detail-icon" style="width:56px;height:56px;margin-bottom:6px;">${shopIconSvg(p.cat)}</div>
        <span class="shop-product-brand">${p.brand}</span>
        <h4>${p.name}</h4>
        <div class="avaliacao-stars">${shopStars(p.rating)} <span>${p.rating.toFixed(1)} · ${p.reviews}</span></div>
        <div class="shop-product-foot">
          <span class="shop-product-price">${shopFmt(p.price)}</span>
          <span class="shop-add-btn" data-add-id="${p.id}" title="Adicionar ao carrinho">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10l-1 9a1.5 1.5 0 01-1.5 1.3h-5A1.5 1.5 0 016 16z"/><path d="M7 7V5a3 3 0 016 0v2"/><path d="M10 10v3M8.5 11.5h3"/></svg>
          </span>
        </div>
      </button>
    `).join('');
    const emptyMsg = document.getElementById('shopEmptyMsg');
    if (emptyMsg) emptyMsg.style.display = list.length ? 'none' : 'block';
  }

  if (shopProductGrid) {
    shopProductGrid.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-add-id]');
      if (addBtn) { e.stopPropagation(); shopAddToCart(addBtn.dataset.addId, 1); return; }
      const card = e.target.closest('[data-product-id]');
      if (card) shopOpenDetail(card.dataset.productId);
    });
  }
  if (shopSearchInput) shopSearchInput.addEventListener('input', shopRenderGrid);
  if (shopCategoryPills) {
    shopCategoryPills.querySelectorAll('.shop-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        shopCategoryPills.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        shopActiveCat = pill.dataset.cat;
        shopRenderGrid();
      });
    });
  }

  // ---- Navegação entre views internas de Compras ----
  function shopShowView(viewId) {
    document.querySelectorAll('#shop-compras .shop-view').forEach(v => v.classList.remove('active'));
    const v = document.getElementById(viewId);
    if (v) v.classList.add('active');
    if (shoppingScroll) shoppingScroll.scrollTop = 0;
  }
  document.querySelectorAll('[data-shop-back]').forEach(btn => {
    btn.addEventListener('click', () => shopShowView(btn.dataset.shopBack));
  });

  let shopDetailQty = 1;
  function shopOpenDetail(id) {
    const p = shopProductById(id);
    if (!p) return;
    shopDetailQty = 1;
    const card = document.getElementById('shopDetailCard');
    card.innerHTML = `
      <div class="shop-detail-icon">${shopIconSvg(p.cat)}</div>
      <div class="shop-detail-info">
        <span class="eyebrow">${p.brand} · ${SHOP_CAT_LABELS[p.cat]}</span>
        <h3>${p.name}</h3>
        <div class="avaliacao-stars">${shopStars(p.rating)} <span>${p.rating.toFixed(1)} · ${p.reviews} avaliações</span></div>
        <div class="shop-detail-price">${shopFmt(p.price)}</div>
        <p class="shop-detail-desc">${p.desc}</p>
        <div class="shop-qty-row">
          <div class="shop-qty-stepper">
            <button type="button" id="shopQtyMinus">−</button>
            <span id="shopQtyValue">1</span>
            <button type="button" id="shopQtyPlus">+</button>
          </div>
        </div>
        <div class="shop-detail-actions">
          <button class="btn btn-primary" id="shopDetailAddBtn">
            Adicionar ao carrinho
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 7h12M8 2l5 5-5 5"/></svg>
          </button>
          <button class="btn btn-ghost" id="shopDetailReviewsBtn">Ver avaliações de ${SHOP_CAT_LABELS[p.cat]}</button>
        </div>
      </div>
    `;
    document.getElementById('shopQtyMinus').addEventListener('click', () => {
      shopDetailQty = Math.max(1, shopDetailQty - 1);
      document.getElementById('shopQtyValue').textContent = shopDetailQty;
    });
    document.getElementById('shopQtyPlus').addEventListener('click', () => {
      shopDetailQty += 1;
      document.getElementById('shopQtyValue').textContent = shopDetailQty;
    });
    document.getElementById('shopDetailAddBtn').addEventListener('click', () => shopAddToCart(p.id, shopDetailQty));
    document.getElementById('shopDetailReviewsBtn').addEventListener('click', () => {
      openShoppingPanel('shop-avaliacoes');
      shopOpenReviewCategory(p.cat);
    });
    shopShowView('shopViewDetail');
  }

  // ---- Carrinho: renderização + fluxo ----
  const shopCartList = document.getElementById('shopCartList');
  function shopRenderCart() {
    if (!shopCartList) return;
    const entries = Object.entries(shopCart).filter(([id]) => shopProductById(id));
    const summary = document.getElementById('shopCartSummary');
    const emptyMsg = document.getElementById('shopCartEmptyMsg');
    if (!entries.length) {
      shopCartList.innerHTML = '';
      if (summary) summary.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (summary) summary.style.display = 'block';
    shopCartList.innerHTML = entries.map(([id, qty]) => {
      const p = shopProductById(id);
      return `
        <div class="shop-cart-item">
          <div class="shop-cart-item-icon">${shopIconSvg(p.cat)}</div>
          <div class="shop-cart-item-info">
            <h5>${p.name}</h5>
            <span>${p.brand} · ${shopFmt(p.price)} cada</span>
          </div>
          <div class="shop-qty-stepper">
            <button type="button" data-cart-minus="${id}">−</button>
            <span>${qty}</span>
            <button type="button" data-cart-plus="${id}">+</button>
          </div>
          <span class="shop-cart-item-price">${shopFmt(p.price * qty)}</span>
          <button class="shop-cart-item-remove" data-cart-remove="${id}" title="Remover">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
      `;
    }).join('');
    const subtotal = shopCartSubtotal();
    document.getElementById('shopCartSubtotal').textContent = shopFmt(subtotal);
    document.getElementById('shopCartTotal').textContent = shopFmt(subtotal);
  }
  if (shopCartList) {
    shopCartList.addEventListener('click', (e) => {
      const minus = e.target.closest('[data-cart-minus]');
      const plus = e.target.closest('[data-cart-plus]');
      const remove = e.target.closest('[data-cart-remove]');
      if (minus) shopSetQty(minus.dataset.cartMinus, (shopCart[minus.dataset.cartMinus] || 1) - 1);
      if (plus) shopSetQty(plus.dataset.cartPlus, (shopCart[plus.dataset.cartPlus] || 0) + 1);
      if (remove) shopSetQty(remove.dataset.cartRemove, 0);
    });
  }

  const shopGoCheckoutBtn = document.getElementById('shopGoCheckoutBtn');
  if (shopGoCheckoutBtn) {
    shopGoCheckoutBtn.addEventListener('click', () => {
      shopRenderCheckoutSummary();
      shopShowView('shopViewCheckout');
    });
  }

  function shopRenderCheckoutSummary() {
    const box = document.getElementById('shopCheckoutItems');
    if (!box) return;
    const entries = Object.entries(shopCart).filter(([id]) => shopProductById(id));
    box.innerHTML = entries.map(([id, qty]) => {
      const p = shopProductById(id);
      return `<div class="shop-checkout-line"><span>${p.name} × ${qty}</span><span>${shopFmt(p.price * qty)}</span></div>`;
    }).join('');
    document.getElementById('shopCheckoutTotal').textContent = shopFmt(shopCartSubtotal());
  }

  const shopCheckoutForm = document.getElementById('shopCheckoutForm');
  if (shopCheckoutForm) {
    shopCheckoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      shopCart = {};
      shopSaveCart();
      shopUpdateCartBadge();
      shopRenderCart();
      shopCheckoutForm.reset();
      shopShowView('shopViewSuccess');
    });
  }
  const shopBackToCatalogBtn = document.getElementById('shopBackToCatalogBtn');
  if (shopBackToCatalogBtn) shopBackToCatalogBtn.addEventListener('click', () => shopShowView('shopViewCatalog'));

  // ---- Botão de carrinho na topbar: leva direto pra aba Compras > Carrinho ----
  if (shoppingCartBtn) {
    shoppingCartBtn.addEventListener('click', () => {
      openShoppingPanel('shop-compras');
      shopRenderCart();
      shopShowView('shopViewCart');
    });
  }

  // ---- Preço Baixo: agrupador (Setup, Máquinas, Cartuchos, Tintas, Hardware, Produtos, Biossegurança) ----
  const PRECO_GROUPS = [
    { key: 'setup', label: 'Setup', ids: ['p16', 'p17', 'p18', 'p19'] },
    { key: 'maquinas', label: 'Máquinas', cat: 'maquinas', useSubtypes: true },
    { key: 'cartuchos', label: 'Cartuchos', cat: 'cartuchos', useSubtypes: true },
    { key: 'tintas', label: 'Tintas', cat: 'tintas', useSubtypes: true },
    { key: 'hardware', label: 'Hardware', ids: ['p20', 'p21'], extraCat: 'impressoras' },
    { key: 'produtos', label: 'Produtos', cat: 'transfer', useSubtypes: true },
    { key: 'bioseguranca', label: 'Biossegurança', cat: 'bioseguranca', useSubtypes: true },
  ];

  // Ofertas com curadoria manual pros produtos mais buscados — os demais
  // ganham ofertas geradas automaticamente (mesma lógica visual).
  const SHOP_MANUAL_OFFERS = {
    p6: [
      { seller: 'Kwadron Store', price: 89, rating: 4.7, reviews: 203 },
      { seller: 'TattooShop BR', price: 94, rating: 4.5, reviews: 120 },
      { seller: 'Mercado Ink', price: 82, rating: 4.2, reviews: 75 },
    ],
    p10: [
      { seller: 'Electric Ink Oficial', price: 68, rating: 4.9, reviews: 288 },
      { seller: 'Body Art Center', price: 73, rating: 4.6, reviews: 140 },
      { seller: 'InkHouse BR', price: 65, rating: 4.3, reviews: 58 },
    ],
    p1: [
      { seller: 'Magnum Store', price: 890, rating: 4.9, reviews: 312 },
      { seller: 'Tattoo Center SP', price: 945, rating: 4.6, reviews: 90 },
      { seller: 'ProInk Equip', price: 869, rating: 4.4, reviews: 55 },
    ],
    p41: [
      { seller: 'Ambition Oficial', price: 820, rating: 4.6, reviews: 175 },
      { seller: 'Tattoo Center SP', price: 865, rating: 4.4, reviews: 60 },
      { seller: 'ProInk Equip', price: 799, rating: 4.3, reviews: 48 },
    ],
    p8: [
      { seller: 'Spirit Oficial', price: 79, rating: 4.6, reviews: 142 },
      { seller: 'PapelTattoo', price: 85, rating: 4.3, reviews: 44 },
      { seller: 'InkSupply', price: 75, rating: 4.0, reviews: 29 },
    ],
    p13: [
      { seller: 'Supermax Direto', price: 42, rating: 4.5, reviews: 210 },
      { seller: 'MedSafe BR', price: 46, rating: 4.2, reviews: 77 },
      { seller: 'BioTattoo Shop', price: 39, rating: 3.9, reviews: 31 },
    ],
  };
  const SHOP_SELLER_POOL = ['TattooShop BR', 'Studio Supply', 'ProInk Equip', 'Mercado Ink', 'InkHouse BR', 'BioTattoo Shop', 'Body Art Center', 'PapelTattoo', 'MedSafe BR', 'Tattoo Center SP', 'Loja Parceira Norte', 'Loja Parceira Sul'];
  function shopHash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  function shopGenerateOffers(p) {
    const h = shopHash(p.id);
    const idxs = [...new Set([h % SHOP_SELLER_POOL.length, (h * 7 + 3) % SHOP_SELLER_POOL.length, (h * 13 + 5) % SHOP_SELLER_POOL.length, (h * 19 + 11) % SHOP_SELLER_POOL.length])];
    const sellers = idxs.slice(0, 3).map(i => SHOP_SELLER_POOL[i]);
    const variance = [0.94, 1.0, 1.08];
    return sellers.map((seller, i) => ({
      seller,
      price: Math.max(1, Math.round(p.price * variance[i])),
      rating: Math.max(3.6, Math.min(5, p.rating + (i === 0 ? 0.05 : i === 2 ? -0.15 : 0))),
      reviews: Math.max(8, Math.round(p.reviews * (i === 1 ? 1 : 0.4))),
    }));
  }
  function shopOffersFor(p) { return SHOP_MANUAL_OFFERS[p.id] || shopGenerateOffers(p); }

  function shopRenderOfferRows(p, offers) {
    const cheapest = Math.min(...offers.map(o => o.price));
    return `<div class="shop-offer-list">` + offers.map(o => `
      <div class="shop-offer-row ${o.price === cheapest ? 'best' : ''}">
        <span class="shop-offer-seller">${o.seller} ${o.price === cheapest ? '<span class="shop-offer-best-tag">Melhor preço</span>' : ''}</span>
        <span class="shop-offer-rating"><strong>★ ${o.rating.toFixed(1)}</strong> · ${o.reviews} avaliações</span>
        <span class="shop-offer-price">${shopFmt(o.price)}</span>
        <span class="shop-offer-actions">
          <button class="shop-offer-link" data-offer-link="${o.seller}">Ver no site</button>
          <button class="shop-offer-add" data-offer-add="${p.id}">Adicionar</button>
        </span>
      </div>
    `).join('') + `</div>`;
  }

  function shopRenderPrecoGroups() {
    const bar = document.getElementById('shopPrecoGroupBar');
    if (!bar) return;
    bar.innerHTML = PRECO_GROUPS.map((g, i) => `<span class="shop-pill ${i === 0 ? 'active' : ''}" data-preco-group="${g.key}">${g.label}</span>`).join('');
    bar.querySelectorAll('.shop-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        bar.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        shopRenderPrecoItems(pill.dataset.precoGroup);
      });
    });
  }

  // Entra num grupo: se ele tem sub-tipos (ex: Máquinas → Bobina/Rotativa/Híbrida/Pen),
  // mostra a barra de sub-tipo e já abre o primeiro; senão, lista os itens direto.
  function shopRenderPrecoItems(groupKey) {
    const group = PRECO_GROUPS.find(g => g.key === groupKey);
    const subBar = document.getElementById('shopPrecoSubtypeBar');
    const subLabel = document.getElementById('shopPrecoSubtypeLabel');
    if (!group || !subBar) return;
    if (group.useSubtypes) {
      const subs = SHOP_SUBTYPES[group.cat] || [];
      subBar.style.display = subs.length ? 'flex' : 'none';
      if (subLabel) subLabel.style.display = subs.length ? 'flex' : 'none';
      subBar.innerHTML = subs.map((s, i) => `<span class="shop-pill ${i === 0 ? 'active' : ''}" data-preco-subtype="${s.key}">${s.label}</span>`).join('');
      subBar.querySelectorAll('.shop-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          subBar.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          shopRenderPrecoStackItems(SHOP_PRODUCTS.filter(p => p.cat === group.cat && p.subtype === pill.dataset.precoSubtype));
        });
      });
      if (subs.length) shopRenderPrecoStackItems(SHOP_PRODUCTS.filter(p => p.cat === group.cat && p.subtype === subs[0].key));
      else shopRenderPrecoStackItems([]);
    } else {
      subBar.style.display = 'none';
      if (subLabel) subLabel.style.display = 'none';
      subBar.innerHTML = '';
      let items = (group.ids || []).map(id => shopProductById(id)).filter(Boolean);
      if (group.extraCat) items = items.concat(SHOP_PRODUCTS.filter(p => p.cat === group.extraCat));
      shopRenderPrecoStackItems(items);
    }
  }

  function shopRenderPrecoStackItems(items) {
    const box = document.getElementById('shopPrecoStack');
    if (!box) return;
    if (!items.length) { box.innerHTML = '<p class="shop-empty-msg">Nenhum produto nesse grupo ainda.</p>'; return; }
    box.innerHTML = items.map(p => {
      const cheapest = Math.min(...shopOffersFor(p).map(o => o.price));
      return `
        <div class="shop-stack-item" data-stack-item="${p.id}">
          <div class="shop-stack-head" data-stack-toggle="${p.id}">
            <div class="shop-compare-icon">${shopIconSvg(p.cat)}</div>
            <div class="shop-rank-info">
              <span class="shop-product-brand">${p.brand} <span class="shop-stack-code">#${p.code}</span></span>
              <h4>${p.name}</h4>
            </div>
            <span class="shop-stack-price">a partir de ${shopFmt(cheapest)}</span>
            <button class="shop-stack-add" data-stack-add="${p.id}" title="Adicionar direto ao carrinho">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h9l-1 8a1.3 1.3 0 01-1.3 1.1H6.3A1.3 1.3 0 015 14z"/><path d="M6.5 6V4.5a2.5 2.5 0 015 0V6"/></svg>
            </button>
            <svg class="shop-rank-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4l6 6-6 6"/></svg>
          </div>
          <div class="shop-stack-body" id="shopStackBody-${p.id}"></div>
        </div>
      `;
    }).join('');
  }

  function shopToggleStackItem(id, forceOpen) {
    const item = document.querySelector(`[data-stack-item="${id}"]`);
    if (!item) return;
    const body = document.getElementById('shopStackBody-' + id);
    const willOpen = forceOpen !== undefined ? forceOpen : !item.classList.contains('open');
    item.classList.toggle('open', willOpen);
    if (willOpen && !body.dataset.rendered) {
      const p = shopProductById(id);
      body.innerHTML = shopRenderOfferRows(p, shopOffersFor(p));
      body.dataset.rendered = '1';
    }
  }

  const shopPrecoStack = document.getElementById('shopPrecoStack');
  if (shopPrecoStack) {
    shopPrecoStack.addEventListener('click', (e) => {
      const link = e.target.closest('[data-offer-link]');
      if (link) { showToast(`Link direto pra ${link.dataset.offerLink} chega quando as integrações forem ativadas`); return; }
      const offerAdd = e.target.closest('[data-offer-add]');
      if (offerAdd) { shopAddToCart(offerAdd.dataset.offerAdd, 1); return; }
      const quickAdd = e.target.closest('[data-stack-add]');
      if (quickAdd) { e.stopPropagation(); shopAddToCart(quickAdd.dataset.stackAdd, 1); return; }
      const toggle = e.target.closest('[data-stack-toggle]');
      if (toggle) shopToggleStackItem(toggle.dataset.stackToggle);
    });
  }

  // ---- Busca por código ou nome: cola o código copiado em Avaliações e pula
  // direto pra comparação de preço daquele produto específico. ----
  function shopPrecoSearch(term) {
    term = (term || '').trim().toLowerCase();
    if (!term) return;
    const product = SHOP_PRODUCTS.find(p => p.code === term) ||
      SHOP_PRODUCTS.find(p => p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term));
    if (!product) { showToast('Nenhum produto encontrado com esse código ou nome'); return; }

    const group = PRECO_GROUPS.find(g => g.cat === product.cat) ||
      PRECO_GROUPS.find(g => g.extraCat === product.cat) ||
      PRECO_GROUPS.find(g => g.ids && g.ids.includes(product.id));
    if (!group) { showToast('Esse produto ainda não tem comparação de preço.'); return; }

    document.querySelectorAll('#shopPrecoGroupBar .shop-pill').forEach(p => p.classList.toggle('active', p.dataset.precoGroup === group.key));

    if (group.useSubtypes && product.subtype) {
      const subs = SHOP_SUBTYPES[group.cat] || [];
      const subBar = document.getElementById('shopPrecoSubtypeBar');
      const subLabel = document.getElementById('shopPrecoSubtypeLabel');
      subBar.style.display = subs.length ? 'flex' : 'none';
      if (subLabel) subLabel.style.display = subs.length ? 'flex' : 'none';
      subBar.innerHTML = subs.map(s => `<span class="shop-pill ${s.key === product.subtype ? 'active' : ''}" data-preco-subtype="${s.key}">${s.label}</span>`).join('');
      subBar.querySelectorAll('.shop-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          subBar.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          shopRenderPrecoStackItems(SHOP_PRODUCTS.filter(p => p.cat === group.cat && p.subtype === pill.dataset.precoSubtype));
        });
      });
      shopRenderPrecoStackItems(SHOP_PRODUCTS.filter(p => p.cat === group.cat && p.subtype === product.subtype));
    } else {
      document.getElementById('shopPrecoSubtypeBar').style.display = 'none';
      const subLabel = document.getElementById('shopPrecoSubtypeLabel');
      if (subLabel) subLabel.style.display = 'none';
      let items = group.ids ? group.ids.map(id => shopProductById(id)).filter(Boolean) : [];
      if (group.extraCat) items = items.concat(SHOP_PRODUCTS.filter(p => p.cat === group.extraCat));
      shopRenderPrecoStackItems(items);
    }

    requestAnimationFrame(() => {
      shopToggleStackItem(product.id, true);
      const item = document.querySelector(`[data-stack-item="${product.id}"]`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.classList.add('flash');
        setTimeout(() => item.classList.remove('flash'), 1600);
      }
    });
  }
  const shopPrecoSearchInput = document.getElementById('shopPrecoSearchInput');
  const shopPrecoSearchBtn = document.getElementById('shopPrecoSearchBtn');
  if (shopPrecoSearchInput) {
    shopPrecoSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') shopPrecoSearch(shopPrecoSearchInput.value); });
  }
  if (shopPrecoSearchBtn) {
    shopPrecoSearchBtn.addEventListener('click', () => shopPrecoSearch(shopPrecoSearchInput.value));
  }

  // ---- Avaliações: migradas da seção Recursos, com sub-tipo, ranking e comentários ----
  // Comentários fictícios (dados de teste pra popular o protótipo) — cada item
  // com rating veio de "compra verificada"; comentários sem rating (adicionados
  // pelo formulário) ficam só como comentário, sem nota.
  const SHOP_COMMENTS = {
    p1: [
      { r: 0, rating: 5, text: 'Máquina show, curso suave e não esquenta mesmo em sessão longa.', date: '14 mar' },
      { r: 3, rating: 5, text: 'Melhor rotativa que já usei pra realismo, vale cada centavo.', date: '02 fev' },
    ],
    p2: [
      { r: 1, rating: 4, text: 'Bobina forte, boa pra quem já tá acostumado com o barulho.', date: '28 fev' },
      { r: 4, rating: 4, text: 'Precisa calibrar direitinho, mas depois disso ela entrega bem.', date: '19 jan' },
    ],
    p3: [
      { r: 2, rating: 4, text: 'A bateria segura um dia inteiro de atendimento, recomendo.', date: '05 mar' },
      { r: 5, rating: 4, text: 'Um pouco pesada na mão, mas a autonomia compensa.', date: '22 dez' },
    ],
    p24: [
      { r: 0, rating: 5, text: 'Empunhadura ótima pra sessão de linha fina, mão não cansa.', date: '11 mar' },
      { r: 3, rating: 4, text: 'Gostei bastante, só senti falta de mais opções de curso.', date: '30 jan' },
    ],
    p4: [
      { r: 1, rating: 5, text: 'Imprime rápido e o stencil sai bem definido, sem manchar.', date: '09 mar' },
      { r: 4, rating: 5, text: 'Investimento alto, mas o resultado final impressiona o cliente.', date: '14 fev' },
    ],
    p5: [
      { r: 2, rating: 4, text: 'Boa pra levar entre estúdios, cabe até na mochila.', date: '20 fev' },
    ],
    p6: [
      { r: 0, rating: 5, text: 'Agulha vem bem calibrada, linha sai limpa direto da caixa.', date: '17 mar' },
      { r: 5, rating: 5, text: 'Uso há meses e nunca tive cartucho entortando.', date: '03 jan' },
    ],
    p22: [
      { r: 3, rating: 4, text: 'Boa entrega de tinta pro preenchimento, recomendo pra fechamento.', date: '25 fev' },
    ],
    p7: [
      { r: 1, rating: 4, text: 'Sombreado saiu bem suave, gostei da textura da agulha.', date: '08 mar' },
      { r: 4, rating: 4, text: 'Cumpre bem o que promete, preço justo.', date: '15 dez' },
    ],
    p23: [
      { r: 2, rating: 4, text: 'Clássica e confiável, uso com minha bobina sem problema.', date: '01 mar' },
    ],
    p10: [
      { r: 0, rating: 5, text: 'Preto que não esverdeia com o tempo, referência mesmo.', date: '19 mar' },
      { r: 5, rating: 5, text: 'Pigmentação absurda, uso em quase todo trabalho de realismo.', date: '10 fev' },
    ],
    p12: [
      { r: 3, rating: 4, text: 'Boa opção pra clientes com pele mais sensível.', date: '27 jan' },
    ],
    p25: [
      { r: 1, rating: 5, text: 'Seca rápido e o traço fica bem definido em lettering.', date: '04 mar' },
      { r: 4, rating: 4, text: 'Gostei, só acho o frasco pequeno pra quem usa muito.', date: '21 fev' },
    ],
    p8: [
      { r: 2, rating: 5, text: 'Transferência nítida até em pele oleosa, sempre uso essa.', date: '12 mar' },
      { r: 5, rating: 4, text: 'Boa qualidade, o preço que pesa um pouco.', date: '30 nov' },
    ],
    p26: [
      { r: 0, rating: 4, text: 'Custo-benefício bom pra quem atende muito por semana.', date: '06 fev' },
    ],
    p13: [
      { r: 3, rating: 5, text: 'Luva resistente, não rasga no meio do atendimento.', date: '15 mar' },
      { r: 1, rating: 4, text: 'Boa, só o tamanho M veio meio justo pra mim.', date: '22 jan' },
    ],
    p27: [
      { r: 4, rating: 4, text: 'Confortável pra usar o dia inteiro, boa vedação.', date: '18 fev' },
    ],
    p28: [
      { r: 2, rating: 5, text: 'Antisséptico de confiança, uso antes e depois de toda sessão.', date: '09 mar' },
    ],
    p14: [
      { r: 5, rating: 4, text: 'Campo bom, estéril de verdade, dá pra confiar na bancada.', date: '27 fev' },
    ],
  };

  function shopRenderAvalCategories() {
    const grid = document.getElementById('shopAvalCatGrid');
    if (!grid) return;
    const cats = ['maquinas', 'impressoras', 'cartuchos', 'transfer', 'tintas', 'bioseguranca'];
    grid.innerHTML = cats.map(cat => {
      const items = SHOP_PRODUCTS.filter(p => p.cat === cat);
      const total = items.reduce((a, p) => a + p.reviews, 0);
      return `
        <button class="shop-avalcat-card" data-avalcat="${cat}">
          <div class="shop-detail-icon" style="width:44px;height:44px;">${shopIconSvg(cat)}</div>
          <h4>${SHOP_CAT_LABELS[cat]}</h4>
          <p>${total} avaliações da comunidade</p>
        </button>
      `;
    }).join('');
  }

  let shopAvalState = { cat: 'maquinas', subtype: 'todos' };

  function shopRenderSubtypeBar(cat) {
    const bar = document.getElementById('shopAvalSubtypeBar');
    const label = document.getElementById('shopAvalSubtypeLabel');
    if (!bar) return;
    const subs = SHOP_SUBTYPES[cat];
    if (!subs) { bar.innerHTML = ''; bar.style.display = 'none'; if (label) label.style.display = 'none'; return; }
    bar.style.display = 'flex';
    if (label) label.style.display = 'flex';
    bar.innerHTML = ['<span class="shop-pill active" data-subtype="todos">Todos</span>']
      .concat(subs.map(s => `<span class="shop-pill" data-subtype="${s.key}">${s.label}</span>`)).join('');
    bar.querySelectorAll('.shop-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        bar.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        shopAvalState.subtype = pill.dataset.subtype;
        shopRenderRankedList();
      });
    });
  }

  function shopRenderRankedList() {
    const cat = shopAvalState.cat;
    const box = document.getElementById('shopAvalReviewsGrid');
    if (!box) return;
    let items = SHOP_PRODUCTS.filter(p => p.cat === cat);
    if (shopAvalState.subtype !== 'todos') items = items.filter(p => p.subtype === shopAvalState.subtype);
    items = items.slice().sort((a, b) => b.rating - a.rating);
    if (!items.length) {
      box.innerHTML = '<p class="shop-empty-msg">Nenhum produto avaliado ainda nesse sub-tipo.</p>';
      return;
    }
    box.innerHTML = items.map((p, i) => `
      <div class="shop-rank-item" data-rank-id="${p.id}">
        <span class="shop-rank-num">#${i + 1}</span>
        <div class="shop-rank-icon">${shopIconSvg(p.cat)}</div>
        <div class="shop-rank-info">
          <span class="shop-product-brand">${p.brand}${p.subtype ? ' · ' + (SHOP_SUBTYPES[cat] || []).find(s => s.key === p.subtype)?.label || '' : ''}</span>
          <h4>${p.name}</h4>
          <button class="shop-code-tag" data-copy-code="${p.code}" title="Copiar código">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 014.5 2H11"/></svg>
            #${p.code}
          </button>
        </div>
        <div class="shop-rank-score">
          <div class="avaliacao-stars">${shopStars(p.rating)} <span>${p.rating.toFixed(1)}</span></div>
          <span class="avaliacao-count">${p.reviews} avaliações</span>
        </div>
        <svg class="shop-rank-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4l6 6-6 6"/></svg>
      </div>
    `).join('');
  }

  function shopOpenReviewCategory(cat) {
    shopAvalState = { cat, subtype: 'todos' };
    document.getElementById('shopAvalReviewsTitle').textContent = SHOP_CAT_LABELS[cat];
    shopRenderSubtypeBar(cat);
    shopRenderRankedList();
    document.querySelectorAll('#shop-avaliacoes .shop-view').forEach(v => v.classList.remove('active'));
    document.getElementById('shopAvalReviews').classList.add('active');
  }
  const shopAvalCatGrid = document.getElementById('shopAvalCatGrid');
  if (shopAvalCatGrid) {
    shopAvalCatGrid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-avalcat]');
      if (card) shopOpenReviewCategory(card.dataset.avalcat);
    });
  }
  const shopAvalBackBtn = document.getElementById('shopAvalBackBtn');
  if (shopAvalBackBtn) {
    shopAvalBackBtn.addEventListener('click', () => {
      document.querySelectorAll('#shop-avaliacoes .shop-view').forEach(v => v.classList.remove('active'));
      document.getElementById('shopAvalCategories').classList.add('active');
    });
  }
  const shopAvalReviewsGrid = document.getElementById('shopAvalReviewsGrid');
  if (shopAvalReviewsGrid) {
    shopAvalReviewsGrid.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy-code]');
      if (copyBtn) { e.stopPropagation(); shopCopyCode(copyBtn.dataset.copyCode); return; }
      const item = e.target.closest('[data-rank-id]');
      if (item) shopOpenAvalDetail(item.dataset.rankId);
    });
  }

  // ---- Página de produto: avaliações + comentários (estilo "produto de loja") ----
  function shopRenderComments(productId) {
    const list = SHOP_COMMENTS[productId] || [];
    const commentsBox = document.getElementById('shopCommentsList');
    if (!commentsBox) return;
    if (!list.length) {
      commentsBox.innerHTML = '<p class="shop-empty-msg">Ainda não tem comentário nesse produto. Seja o primeiro a comentar.</p>';
      return;
    }
    commentsBox.innerHTML = list.map(c => {
      const reviewer = SHOP_REVIEWERS[c.r % SHOP_REVIEWERS.length];
      return `
        <div class="shop-comment">
          ${shopAvatar(c.r)}
          <div class="shop-comment-body">
            <div class="shop-comment-head">
              <strong>${reviewer.name}</strong>
              <span class="shop-comment-handle">${reviewer.handle}</span>
              ${c.rating ? `<span class="shop-comment-verified">Compra verificada</span>` : ''}
              <span class="shop-comment-date">${c.date}</span>
            </div>
            ${c.rating ? `<div class="avaliacao-stars" style="margin:2px 0 6px;">${shopStars(c.rating)}</div>` : ''}
            <p>${c.text}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  function shopOpenAvalDetail(productId) {
    const p = shopProductById(productId);
    if (!p) return;
    const body = document.getElementById('shopAvalDetailBody');
    const subLabel = p.subtype ? (SHOP_SUBTYPES[p.cat] || []).find(s => s.key === p.subtype)?.label : null;
    body.innerHTML = `
      <div class="shop-detail-card" style="margin-bottom:32px;">
        <div class="shop-detail-icon">${shopIconSvg(p.cat)}</div>
        <div class="shop-detail-info">
          <span class="eyebrow">${p.brand} · ${SHOP_CAT_LABELS[p.cat]}${subLabel ? ' · ' + subLabel : ''}</span>
          <h3>${p.name}</h3>
          <button class="shop-code-tag shop-code-tag-lg" data-copy-code="${p.code}" title="Copiar código">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 014.5 2H11"/></svg>
            Código #${p.code} — copiar pra buscar em Preço Baixo
          </button>
          <div class="avaliacao-stars">${shopStars(p.rating)} <span>${p.rating.toFixed(1)} de média · ${p.reviews} avaliações</span></div>
          <p class="shop-detail-desc">${p.desc}</p>
          <div class="shop-detail-actions">
            <button class="btn btn-primary" data-detail-buy="${p.id}">
              Ver na loja — ${shopFmt(p.price)}
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 7h12M8 2l5 5-5 5"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="shop-comments-section">
        <span class="eyebrow">Comentários</span>
        <h4 style="font-size:1.05rem;font-weight:600;color:var(--text-1);margin:6px 0 16px;">O que os tatuadores estão dizendo</h4>
        <div class="shop-comments-list" id="shopCommentsList"></div>

        <form class="shop-comment-form" id="shopCommentForm">
          <textarea placeholder="Deixe seu comentário sobre esse produto..." required></textarea>
          <div class="shop-comment-form-foot">
            <p>Só quem comprou o produto pode dar nota. Comentários ficam abertos pra todo mundo.</p>
            <button type="submit" class="btn btn-ghost">Comentar</button>
          </div>
        </form>
      </div>
    `;
    shopRenderComments(p.id);

    document.getElementById('shopCommentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const textarea = e.target.querySelector('textarea');
      const text = textarea.value.trim();
      if (!text) return;
      if (!SHOP_COMMENTS[p.id]) SHOP_COMMENTS[p.id] = [];
      SHOP_COMMENTS[p.id].push({ you: true, rating: null, text, date: 'agora' });
      textarea.value = '';
      shopRenderComments(p.id);
      showToast('Comentário publicado');
    });
    body.querySelector('[data-detail-buy]').addEventListener('click', () => {
      openShoppingPanel('shop-compras');
      shopOpenDetail(p.id);
    });
    body.querySelector('[data-copy-code]').addEventListener('click', (e) => shopCopyCode(e.currentTarget.dataset.copyCode));

    document.querySelectorAll('#shop-avaliacoes .shop-view').forEach(v => v.classList.remove('active'));
    document.getElementById('shopAvalDetail').classList.add('active');
    if (shoppingScroll) shoppingScroll.scrollTop = 0;
  }
  const shopAvalDetailBackBtn = document.getElementById('shopAvalDetailBackBtn');
  if (shopAvalDetailBackBtn) {
    shopAvalDetailBackBtn.addEventListener('click', () => {
      document.querySelectorAll('#shop-avaliacoes .shop-view').forEach(v => v.classList.remove('active'));
      document.getElementById('shopAvalReviews').classList.add('active');
    });
  }

  // ---- Treinamento: catálogo próprio (peles, kits, ebooks, tinta de treino,
  // vaselina) — mesmo mecanismo de busca/filtro/grid/detalhe/carrinho de Compras.
  const TRAIN_CATS = ['peles', 'kits', 'ebooks', 'tintatreino', 'vaselina'];
  const shopTrainProductGrid = document.getElementById('shopTrainProductGrid');
  const shopTrainSearchInput = document.getElementById('shopTrainSearchInput');
  const shopTrainCategoryPills = document.getElementById('shopTrainCategoryPills');
  let shopTrainActiveCat = 'todos';

  function shopRenderTrainGrid() {
    if (!shopTrainProductGrid) return;
    const term = (shopTrainSearchInput && shopTrainSearchInput.value || '').trim().toLowerCase();
    const list = SHOP_PRODUCTS.filter(p => {
      if (!TRAIN_CATS.includes(p.cat)) return false;
      const matchesCat = shopTrainActiveCat === 'todos' || p.cat === shopTrainActiveCat;
      const matchesTerm = !term || p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term);
      return matchesCat && matchesTerm;
    });
    shopTrainProductGrid.innerHTML = list.map(p => `
      <button class="shop-product-card" data-train-product-id="${p.id}">
        <div class="shop-detail-icon" style="width:56px;height:56px;margin-bottom:6px;">${shopIconSvg(p.cat)}</div>
        <span class="shop-product-brand">${p.brand}</span>
        <h4>${p.name}</h4>
        <div class="avaliacao-stars">${shopStars(p.rating)} <span>${p.rating.toFixed(1)} · ${p.reviews}</span></div>
        <div class="shop-product-foot">
          <span class="shop-product-price">${shopFmt(p.price)}</span>
          <span class="shop-add-btn" data-train-add-id="${p.id}" title="Adicionar ao carrinho">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h10l-1 9a1.5 1.5 0 01-1.5 1.3h-5A1.5 1.5 0 016 16z"/><path d="M7 7V5a3 3 0 016 0v2"/><path d="M10 10v3M8.5 11.5h3"/></svg>
          </span>
        </div>
      </button>
    `).join('');
    const emptyMsg = document.getElementById('shopTrainEmptyMsg');
    if (emptyMsg) emptyMsg.style.display = list.length ? 'none' : 'block';
  }
  if (shopTrainProductGrid) {
    shopTrainProductGrid.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-train-add-id]');
      if (addBtn) { e.stopPropagation(); shopAddToCart(addBtn.dataset.trainAddId, 1); return; }
      const card = e.target.closest('[data-train-product-id]');
      if (card) shopOpenTrainDetail(card.dataset.trainProductId);
    });
  }
  if (shopTrainSearchInput) shopTrainSearchInput.addEventListener('input', shopRenderTrainGrid);
  if (shopTrainCategoryPills) {
    shopTrainCategoryPills.querySelectorAll('.shop-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        shopTrainCategoryPills.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        shopTrainActiveCat = pill.dataset.cat;
        shopRenderTrainGrid();
      });
    });
  }

  function shopShowTrainView(viewId) {
    document.querySelectorAll('#shop-treinamento .shop-view').forEach(v => v.classList.remove('active'));
    const v = document.getElementById(viewId);
    if (v) v.classList.add('active');
    if (shoppingScroll) shoppingScroll.scrollTop = 0;
  }
  document.querySelectorAll('[data-shop-train-back]').forEach(btn => {
    btn.addEventListener('click', () => shopShowTrainView(btn.dataset.shopTrainBack));
  });

  let shopTrainDetailQty = 1;
  function shopOpenTrainDetail(id) {
    const p = shopProductById(id);
    if (!p) return;
    shopTrainDetailQty = 1;
    const card = document.getElementById('shopTrainDetailCard');
    card.innerHTML = `
      <div class="shop-detail-icon">${shopIconSvg(p.cat)}</div>
      <div class="shop-detail-info">
        <span class="eyebrow">${p.brand} · ${SHOP_CAT_LABELS[p.cat]}</span>
        <h3>${p.name}</h3>
        <button class="shop-code-tag" data-copy-code="${p.code}" title="Copiar código">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 014.5 2H11"/></svg>
          #${p.code}
        </button>
        <div class="avaliacao-stars">${shopStars(p.rating)} <span>${p.rating.toFixed(1)} · ${p.reviews} avaliações</span></div>
        <div class="shop-detail-price">${shopFmt(p.price)}</div>
        <p class="shop-detail-desc">${p.desc}</p>
        <div class="shop-qty-row">
          <div class="shop-qty-stepper">
            <button type="button" id="shopTrainQtyMinus">−</button>
            <span id="shopTrainQtyValue">1</span>
            <button type="button" id="shopTrainQtyPlus">+</button>
          </div>
        </div>
        <div class="shop-detail-actions">
          <button class="btn btn-primary" id="shopTrainDetailAddBtn">
            Adicionar ao carrinho
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 7h12M8 2l5 5-5 5"/></svg>
          </button>
        </div>
      </div>
    `;
    document.getElementById('shopTrainQtyMinus').addEventListener('click', () => {
      shopTrainDetailQty = Math.max(1, shopTrainDetailQty - 1);
      document.getElementById('shopTrainQtyValue').textContent = shopTrainDetailQty;
    });
    document.getElementById('shopTrainQtyPlus').addEventListener('click', () => {
      shopTrainDetailQty += 1;
      document.getElementById('shopTrainQtyValue').textContent = shopTrainDetailQty;
    });
    document.getElementById('shopTrainDetailAddBtn').addEventListener('click', () => shopAddToCart(p.id, shopTrainDetailQty));
    card.querySelector('[data-copy-code]').addEventListener('click', (e) => shopCopyCode(e.currentTarget.dataset.copyCode));
    shopShowTrainView('shopTrainViewDetail');
  }

  const shopTrainSchoolLink = document.getElementById('shopTrainSchoolLink');
  if (shopTrainSchoolLink) {
    shopTrainSchoolLink.addEventListener('click', () => {
      closeShoppingOverlay();
      openContentPanel('panel-school');
      requestAnimationFrame(() => {
        const materiais = document.getElementById('materiais');
        if (materiais) {
          const top = materiais.getBoundingClientRect().top - contentOverlayScroll.getBoundingClientRect().top + contentOverlayScroll.scrollTop - 16;
          contentOverlayScroll.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // ---- Necessidade Studio: pré-visualização (aguarda controle de estoque do My Studio) ----
  const SHOP_NEED_PREVIEW = [
    { cat: 'tintas', name: 'Pigment Black Deep 30ml', note: 'Estoque baixo (exemplo)' },
    { cat: 'bioseguranca', name: 'Luva Nitrílica P/M/G', note: 'Repor em breve (exemplo)' },
    { cat: 'cartuchos', name: 'RL Precision 0.30mm', note: 'Uso frequente (exemplo)' },
    { cat: 'transfer', name: 'ThermoCopy Sensitive', note: 'Repor em breve (exemplo)' },
  ];
  function shopRenderNeedPreview() {
    const list = document.getElementById('shopNeedList');
    if (!list) return;
    list.innerHTML = SHOP_NEED_PREVIEW.map(n => `
      <div class="shop-need-item">
        <div class="shop-need-item-icon">${shopIconSvg(n.cat)}</div>
        <div class="shop-need-item-info">
          <h5>${n.name}</h5>
          <span>${n.note}</span>
        </div>
        <span class="shop-need-item-tag">Preview</span>
      </div>
    `).join('');
  }

  // ---- Inicialização dos dados do Shopping ----
  shopUpdateCartBadge();
  shopRenderGrid();
  shopRenderPrecoGroups();
  shopRenderPrecoItems(PRECO_GROUPS[0].key);
  shopRenderAvalCategories();
  shopRenderTrainGrid();
  shopRenderNeedPreview();


  document.querySelectorAll('[data-close-panel]').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const panel = document.getElementById(closeBtn.dataset.closePanel);
      if (panel) panel.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (cornerWidget && !cornerWidget.contains(e.target)) {
      closeAllCornerPanels();
    }
  });

  const walletDepositBtn = document.getElementById('walletDepositBtn');
  if (walletDepositBtn) {
    walletDepositBtn.addEventListener('click', () => showToast('Depósito de tokens em breve disponível!'));
  }
  const walletConvertBtn = document.getElementById('walletConvertBtn');
  if (walletConvertBtn) {
    walletConvertBtn.addEventListener('click', () => showToast('Conversão de assinatura em tokens em breve disponível!'));
  }

  // Acesso via console: conectLeads()
  window.conectLeads = () => {
    const leads = JSON.parse(localStorage.getItem('conect_leads') || '[]');
    console.table(leads); return leads;
  };

  // ── Parallax leve nos rings do hero ───────────
  window.addEventListener('scroll', () => {
    const rings = document.querySelectorAll('.ring');
    const sy = window.scrollY;
    rings.forEach((r, i) => {
      const speed = [0.12, 0.08, 0.16][i] || 0.1;
      r.style.transform = `translateY(${sy * speed}px)`;
    });
  }, { passive: true });

  // ── IA TATTOO — Navegação entre 7 ferramentas ──
  function switchIATool(toolName) {
    // Atualiza nav buttons
    document.querySelectorAll('.ia-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
    // Mostra painel correto
    document.querySelectorAll('.ia-tool-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tool-' + toolName);
    });
    // Scroll suave pro topo do painel
    const nav = document.getElementById('iaToolsNav');
    if (nav) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Nav buttons
  document.querySelectorAll('.ia-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => switchIATool(btn.dataset.tool));
  });

  // Botões auxiliares (em qualquer ferramenta)
  document.querySelectorAll('.ia-aux-btn').forEach(btn => {
    btn.addEventListener('click', () => switchIATool(btn.dataset.tool));
  });

  // Estilos — seleção
  document.querySelectorAll('.ia-estilo-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ia-estilo-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const estiloNomes = {
        fineline: 'Fine Line — traços finos, minimalista, sem preenchimento.',
        realismo: 'Realismo — detalhes fotográficos, sombreado denso.',
        blackwork: 'Blackwork — áreas sólidas de preto, alto contraste.',
        oldschool: 'Old School — contornos grossos, cores vibrantes.',
        geometrico: 'Geométrico — formas precisas, padrões simétricos.',
        aquarela: 'Aquarela — manchas de cor suaves, sem contorno rígido.'
      };
      const label = document.getElementById('estiloSelecionadoLabel');
      if (label) label.innerHTML = `Estilo selecionado: <strong>${card.querySelector('span').textContent}</strong> — ${estiloNomes[card.dataset.estilo] || ''}`;
    });
  });

  // Partes do corpo — try-on
  document.querySelectorAll('.ia-body-part').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ia-body-part').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const hint = document.getElementById('iaCameraHint');
      if (hint) hint.innerHTML = `Encaixe o <strong>${btn.textContent}</strong> dentro do guia`;
    });
  });

  // Gerador de ideias (simulação)
  const iaIdeiaBtn = document.getElementById('iaIdeiaBtn');
  if (iaIdeiaBtn) {
    iaIdeiaBtn.addEventListener('click', () => {
      const tema = document.getElementById('iaIdeiaTema').value.trim();
      const elementos = document.getElementById('iaIdeiaElementos').value.trim();
      const result = document.getElementById('iaIdeiasResult');
      if (!tema) { showToast('Informe um tema para gerar ideias'); return; }
      result.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-3)"><div class="decalque-spinner" style="margin:0 auto 12px"></div><p>Gerando ideias...</p></div>';
      setTimeout(() => {
        const ideias = [
          `${tema} com ${elementos || 'elementos naturais'} em composição centralizada, estilo minimalista com traços únicos`,
          `${tema} integrado a ${elementos || 'formas geométricas'}, criando contraste entre o orgânico e o estruturado`,
          `Representação abstrata de ${tema} usando ${elementos || 'linhas fluidas'}, focando na emoção ao invés do detalhe`
        ];
        result.innerHTML = ideias.map((ideia, i) => `
          <div style="padding:14px 16px;border:1px solid var(--border-1);border-radius:10px;margin:8px 0;background:var(--surface-3)">
            <span style="font-size:11px;color:var(--text-3);display:block;margin-bottom:6px">Conceito ${i+1}</span>
            <p style="font-size:13px;color:var(--text-1);margin:0">${ideia}</p>
            <button class="ia-aux-btn" data-tool="gerador" style="margin-top:10px;font-size:11px">Usar esta ideia →</button>
          </div>
        `).join('');
        // Re-bind aux buttons
        result.querySelectorAll('.ia-aux-btn').forEach(btn => {
          btn.addEventListener('click', () => switchIATool(btn.dataset.tool));
        });
        showToast('✓ 3 ideias geradas! (simulação — IA real em breve)');
      }, 1600);
    });
  }

  // Gerador texto→design (simulação)
  const iaGeradorBtn = document.getElementById('iaGeradorBtn');
  if (iaGeradorBtn) {
    iaGeradorBtn.addEventListener('click', () => {
      const texto = document.getElementById('iaGeradorTexto').value.trim();
      const result = document.getElementById('iaGeradorResult');
      if (!texto) { showToast('Descreva a tatuagem para gerar o design'); return; }
      result.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3)"><div class="decalque-spinner" style="margin:0 auto 12px"></div><p>Analisando descrição...<br><small>Gerando design...</small></p></div>';
      setTimeout(() => {
        result.innerHTML = `
          <div style="padding:24px;text-align:center">
            <div style="width:100%;aspect-ratio:1;border-radius:10px;background:var(--surface-3);display:flex;align-items:center;justify-content:center;border:1px solid var(--border-1);margin-bottom:12px">
              <div style="color:var(--text-3);font-size:12px;padding:20px">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1" style="width:48px;height:48px;opacity:0.4;display:block;margin:0 auto 10px"><rect x="4" y="4" width="40" height="40" rx="4"/><circle cx="17" cy="17" r="5"/><path d="M4 34l12-12 8 8 6-8 14 12"/></svg>
                Design gerado para:<br><em style="color:var(--text-2)">"${texto.substring(0,60)}${texto.length>60?'...':''}"</em><br><br>
                <small>IA real em breve</small>
              </div>
            </div>
          </div>`;
        showToast('✓ Design gerado! (simulação — IA real em breve)');
      }, 2200);
    });
  }

  // ── Gerador de Decalque (IA) ────────────────────
  // NOTA PARA INTEGRAÇÃO: hoje este recurso é só uma simulação visual.
  // Para conectar uma IA real de geração de decalque:
  //  1. No lugar do setTimeout abaixo, enviar a imagem (base64 ou FormData)
  //     pra um endpoint próprio (ex: fetch('/api/gerar-decalque', {...})).
  //  2. O backend chama o modelo de visão computacional / geração de imagem
  //     (ex: detecção de bordas + estilização, ou um modelo de IA generativa)
  //     e retorna a imagem processada (base64 ou URL).
  //  3. Substituir decalqueResultImg.src pela imagem retornada pelo backend.
  //  4. Liberar esse recurso só pra quem tem plano Pro/Premium (checar
  //     localStorage ou status de assinatura antes de permitir o upload).

  const decalqueUploadBox = document.getElementById('decalqueUploadBox');
  const decalqueFileInput = document.getElementById('decalqueFileInput');
  const decalqueSelectBtn = document.getElementById('decalqueSelectBtn');
  const decalqueEmptyState = document.getElementById('decalqueEmptyState');
  const decalquePreviewState = document.getElementById('decalquePreviewState');
  const decalqueOriginalImg = document.getElementById('decalqueOriginalImg');
  const decalqueResultImg = document.getElementById('decalqueResultImg');
  const decalqueLoading = document.getElementById('decalqueLoading');
  const decalqueResetBtn = document.getElementById('decalqueResetBtn');
  const decalqueDownloadBtn = document.getElementById('decalqueDownloadBtn');

  if (decalqueUploadBox && decalqueFileInput) {

    function handleDecalqueFile(file) {
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;

        decalqueEmptyState.style.display = 'none';
        decalquePreviewState.style.display = 'flex';
        decalqueOriginalImg.src = dataUrl;
        decalqueResultImg.style.display = 'none';
        decalqueLoading.style.display = 'flex';
        decalqueDownloadBtn.style.display = 'none';

        // Simulação do processamento de IA (sem backend ainda).
        // Aqui aplicamos um filtro CSS de "esboço" na própria imagem
        // original só para dar a sensação visual de um decalque,
        // enquanto a geração real não está conectada.
        setTimeout(() => {
          decalqueResultImg.src = dataUrl;
          decalqueResultImg.style.filter = 'grayscale(1) contrast(2.4) brightness(1.15)';
          decalqueLoading.style.display = 'none';
          decalqueResultImg.style.display = 'block';
          decalqueDownloadBtn.style.display = 'inline-flex';
          showToast('✓ Decalque gerado! (simulação — IA real em breve)');
        }, 1800);
      };
      reader.readAsDataURL(file);
    }

    decalqueSelectBtn.addEventListener('click', () => decalqueFileInput.click());

    decalqueFileInput.addEventListener('change', () => {
      if (decalqueFileInput.files[0]) handleDecalqueFile(decalqueFileInput.files[0]);
    });

    // Drag & drop
    ['dragenter', 'dragover'].forEach(evt => {
      decalqueUploadBox.addEventListener(evt, (e) => {
        e.preventDefault();
        decalqueUploadBox.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      decalqueUploadBox.addEventListener(evt, (e) => {
        e.preventDefault();
        decalqueUploadBox.classList.remove('drag-over');
      });
    });
    decalqueUploadBox.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) handleDecalqueFile(file);
    });

    decalqueResetBtn.addEventListener('click', () => {
      decalqueFileInput.value = '';
      decalquePreviewState.style.display = 'none';
      decalqueEmptyState.style.display = 'flex';
    });

    decalqueDownloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = decalqueResultImg.src;
      link.download = 'decalque-magnum-school.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

});

  // ══════════════════════════════════
  //  ARENA — lógica completa
  // ══════════════════════════════════

  // ── Tabs da Arena ──
  function switchArenaTab(tabName) {
    document.querySelectorAll('.arena-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.arena === tabName));
    document.querySelectorAll('.arena-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'arena-' + tabName));
  }
  document.querySelectorAll('.arena-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchArenaTab(btn.dataset.arena));
  });

  // Botões aux dentro das tabs
  document.querySelectorAll('[data-arena]').forEach(el => {
    if (!el.classList.contains('arena-tab-btn')) {
      el.addEventListener('click', () => switchArenaTab(el.dataset.arena));
    }
  });

  // ── Labs ──
  document.querySelectorAll('.arena-lab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.arena-lab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.arena-lab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('lab-' + btn.dataset.lab);
      if (panel) panel.classList.add('active');
    });
  });

  // ── Pills de estilo (toggle) ──
  document.querySelectorAll('.arena-estilo-pills').forEach(group => {
    group.querySelectorAll('.arena-estilo-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.arena-estilo-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  });

  // ── Countdown ──
  function arenaStartCountdown() {
    const target = new Date();
    target.setHours(target.getHours() + 2, target.getMinutes() + 34, target.getSeconds() + 18, 0);
    const hEl = document.getElementById('acdH');
    const mEl = document.getElementById('acdM');
    const sEl = document.getElementById('acdS');
    if (!hEl) return;
    setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      hEl.textContent = String(h).padStart(2, '0');
      mEl.textContent = String(m).padStart(2, '0');
      sEl.textContent = String(s).padStart(2, '0');
    }, 1000);
  }
  arenaStartCountdown();

  // ── Gerar desafio Drawing Lab ──
  const drawingBtn = document.getElementById('arenaGerarDrawingBtn');
  if (drawingBtn) {
    drawingBtn.addEventListener('click', () => {
      const estilo = document.querySelector('[data-treino-estilo].active, .arena-lab-panel.active .arena-estilo-pill.active')?.textContent?.trim() || 'Realismo';
      const result = document.getElementById('drawingResult');
      if (!result) return;
      result.innerHTML = '<div class="decalque-spinner" style="margin:0 auto 12px"></div><p>Gerando referência para ' + estilo + '...</p>';
      setTimeout(() => {
        result.innerHTML = `
          <div style="width:100%;aspect-ratio:1;background:linear-gradient(145deg,rgba(123,158,240,0.1),rgba(155,108,240,0.08));border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(123,158,240,0.2);">
            <div style="text-align:center;color:var(--a-text-3);padding:20px;">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="0.8" style="width:48px;height:48px;opacity:0.3;display:block;margin:0 auto 10px"><rect x="4" y="4" width="40" height="40" rx="4"/><circle cx="17" cy="17" r="5"/><path d="M4 34l12-12 8 8 6-8 14 12"/></svg>
              <p style="font-size:12px;margin:0;">Referência: <strong style="color:var(--a-blue)">${estilo}</strong><br><small>IA real em breve</small></p>
            </div>
          </div>`;
        if (typeof showToast === 'function') showToast('Desafio gerado! Agora pratique e envie sua foto.');
      }, 1800);
    });
  }

  // ── Gerar decalque Artificial Lab ──
  const artificialBtn = document.getElementById('arenaGerarArtificialBtn');
  if (artificialBtn) {
    artificialBtn.addEventListener('click', () => {
      const result = document.getElementById('artificialResult');
      const downloadBtn = document.getElementById('artificialDownloadBtn');
      if (!result) return;
      result.innerHTML = '<div class="decalque-spinner" style="margin:0 auto 12px"></div><p>Gerando decalque de treino...</p>';
      setTimeout(() => {
        result.innerHTML = `
          <div style="width:100%;aspect-ratio:1;background:linear-gradient(145deg,rgba(72,184,154,0.08),rgba(123,158,240,0.06));border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(72,184,154,0.2);">
            <div style="text-align:center;color:var(--a-text-3);padding:20px;">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="0.8" style="width:48px;height:48px;opacity:0.3;display:block;margin:0 auto 10px"><rect x="4" y="4" width="40" height="40" rx="4"/><circle cx="17" cy="17" r="5"/><path d="M4 34l12-12 8 8 6-8 14 12"/></svg>
              <p style="font-size:12px;margin:0;color:var(--a-green)">Decalque pronto!<br><small style="color:var(--a-text-3)">IA real em breve</small></p>
            </div>
          </div>`;
        if (downloadBtn) downloadBtn.style.display = 'inline-flex';
        if (typeof showToast === 'function') showToast('Decalque gerado! Imprima e cole na pele artificial.');
      }, 2000);
    });
  }

  // ── Criar sala de estudo ──
  const criarSalaBtn = document.getElementById('arenaCriarSalaBtn');
  if (criarSalaBtn) {
    criarSalaBtn.addEventListener('click', () => {
      const estilo = document.getElementById('arenaSalaEstilo')?.value;
      const tempo = document.getElementById('arenaSalaTempo')?.value;
      const nome = document.getElementById('arenaSalaNome')?.value;
      if (!estilo) { if (typeof showToast === 'function') showToast('Escolha um estilo primeiro'); return; }
      const code = 'ART-' + Math.random().toString(36).substring(2,6).toUpperCase();
      const link = `conect.tattoo/sala/${code}`;
      const result = document.getElementById('arenaSalaLinkResult');
      const input = document.getElementById('arenaSalaLinkInput');
      if (result && input) {
        input.value = link;
        result.style.display = 'flex';
      }
      if (typeof showToast === 'function') showToast(`Sala criada! Código: ${code}`);
    });
  }

  const copiarLinkBtn = document.getElementById('arenaCopiarLinkBtn');
  if (copiarLinkBtn) {
    copiarLinkBtn.addEventListener('click', () => {
      const input = document.getElementById('arenaSalaLinkInput');
      if (input) {
        navigator.clipboard?.writeText(input.value).catch(() => {});
        if (typeof showToast === 'function') showToast('Link copiado!');
      }
    });
  }

  // ── Entrar em sala ──
  const entrarSalaBtn = document.getElementById('arenaEntrarSalaBtn');
  if (entrarSalaBtn) {
    entrarSalaBtn.addEventListener('click', () => {
      const codigo = document.getElementById('arenaCodigoSala')?.value?.trim();
      if (!codigo) { if (typeof showToast === 'function') showToast('Insira o código da sala'); return; }
      if (typeof showToast === 'function') showToast(`Entrando na sala ${codigo}... (em breve)`);
    });
  }

