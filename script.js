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
  // Estado simples salvo no localStorage. Sem backend ainda:
  // qualquer clique em Entrar/Cadastrar/Instagram/Visitante já libera o site.
  // TODO no futuro: troque isso por autenticação real (Supabase, Firebase, etc).
  const gate = document.getElementById('gate');
  const gateCard = document.getElementById('gateCard');
  const gateScrollHint = document.getElementById('gateScrollHint');
  const gateForm = document.getElementById('gateForm');
  const gateSignup = document.getElementById('gateSignup');
  const gateInstagram = document.getElementById('gateInstagram');
  const gateGuest = document.getElementById('gateGuest');

  const drawerLoginLink = document.getElementById('drawerLoginLink');
  const drawerCadastroLink = document.getElementById('drawerCadastroLink');
  const drawerProfileLink = document.getElementById('drawerProfileLink');

  function getAccessType() {
    return localStorage.getItem('conect_access'); // 'member' | 'guest' | null
  }

  function setAccessType(type) {
    localStorage.setItem('conect_access', type);
  }

  function reflectAccessInUI() {
    const access = getAccessType();
    const isMember = access === 'member';

    // Link de Perfil só aparece pra quem é membro (cadastrado/logado).
    // Visitante continua vendo Login/Cadastre-se, já que ele não tem conta.
    if (drawerProfileLink) drawerProfileLink.style.display = isMember ? 'flex' : 'none';
    if (drawerLoginLink) drawerLoginLink.style.display = isMember ? 'none' : 'flex';
    if (drawerCadastroLink) drawerCadastroLink.style.display = isMember ? 'none' : 'flex';

    // Reflete também na seção de Perfil
    const perfilNome = document.getElementById('perfilNome');
    const perfilPlanoTag = document.getElementById('perfilPlanoTag');
    const perfilAvatarBig = document.getElementById('perfilAvatarBig');
    if (perfilNome && perfilPlanoTag && perfilAvatarBig) {
      if (isMember) {
        perfilNome.textContent = 'Membro Magnum';
        perfilPlanoTag.textContent = 'Plano Free';
        perfilAvatarBig.textContent = 'MD';
      } else if (access === 'guest') {
        perfilNome.textContent = 'Visitante';
        perfilPlanoTag.textContent = 'Acesso limitado';
        perfilAvatarBig.textContent = 'V';
      }
    }
  }

  function openSite() {
    gate.classList.add('gate-hidden');
    document.body.style.overflow = '';
    document.body.classList.remove('gate-locked');
  }

  function enterAsMember() {
    setAccessType('member');
    reflectAccessInUI();
    openSite();
  }

  function enterAsGuest() {
    setAccessType('guest');
    reflectAccessInUI();
    openSite();
  }

  // FASE DE TESTES: o Gate sempre aparece ao recarregar a página,
  // mesmo que o usuário já tenha "entrado" antes nesta sessão do navegador.
  // Quando for pra produção, troque a linha abaixo por:
  //   if (getAccessType()) { ... }
  // (ou seja, restaure a checagem do localStorage pra lembrar o acesso)
  const SEMPRE_MOSTRAR_GATE_EM_TESTES = true;

  if (!SEMPRE_MOSTRAR_GATE_EM_TESTES && getAccessType()) {
    reflectAccessInUI();
    gate.classList.add('gate-hidden');
  } else {
    reflectAccessInUI(); // ainda reflete o estado salvo (ex: ícone de perfil), só não pula o gate
    document.body.style.overflow = 'hidden';
    document.body.classList.add('gate-locked');
  }

  if (gateForm) {
    gateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      enterAsMember();
    });
  }
  if (gateSignup) gateSignup.addEventListener('click', enterAsMember);
  if (gateInstagram) gateInstagram.addEventListener('click', enterAsMember);
  if (gateGuest) gateGuest.addEventListener('click', enterAsGuest);

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
      localStorage.removeItem('conect_access');
      reflectAccessInUI();
      gate.classList.remove('gate-hidden');
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0 });
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
    chatToggle: document.getElementById('chatPanel'),
    shoppingToggle: document.getElementById('shoppingPanel'),
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

