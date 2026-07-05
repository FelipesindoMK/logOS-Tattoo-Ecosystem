// ===========================
//   CONECT TATTOO — sw-register.js
//   Registro do Service Worker (PWA)
// ===========================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .catch((err) => {
        console.warn('Falha ao registrar o Service Worker:', err);
      });
  });
}

// ── Botão de instalação (atalho na tela inicial / área de trabalho) ──
// Guarda o evento de instalação do navegador pra poder disparar quando
// o usuário clicar no botão "Instalar App" (adicionado no menu lateral).
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  const installBtn = document.getElementById('drawerInstallLink');
  if (installBtn) installBtn.style.display = 'flex';
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('drawerInstallLink');
  if (!installBtn) return;

  installBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });
});

window.addEventListener('appinstalled', () => {
  const installBtn = document.getElementById('drawerInstallLink');
  if (installBtn) installBtn.style.display = 'none';
});
