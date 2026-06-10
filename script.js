// Reveal on scroll
const revEls = document.querySelectorAll('.reveal,.reveal-l,.reveal-r');
const ro = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('on'), i * 80);
      ro.unobserve(e.target);
    }
  });
}, { threshold: .1 });
revEls.forEach(el => ro.observe(el));

// Tag dinamica
const phrases = ['Educação STEAM para escolas','Formação prática sem laboratório','Alinhado à BNCC e PNED','Transformando salas de aula','Aprender fazendo — sempre'];
const tagEl = document.getElementById('heroTagText');
if (tagEl) {
  let i = 0;
  setInterval(() => {
    tagEl.classList.add('fading');
    setTimeout(() => { i=(i+1)%phrases.length; tagEl.textContent=phrases[i]; tagEl.classList.remove('fading'); }, 420);
  }, 3200);
}

// Form + Google Sheets + Download
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbz2TGCEYIn51ATAgQ5UOXIFa7MboDmotZQhqhpih2ppBA5caD-dvPbaQCsXnSvC3ckH/exec';
let ebookSelecionado = '';

document.querySelectorAll('.btn-recurso[download], a[download].btn-recurso').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    const ebookUrl = this.getAttribute('href') || '';

    if (ebookUrl !== 'documentos/ebook-robotica.pdf') {
      alert('Ebook em produção');
      return;
    }

    ebookSelecionado = ebookUrl;

    document.querySelectorAll('.btn-recurso[download], a[download].btn-recurso').forEach(b => {
      b.removeAttribute('data-selecionado');
    });
    this.setAttribute('data-selecionado', 'true');

    const avisoEbook = document.getElementById('aviso-ebook');
    if (avisoEbook) avisoEbook.remove();

    const contato = document.getElementById('contato');
    if (contato) contato.scrollIntoView({ behavior: 'smooth' });

    const form = document.querySelector('.lead-form');
    if (form) {
      setTimeout(() => {
        form.style.boxShadow = '0 0 0 3px rgba(50,165,87,.4)';
        setTimeout(() => form.style.boxShadow = '', 2000);
      }, 600);
    }
  });
});

document.querySelectorAll('.recurso-card .btn-recurso:not([download])').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Produto em fase de teste!');
  });
});

function validarNome(nome) {
  return /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+$/.test(nome.trim());
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function mostrarErro(campo, mensagem) {
  if (!campo) return;
  campo.style.borderColor = 'rgba(255,80,80,.6)';

  const grupo = campo.closest('.f-group') || campo.parentElement;
  if (!grupo) return;

  let erro = grupo.querySelector('.field-error');
  if (!erro) {
    erro = document.createElement('span');
    erro.className = 'field-error';
    erro.style.cssText = 'color:#e53935;font-size:.78rem;font-weight:700;margin-top:.3rem;display:block;';
    grupo.appendChild(erro);
  }
  erro.textContent = mensagem;
}

function limparErro(campo) {
  if (!campo) return;
  campo.style.borderColor = '';

  const grupo = campo.closest('.f-group') || campo.parentElement;
  const erro = grupo ? grupo.querySelector('.field-error') : null;
  if (erro) erro.remove();
}

function mostrarAvisoEbook() {
  const form = document.querySelector('.lead-form');
  const ebooks = document.getElementById('ebooks');
  const destinoAviso = ebooks ? (ebooks.querySelector('.section-inner') || ebooks) : form;
  if (!destinoAviso) return;

  let aviso = document.getElementById('aviso-ebook');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'aviso-ebook';
    aviso.style.cssText = 'background:rgba(255,255,255,.95);border:1.5px solid rgba(50,165,87,.45);border-radius:14px;padding:1rem 1.2rem;margin:0 auto 1.5rem;text-align:center;max-width:620px;';
    aviso.innerHTML = '<p style="font-weight:700;color:var(--b1);margin-bottom:.5rem;">Selecione um ebook antes de continuar.</p><p style="font-size:.88rem;color:rgba(21,43,85,.7);margin-bottom:0;">Clique em "Baixar grátis" no ebook desejado e depois preencha o formulário.</p>';
    destinoAviso.insertBefore(aviso, destinoAviso.firstChild);
  }

  if (ebooks) ebooks.scrollIntoView({ behavior: 'smooth' });
}

function baixarEbook(url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = url.split('/').pop() || 'ebook-robotica.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const btnSub = document.getElementById('btn-sub');
if (btnSub) {
  btnSub.addEventListener('click', function(e) {
    e.preventDefault();

    const nomeEl = document.getElementById('f-nome');
    const emailEl = document.querySelector('input[type="email"]');
    const instEl = document.querySelector('input[placeholder="Nome da escola"]');
    const perfilEl = document.querySelector('select');

    const nome = nomeEl ? nomeEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const instituicao = instEl ? instEl.value.trim() : '';
    const perfil = perfilEl ? perfilEl.value : '';
    let valido = true;

    if (!ebookSelecionado) {
      mostrarAvisoEbook();
      valido = false;
    }

    if (!validarNome(nome)) {
      mostrarErro(nomeEl, 'Digite nome e sobrenome, usando apenas letras.');
      if (valido && nomeEl) nomeEl.focus();
      valido = false;
    } else {
      limparErro(nomeEl);
    }

    if (!validarEmail(email)) {
      mostrarErro(emailEl, 'Digite um e-mail válido, como nome@email.com.');
      if (valido && emailEl) emailEl.focus();
      valido = false;
    } else {
      limparErro(emailEl);
    }

    if (!instituicao) {
      mostrarErro(instEl, 'Digite o nome da escola ou instituição.');
      if (valido && instEl) instEl.focus();
      valido = false;
    } else {
      limparErro(instEl);
    }

    if (!valido) return;

    this.textContent = 'Enviando...';
    this.disabled = true;

    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, instituicao, perfil })
    })
    .then(() => {
      this.textContent = '✓ Enviado! Baixando seus materiais...';
      this.style.background = 'rgba(50,165,87,.7)';

      setTimeout(() => {
        baixarEbook(ebookSelecionado);
      }, 800);
    })
    .catch(() => {
      this.textContent = 'Erro ao enviar. Tente novamente.';
      this.style.background = 'rgba(255,80,80,.5)';
      this.disabled = false;
    });
  });
}

const nomeInput = document.getElementById('f-nome');
const emailInput = document.querySelector('input[type="email"]');
const instituicaoInput = document.querySelector('input[placeholder="Nome da escola"]');
if (nomeInput) nomeInput.addEventListener('input', () => limparErro(nomeInput));
if (emailInput) emailInput.addEventListener('input', () => limparErro(emailInput));
if (instituicaoInput) instituicaoInput.addEventListener('input', () => limparErro(instituicaoInput));

// Nav scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Hamburger
const hamburger = document.getElementById('navHamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => { navLinks.classList.toggle('open'); });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) navLinks.classList.remove('open'); });
}

// Scroll spy
const navItems = document.querySelectorAll('.nav-item');
const sections = ['inicio','sobre','missao','produtos','recursos','ebooks','comunidade','mascotes','impacto','contato','radar']
  .map(id => document.getElementById(id)).filter(Boolean);
function updateNav() {
  const y = window.scrollY + 140;
  let cur = sections[0];
  sections.forEach(s => { if (s.offsetTop <= y) cur = s; });
  navItems.forEach(a => a.classList.toggle('active', a.dataset.section === cur.id));
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// Accordion
document.querySelectorAll('.s-card-acc-header').forEach(h => {
  h.addEventListener('click', () => {
    const c = h.parentElement;
    const open = c.classList.contains('open');
    document.querySelectorAll('.s-card-acc').forEach(x => x.classList.remove('open'));
    if (!open) c.classList.add('open');
  });
});
