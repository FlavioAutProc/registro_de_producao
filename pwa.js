"use strict";

let deferredPrompt = null;

// 1. Registro do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => console.log('[PWA] Service Worker registrado com sucesso:', reg.scope))
      .catch(err => console.error('[PWA] Falha ao registrar Service Worker:', err));
  });
}

// 2. Intercepta o evento de instalação do PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Se a pessoa não fechou o banner anteriormente nesta sessão
  if (!sessionStorage.getItem('pwa_banner_dismissed')) {
    exibirBannerInstalacao();
  }

  // Ativa o item no menu de configurações
  atualizarItemConfiguracoes(true);
});

// 3. Monitora quando o app é instalado
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  removerBannerInstalacao();
  atualizarItemConfiguracoes(false);
  console.log('[PWA] Aplicativo instalado com sucesso!');
});

// --- FUNÇÕES DE UI ---

function exibirBannerInstalacao() {
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 16px;
    right: 16px;
    max-width: 480px;
    margin: 0 auto;
    background: var(--panel, #FFFFFF);
    border: 1px solid var(--accent, #E67E22);
    border-radius: var(--radius-md, 8px);
    padding: 14px 16px;
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,.15));
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    animation: fadeUp 0.3s ease;
  `;

  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; min-width:0;">
      <div style="width:36px; height:36px; background:var(--accent, #E67E22); border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </div>
      <div style="min-width:0;">
        <div style="font-weight:700; font-size:13.5px; color:var(--ink, #212529); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Instalar Padaria OS</div>
        <div style="font-size:11.5px; color:var(--ink-soft, #495057);">Acesse offline na tela inicial</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
      <button id="pwa-btn-install" class="btn btn-primary btn-sm" style="background:var(--accent, #E67E22); border-color:var(--accent-dark, #D35400);">Instalar</button>
      <button id="pwa-btn-close" style="background:none; border:none; font-size:18px; color:var(--ink-faint, #ADB5BD); cursor:pointer; padding:4px 8px;">✕</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('pwa-btn-install').addEventListener('click', dispararInstalacao);
  document.getElementById('pwa-btn-close').addEventListener('click', () => {
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
    removerBannerInstalacao();
  });
}

function removerBannerInstalacao() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
}

async function dispararInstalacao() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('[PWA] Usuário aceitou a instalação');
  }
  deferredPrompt = null;
  removerBannerInstalacao();
  atualizarItemConfiguracoes(false);
}

// Injeta o item no menu de configurações
function atualizarItemConfiguracoes(disponivel) {
  const container = document.querySelector('#view-config .grid-2');
  let panelPWA = document.getElementById('pwa-config-panel');

  if (!disponivel) {
    if (panelPWA) panelPWA.style.display = 'none';
    return;
  }

  if (!panelPWA && container) {
    panelPWA = document.createElement('div');
    panelPWA.id = 'pwa-config-panel';
    panelPWA.className = 'panel';
    panelPWA.innerHTML = `
      <div class="panel-title">Aplicativo Instalável</div>
      <div class="panel-sub">Instale o app no celular para ter acesso rápido direto da tela inicial e uso offline.</div>
      <button id="pwa-btn-config-install" class="btn btn-accent btn-block">📲 Instalar Padaria OS</button>
    `;
    container.appendChild(panelPWA);

    document.getElementById('pwa-btn-config-install').addEventListener('click', dispararInstalacao);
  } else if (panelPWA) {
    panelPWA.style.display = 'block';
  }
}