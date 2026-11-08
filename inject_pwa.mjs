import fs from 'fs';

if (fs.existsSync('public')) {
  fs.cpSync('public', 'dist', { recursive: true });
}

const pwaMeta = `
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Sistema PAT" />
  <meta name="theme-color" content="#0f172a" />
`;

['dist/index.html', 'dist/404.html'].forEach(f => {
  if (fs.existsSync(f)) {
    let html = fs.readFileSync(f, 'utf8');
    if (!html.includes('manifest.json')) {
      html = html.replace('</head>', `${pwaMeta}\n</head>`);
      fs.writeFileSync(f, html);
      console.log(`[PWA] Injected manifest & meta into ${f}`);
    }
  }
});
