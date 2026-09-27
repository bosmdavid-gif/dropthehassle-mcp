#!/usr/bin/env node
'use strict';
/*
 * DropTheHassle MCP server  (npx dropthehassle-mcp)
 *
 * Lets an AI (Claude Desktop / Claude Code / any MCP client) act on the user's DropTheHassle account
 * so a vibecoder never has to leave their editor: put a static site online on a free link, find a REAL
 * free domain name, see what they already have, move a name already on the account onto a site, and
 * hand the human a payment link. DropTheHassle does domains, static hosting, DNS and email
 * forwarding. It can NEVER spend money. The human opens the link and pays. The agent must not.
 *
 * Auth: the user pastes their account token (from dropthehassle.com -> menu -> Connect your AI) into
 * the MCP config as env DTH_TOKEN. Override the endpoint with DTH_API. Zero dependencies (Node stdlib
 * only): the MCP protocol is plain newline-delimited JSON-RPC 2.0 over stdio, implemented directly.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const API = (process.env.DTH_API || 'https://dropthehassle.com/api/v1').replace(/\/+$/, '');
const TOKEN = process.env.DTH_TOKEN || '';
// .dropthehassle.json is the CLI's folder link and holds a deploy token: never ship it in the zip.
const SKIP = new Set(['node_modules', '.git', '.gitignore', '.DS_Store', '.next', '.vercel', '.cache', '__MACOSX', '.dropthehassle.json']);
const SERVER = { name: 'dropthehassle', version: '0.4.2' };

function skipEntry(name) {
  if (SKIP.has(name)) return true;
  if (name.startsWith('.') && name !== '.well-known') return true;
  return false;
}

// ---------------------------------------------------------------- HTTP + zip (stdlib, like the CLI)
function request(method, url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const headers = Object.assign({}, opts.headers);
    if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
    let payload = opts.body;
    if (opts.json !== undefined) { payload = Buffer.from(JSON.stringify(opts.json)); headers['Content-Type'] = 'application/json'; }
    if (payload) headers['Content-Length'] = payload.length;
    let settled = false;
    let timer = null;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn(value);
    };
    const req = lib.request(u, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let data; try { data = JSON.parse(text || '{}'); } catch (_) { data = text; }
        finish(resolve, { status: res.statusCode, data });
      });
    });
    if (opts.timeoutMs) timer = setTimeout(() => req.destroy(new Error('request timed out')), opts.timeoutMs);
    req.on('error', (err) => finish(reject, err));
    if (payload) req.write(payload);
    req.end();
  });
}

const _crc = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = _crc[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function walk(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipEntry(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) walk(abs, rel, out);
    else if (entry.isFile()) out.push({ name: rel, data: fs.readFileSync(abs) });
  }
  return out;
}
function buildZip(files) {
  const u16 = (n) => Buffer.from([n & 0xFF, (n >> 8) & 0xFF]);
  const u32 = (n) => { n = n >>> 0; return Buffer.from([n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]); };
  const local = [], central = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name.replace(/\\/g, '/'));
    const crc = crc32(f.data), sz = f.data.length;
    const lfh = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(sz), u32(sz), u16(name.length), u16(0)]);
    local.push(lfh, name, f.data);
    central.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(sz), u32(sz), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)]), name);
    offset += lfh.length + name.length + sz;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)]);
  return Buffer.concat([...local, cd, eocd]);
}
function multipart(filename, buffer, fields) {
  const boundary = '----dthboundary' + Date.now().toString(16) + Math.floor(Math.random() * 1e9).toString(16);
  const chunks = [];
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
  }
  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`));
  chunks.push(buffer);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}
function apiErr(r) {
  const d = r.data && r.data.detail;
  if (d && typeof d === 'object') {
    const lines = [];
    if (d.message) lines.push(d.message);
    if (d.next_step) lines.push('Next step: ' + d.next_step);
    if (d.agent_prompt) lines.push('Do this: ' + d.agent_prompt);
    if (d.code) lines.push('code: ' + d.code);
    if (Array.isArray(d.candidates) && d.candidates.length) lines.push('Folders: ' + d.candidates.join(', '));
    if (lines.length) return lines.join('\n');
  }
  const raw = r.data;
  return (raw && (raw.detail && (raw.detail.message || raw.detail) || raw.message)) || raw || ('HTTP ' + r.status);
}
function fixedNote(data) {
  if (!data) return '';
  if (data.fixed) return ' ' + data.fixed;
  if (data.used_folder) return ' We used the ' + data.used_folder + '/ folder, because that is where index.html is.';
  if (data.used_file) return ' We used ' + data.used_file + ' as index.html.';
  return '';
}

// ---------------------------------------------------------------- the tools
const TOOLS = [
  { name: 'whoami', description: 'Confirm the DropTheHassle account this AI is connected to. Call first to verify the connection works.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => { const r = await request('GET', `${API}/ai/whoami`); if (r.status >= 300) throw new Error(apiErr(r)); return `Connected to DropTheHassle as ${r.data.email}.`; } },
  { name: 'list_sites', description: "List the account's sites with their live URL, status and the domains pointing at each. Use to find a site_id to deploy to or point a name at.",
    inputSchema: { type: 'object', properties: {} },
    run: async () => { const r = await request('GET', `${API}/ai/sites`); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data.sites, null, 2); } },
  { name: 'search_domain', description: 'Check whether a domain name is available to register and what it would cost (EUR). Read-only: use it to propose a REAL free name. Buying is a human step in the dashboard; this never spends money.',
    inputSchema: { type: 'object', required: ['name'], properties: { name: { type: 'string', description: 'The domain to check, e.g. "myidea.com".' } } },
    run: async (a) => { const r = await request('GET', `${API}/ai/domains/search?q=${encodeURIComponent(a.name || '')}`); if (r.status >= 300) throw new Error(apiErr(r)); const d = r.data; return `${d.name}: ${d.available ? 'AVAILABLE' : 'taken'}${d.available ? ` (~EUR ${d.price_eur}/yr)` : ''}. ${d.note}`; } },
  { name: 'deploy_site', description: 'Put a static site online on a free link. Point it at the project folder or the built folder. The server chooses index.html, dist/, build/, out/, _site/ or public/. Do not pick the folder yourself. With a DTH_TOKEN: pass site_id to update that site. Omitting site_id fills the oldest reserved address on the account (from Get an AI code) instead of creating a second site. Without a token the site goes live anonymously and you MUST give the human the claim_url. Free only; never buys a name. /ai tools other than this one stay signed in, so an agent can never spend money.',
    inputSchema: { type: 'object', required: ['folder'], properties: { folder: { type: 'string', description: 'Absolute path to the project folder or the built site. The server chooses the folder that holds index.html.' }, site_id: { type: 'number', description: 'Optional: an existing site to update. Omit it to fill the oldest reserved site on this account.' }, slug: { type: 'string', description: 'Optional, signed-in only: the address label for a NEW site, e.g. "myproject". Errors when taken, so propose another.' } } },
    run: async (a) => {
      const dir = path.resolve(a.folder || '.');
      const zip = buildZip(walk(dir, '', []));
      if (!TOKEN) {
        const mp = multipart('site.zip', zip, { client: 'mcp' });
        const r = await request('POST', `${API}/sites`, { headers: { 'Content-Type': mp.contentType }, body: mp.body });
        if (r.status >= 300) throw new Error(apiErr(r));
        const claim = r.data.claim_url ? ` Give the human this claim link (it expires in 7 days): ${r.data.claim_url}` : '';
        return `Live at ${r.data.live_url || r.data.staging_url} (site_id ${r.data.site_id}).${fixedNote(r.data)}${claim} This site is not on an account until they claim it.`;
      }
      const mp = multipart('site.zip', zip);
      const params = [];
      if (a.site_id) params.push(`site_id=${encodeURIComponent(a.site_id)}`);
      else if (a.slug) params.push(`slug=${encodeURIComponent(a.slug)}`);
      const q = params.length ? '?' + params.join('&') : '';
      const r = await request('POST', `${API}/ai/deploy${q}`, { headers: { 'Content-Type': mp.contentType }, body: mp.body });
      if (r.status >= 300) throw new Error(apiErr(r));
      return `Live at ${r.data.live_url} (site_id ${r.data.site_id}).${fixedNote(r.data)} Redeploy anytime with the same site_id. Running an API or full-stack app too? Link it with set_backend.`;
    } },
  { name: 'point_domain', description: 'Move a domain already on your account onto one of your sites. Does not buy a name and does not edit DNS at another registrar. No money.',
    inputSchema: { type: 'object', required: ['domain', 'to_site_id'], properties: { domain: { type: 'string', description: 'A domain already on this account.' }, to_site_id: { type: 'number', description: 'The site to point it at (from list_sites).' } } },
    run: async (a) => { const r = await request('POST', `${API}/ai/point`, { json: { domain: a.domain, to_site_id: a.to_site_id } }); if (r.status >= 300) throw new Error(apiErr(r)); return `${a.domain} now points at site ${a.to_site_id}.`; } },
  { name: 'choose_link', description: "Rename a site's free link to <name>.dropthehassle.app. Changing a public URL is the human owner's decision: propose the name first, and only call this with confirm=true after they explicitly said yes. Safe: the old link keeps redirecting to the new name. No money.",
    inputSchema: { type: 'object', required: ['site_id', 'name', 'confirm'], properties: { site_id: { type: 'number', description: 'The site to rename (from list_sites).' }, name: { type: 'string', description: 'The label only, e.g. "myproject" for myproject.dropthehassle.app.' }, confirm: { type: 'boolean', description: 'true ONLY after the human owner explicitly approved this exact name.' } } },
    run: async (a) => { const r = await request('POST', `${API}/ai/subdomain`, { json: { site_id: a.site_id, name: a.name, confirm: !!a.confirm } }); if (r.status >= 300) throw new Error(apiErr(r)); return `Live at ${r.data.staging_url} (the previous link redirects there).`; } },
  { name: 'set_backend', description: "Link an HTTPS backend (Railway, Render, Fly, anywhere) behind a DropTheHassle name. With uploaded files the path rules (default /api/*) reverse-proxy to the backend and the rest stays static; without uploaded files the WHOLE site serves from the backend. WITHOUT site_id it creates a fresh FREE site first: a backend-only project goes live on its own link in one call. Perfect for a deploy script: call this with the new URL after every backend deploy. Pass url=\"\" (with site_id) to unlink. No money.",
    inputSchema: { type: 'object', required: ['url'], properties: { site_id: { type: 'number', description: 'Optional: an existing site to link (from list_sites). Omit to create a new free site served fully from the backend.' }, url: { type: 'string', description: 'The HTTPS origin of the backend, e.g. "https://myapp.up.railway.app". Empty string (with site_id) unlinks.' }, paths: { type: 'array', items: { type: 'string' }, description: 'Optional path rules for split mode, e.g. ["/api/*", "/webhooks/*"]. Default ["/api/*"].' }, slug: { type: 'string', description: 'Optional address label for a NEW site, e.g. "myapp" -> myapp.dropthehassle.app. Errors when taken.' } } },
    run: async (a) => {
      const payload = { url: a.url || '', paths: a.paths || null };
      if (a.site_id) payload.site_id = a.site_id;
      if (!a.site_id && a.slug) payload.slug = a.slug;
      const r = await request('POST', `${API}/ai/backend`, { json: payload });
      if (r.status >= 300) throw new Error(apiErr(r));
      const b = r.data.backend || {};
      if (!b.url) return `Backend unlinked: site ${a.site_id} serves its uploaded files again.`;
      const mode = b.mode === 'full' ? 'the WHOLE site serves from the backend' : `paths ${JSON.stringify(b.paths)} proxy to the backend, the rest stays static`;
      const health = b.status ? ` First check: ${b.status}${b.latency_ms != null ? ` (${b.latency_ms}ms)` : ''}.` : '';
      const where = r.data.created ? `NEW free site ${r.data.live_url} (site_id ${r.data.site_id})` : `site ${r.data.site_id || a.site_id}`;
      return `Linked ${b.url} to ${where}: ${mode}.${health}`;
    } },
  { name: 'get_checkout_link', description: 'Get a payment link for a domain on one of your sites. The HUMAN opens and pays it; you never can. After payment the domain goes live on that site automatically. Only for sites on the user\'s account. For an anonymous site, give the human the claim link first.',
    inputSchema: { type: 'object', required: ['site_id', 'name'], properties: {
      site_id: { type: 'number', description: 'The site the domain should attach to (from list_sites).' },
      name: { type: 'string', description: 'The domain to register, e.g. "myidea.com".' },
      extras: { type: 'array', items: { type: 'string' }, description: 'Optional extra domain names on the same payment.' },
    } },
    run: async (a) => {
      const body = { site_id: a.site_id, name: a.name || '' };
      if (Array.isArray(a.extras) && a.extras.length) body.extras = a.extras;
      const r = await request('POST', `${API}/ai/checkout-link`, { json: body });
      if (r.status >= 300) throw new Error(apiErr(r));
      const d = r.data || {};
      const major = (Number(d.amount) / 100).toFixed(2);
      const cur = String(d.currency || 'eur').toUpperCase();
      const until = d.expires_at ? ` Valid until ${d.expires_at} (UTC).` : '';
      return `Payment link for ${d.domain}: ${d.checkout_url} (${major} ${cur}).${until} Share this link with the human. Do NOT open, fill in, or pay it yourself.`;
    } },
  { name: 'site_of_the_day_badge', description: 'Get the one line that embeds a Site of the day award, plus instructions for pasting it. The ribbon names the award and the period and links to the verification page. Read-only. No money. Pass site_id for a site on this account, or host for any confirmed winner. Omit both to list awards this account has earned.',
    inputSchema: { type: 'object', properties: { site_id: { type: 'number', description: 'Optional. A site on this account (from list_sites).' }, host: { type: 'string', description: 'Optional. The public host that was featured.' } } },
    run: async (a) => {
      const q = [];
      if (a.site_id) q.push('site_id=' + encodeURIComponent(a.site_id));
      if (a.host) q.push('host=' + encodeURIComponent(a.host));
      const r = await request('GET', `${API}/ai/showcase/badge` + (q.length ? '?' + q.join('&') : ''));
      if (r.status >= 300) throw new Error(apiErr(r));
      return formatBadgeReply(r.data);
    } },
  { name: 'award_readiness', description: 'Check whether a site on this account is ready to be considered for an award. Read-only. No money. Returns favicon, share image, title and description, mobile viewport, page weight, custom domain, https, and a real page (not the DropTheHassle placeholder), each with a fix hint.',
    inputSchema: { type: 'object', required: ['host'], properties: { host: { type: 'string', description: 'The public host of a site on this account, e.g. "example.com".' } } },
    run: async (a) => {
      const host = String(a.host || '').trim();
      const r = await request('GET', `${API}/ai/sites/${encodeURIComponent(host)}/award-readiness`);
      if (r.status >= 300) throw new Error(apiErr(r));
      return formatReadiness(r.data);
    } },
  { name: 'showcase_candidates', description: 'Operator only. 404 unless this token is the ops owner. List live uploads that have not been reviewed yet, with a screenshot URL and basic signals (page weight, title, meta, mobile viewport, https).',
    inputSchema: { type: 'object', properties: {} },
    run: async () => { const r = await request('GET', `${API}/account/ops/showcase/candidates`); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data, null, 2); } },
  { name: 'showcase_review', description: 'Operator only. 404 unless this token is the ops owner. Store a quality review. Scores are integers 1 to 10 for design, craft, content, performance and originality. approved true plus an average of 8 or higher is what confirm requires. The latest review wins.',
    inputSchema: { type: 'object', required: ['design', 'craft', 'content', 'performance', 'originality'], properties: {
      site_id: { type: 'number', description: 'A site id from showcase_candidates.' },
      host: { type: 'string', description: 'Public host, if you do not pass site_id.' },
      design: { type: 'number' }, craft: { type: 'number' }, content: { type: 'number' },
      performance: { type: 'number' }, originality: { type: 'number' },
      notes: { type: 'string' }, reviewer: { type: 'string' },
      approved: { type: 'boolean', description: 'True only when you would publish this site.' }
    } },
    run: async (a) => { const r = await request('POST', `${API}/account/ops/showcase/reviews`, { json: a }); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data, null, 2); } },
  { name: 'showcase_propose', description: 'Operator only. 404 unless this token is the ops owner. Stage a pick. Nothing is public and no email is sent. Launch default is month. Pass period day, week, or year when you want another type.',
    inputSchema: { type: 'object', properties: {
      site_id: { type: 'number' }, host: { type: 'string' },
      date: { type: 'string', description: 'YYYY-MM-DD. Omit for today in Europe/Amsterdam.' },
      period: { type: 'string', description: 'month (default), day, week, or year.' },
      why: { type: 'string' }
    } },
    run: async (a) => { const body = Object.assign({ period: 'month' }, a); if (!body.period) body.period = 'month'; const r = await request('POST', `${API}/account/ops/showcase/propose`, { json: body }); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data, null, 2); } },
  { name: 'showcase_confirm', description: 'Operator only. 404 unless this token is the ops owner. Confirm a pick. Requires an approved review averaging 8 or higher. Emails the owner once. Launch default is month. Day, week and year are real types too. Every confirmed period with a winner is public. Empty periods stay hidden.',
    inputSchema: { type: 'object', properties: {
      site_id: { type: 'number' }, host: { type: 'string' },
      date: { type: 'string', description: 'YYYY-MM-DD. Omit for today in Europe/Amsterdam.' },
      period: { type: 'string', description: 'month (default), day, week, or year.' },
      why: { type: 'string' }
    } },
    run: async (a) => { const body = Object.assign({ period: 'month' }, a); if (!body.period) body.period = 'month'; const r = await request('POST', `${API}/account/ops/showcase/confirm`, { json: body }); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data, null, 2); } },
  { name: 'showcase_resolve_report', description: 'Operator only. 404 unless this token is the ops owner. Mark open abuse reports for a host as resolved-ok. That is the only resolution that makes the site eligible again. A report does not exclude a site forever.',
    inputSchema: { type: 'object', required: ['host'], properties: {
      host: { type: 'string', description: 'The public host the report was filed against.' },
      resolution: { type: 'string', description: 'resolved-ok. Any other value is refused.' }
    } },
    run: async (a) => { const r = await request('POST', `${API}/account/ops/reports/resolve`, { json: { host: a.host, resolution: a.resolution || 'resolved-ok' } }); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data, null, 2); } },
  { name: 'account_set_internal', description: 'Operator only. 404 unless this token is the ops owner. Set or clear the account-level internal flag. Internal accounts are excluded from awards. Pass account_id or email.',
    inputSchema: { type: 'object', required: ['internal'], properties: {
      account_id: { type: 'number' },
      email: { type: 'string' },
      internal: { type: 'boolean', description: 'true excludes the account. false makes it eligible again, if the other rules pass.' }
    } },
    run: async (a) => { const r = await request('POST', `${API}/account/ops/accounts/internal`, { json: { account_id: a.account_id, email: a.email || '', internal: !!a.internal } }); if (r.status >= 300) throw new Error(apiErr(r)); return JSON.stringify(r.data, null, 2); } },
];

function formatBadgeReply(data) {
  data = data || {};
  if (Array.isArray(data.badges)) {
    if (!data.badges.length) return 'This account has no Site of the day awards. There is no line to paste.';
    return data.badges.map((b) => formatOneBadge(b, data.instructions)).join('\n\n');
  }
  if (data.featured === false || !(data.embed || data.html_light)) {
    const note = data.note || data.instructions || 'This site has not been Site of the day.';
    return /no line to paste/i.test(note) ? note : (note + ' There is no line to paste.');
  }
  return formatOneBadge(data, data.instructions);
}

function formatReadiness(data) {
  data = data || {};
  const checks = Array.isArray(data.checks) ? data.checks : [];
  const head = (data.ready ? 'Ready for an award.' : 'Not ready for an award yet.')
    + ' ' + (data.ready_count || 0) + ' of ' + checks.length + ' checks pass for ' + (data.host || 'this site') + '.';
  const lines = checks.map((c) => (c.ok ? 'OK' : 'Fix') + '  ' + (c.label || c.id) + '. ' + (c.hint || ''));
  return [head].concat(lines).join('\n');
}

function formatOneBadge(b, instructions) {
  const line = String(b.embed || b.html_light || '').replace(/\s*\n\s*/g, '');
  const claim = b.claim ? ('Claim on the ribbon: ' + b.claim + '\n') : '';
  const verify = b.winner_url ? ('\n\nVerification: ' + b.winner_url) : '';
  return [instructions || '', '', claim + line + verify].join('\n').trim();
}

// Operator tools are not part of the public list. A customer token must not see them.
// DTH_OPS=1 (DTH_OPERATOR=1 is the same switch) forces them on. Otherwise startup whoami
// decides: the dashboard treats one account as the ops owner, and a payload flag does too.
const OPERATOR_TOOLS = new Set([
  'showcase_candidates', 'showcase_review', 'showcase_propose',
  'showcase_confirm', 'showcase_resolve_report', 'account_set_internal',
]);
const OPS_EMAILS = new Set(['bosmdavid@gmail.com']);

function envOn(name) {
  return /^(1|true|yes|on)$/i.test(String(process.env[name] || '').trim());
}
function flagOn(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}
function whoamiIsOps(data, depth) {
  if (!data || typeof data !== 'object' || (depth || 0) > 3) return false;
  for (const key of ['ops', 'is_ops', 'operator', 'is_operator', 'ops_owner', 'is_ops_owner']) {
    if (flagOn(data[key])) return true;
  }
  const role = String(data.role || data.account_role || data.kind || '').toLowerCase();
  if (role === 'ops' || role === 'operator' || role === 'ops_owner') return true;
  const email = String(data.email || '').trim().toLowerCase();
  if (email && OPS_EMAILS.has(email)) return true;
  if (data.account && data.account !== data && whoamiIsOps(data.account, (depth || 0) + 1)) return true;
  return false;
}

let isOps = envOn('DTH_OPS') || envOn('DTH_OPERATOR');
function visibleTools() {
  return isOps ? TOOLS : TOOLS.filter((t) => !OPERATOR_TOOLS.has(t.name));
}

// Fail closed: if whoami cannot be read, a regular user still must not see operator tools.
const opsCheck = (async () => {
  if (isOps || !TOKEN) return isOps;
  try {
    const r = await request('GET', `${API}/ai/whoami`, { timeoutMs: 4000 });
    if (r.status < 300 && whoamiIsOps(r.data)) isOps = true;
  } catch (_) {}
  return isOps;
})();

// ---------------------------------------------------------------- MCP (JSON-RPC 2.0 over stdio)
function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function reply(id, result) { send({ jsonrpc: '2.0', id, result }); }
function replyErr(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    reply(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: SERVER });
  } else if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    // notifications carry no id and need no reply
  } else if (method === 'ping') {
    reply(id, {});
  } else if (method === 'tools/list') {
    await opsCheck;
    reply(id, { tools: visibleTools().map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
  } else if (method === 'tools/call') {
    await opsCheck;
    const tool = visibleTools().find((t) => t.name === (params && params.name));
    if (!tool) return replyErr(id, -32602, `Unknown tool: ${params && params.name}`);
    if (!TOKEN && tool.name !== 'deploy_site') return reply(id, { content: [{ type: 'text', text: 'No DropTheHassle token set. Add DTH_TOKEN (from dropthehassle.com -> menu -> Connect your AI) to this server\'s env. deploy_site works without a token and returns a claim link for the human.' }], isError: true });
    try {
      const text = await tool.run((params && params.arguments) || {});
      reply(id, { content: [{ type: 'text', text }] });
    } catch (e) {
      reply(id, { content: [{ type: 'text', text: 'Error: ' + (e && e.message || e) }], isError: true });
    }
  } else if (id !== undefined) {
    replyErr(id, -32601, `Method not found: ${method}`);
  }
}

let buf = '';
let inflight = 0;
let stdinClosed = false;
function maybeExit() { if (stdinClosed && inflight === 0) process.exit(0); }
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch (_) { continue; }
    inflight++;
    handle(msg).catch((e) => { if (msg && msg.id !== undefined) replyErr(msg.id, -32603, String(e && e.message || e)); })
      .finally(() => { inflight--; maybeExit(); });
  }
});
// Finish an in-flight tool call before exiting. A client that writes one request and closes
// stdin would otherwise lose the answer.
process.stdin.on('end', () => { stdinClosed = true; maybeExit(); });
