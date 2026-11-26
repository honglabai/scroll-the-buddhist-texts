import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(distDir) || !fs.existsSync(indexPath)) {
  throw new Error('dist/index.html not found. Run expo export --platform web first.');
}

// 1. Copy public/ PWA assets to dist/
if (fs.existsSync(publicDir)) {
  for (const file of fs.readdirSync(publicDir)) {
    fs.copyFileSync(path.join(publicDir, file), path.join(distDir, file));
  }
}

// 2. Enhance all exported dist/*.html files for standalone full-screen mobile & desktop PWA launch
const pwaStyleAndSw = `
    <style id="pwa-fullscreen">
      html, body {
        width: 100%;
        height: 100dvh;
        min-height: -webkit-fill-available;
        background-color: #151F1B;
        overscroll-behavior-y: none;
        overflow: hidden;
        margin: 0;
        padding: 0;
      }
      #root {
        width: 100%;
        height: 100dvh;
        min-height: -webkit-fill-available;
      }
    </style>
`;

const pwaHeadTags = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-touch-fullscreen" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Dharma Scroll" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#151F1B" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    ${pwaStyleAndSw}
`;

const swRegisterScript = `
  <script>
    window.__dharmaDeferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      window.__dharmaDeferredPrompt = e;
      window.dispatchEvent(new Event('dharma-install-ready'));
    });
    window.addEventListener('appinstalled', function () {
      window.__dharmaDeferredPrompt = null;
      window.dispatchEvent(new Event('dharma-app-installed'));
    });
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
      });
    }
  </script>
`;

for (const entry of fs.readdirSync(distDir)) {
  if (!entry.endsWith('.html')) continue;
  const htmlFile = path.join(distDir, entry);
  let html = fs.readFileSync(htmlFile, 'utf-8');

  html = html.replace('<html lang="en">', '<html lang="ko">');
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />'
  );

  if (!html.includes('id="pwa-fullscreen"')) {
    const injectBlock = html.includes('rel="manifest"') ? pwaStyleAndSw : pwaHeadTags;
    html = html.replace('</head>', `${injectBlock}\n  </head>`);
  }

  if (!html.includes('navigator.serviceWorker.register')) {
    html = html.replace('</body>', `${swRegisterScript}\n  </body>`);
  }

  fs.writeFileSync(htmlFile, html, 'utf-8');
}

console.log('Prepared dist/ with full-screen PWA manifest, icons, service worker, and mobile meta tags.');
