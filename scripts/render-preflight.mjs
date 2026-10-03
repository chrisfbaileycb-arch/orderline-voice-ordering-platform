const required=['VITE_CONVEX_URL','VITE_HERCULES_OIDC_AUTHORITY','VITE_HERCULES_OIDC_CLIENT_ID'];
const missing=required.filter(key=>!process.env[key] || /your-|example|localhost|happy-otter-123/.test(process.env[key]));
if (missing.length) { console.error('Set the real backend and login configuration in Render: '+missing.join(', ')); process.exit(1); }
for (const key of ['VITE_CONVEX_URL','VITE_HERCULES_OIDC_AUTHORITY']) {
  if (new URL(process.env[key]).protocol!=='https:') throw new Error(key+' must use HTTPS');
}
