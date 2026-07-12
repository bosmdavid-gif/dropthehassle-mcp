#!/usr/bin/env node
'use strict';
/*
 * DropTheHassle MCP server  (npx dropthehassle-mcp)
 *
 * Lets an AI (Claude Desktop / Claude Code / any MCP client) act on the user's DropTheHassle account
 * so a vibecoder never has to leave their editor: put a site online on a free link, find a REAL free
 * domain name, see what they already have, and point a name at a site. It can NEVER spend money --
 * buying a domain stays a human step in the dashboard (the backend refuses it for this token).
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
const SKIP = new Set(['node_modules', '.git', '.DS_Store', '.next', '.vercel', '.cache', '__MACOSX']);
const SERVER = { name: 'dropthehassle', version: '0.1.0' };

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
    const req = lib.request(u, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let data; try { data = JSON.parse(text || '{}'); } catch (_) { data = text; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const _crc = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = _crc[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function walk(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
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
function multipart(filename, buffer) {
  const boundary = '----dthboundary' + Date.now().toString(16) + Math.floor(Math.random() * 1e9).toString(16);
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, buffer, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
}
function apiErr(r) { const d = r.data; return (d && (d.detail && (d.detail.message || d.detail) || d.message)) || d || ('HTTP ' + r.status); }

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
  { name: 'deploy_site', description: 'Put a built static site online on a free link. Point it at the folder that contains index.html. Without site_id it creates a new free site; with site_id it updates that existing site. Returns the live URL. Free only; never buys a name.',
    inputSchema: { type: 'object', required: ['folder'], properties: { folder: { type: 'string', description: 'Absolute path to the built site folder (the one with index.html).' }, site_id: { type: 'number', description: 'Optional: an existing site to update instead of creating a new one.' } } },
    run: async (a) => {
      const dir = path.resolve(a.folder || '.');
      if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`No index.html in ${dir}. Point me at the built folder that has index.html.`);
      const zip = buildZip(walk(dir, '', []));
      const mp = multipart('site.zip', zip);
      const q = a.site_id ? `?site_id=${encodeURIComponent(a.site_id)}` : '';
      const r = await request('POST', `${API}/ai/deploy${q}`, { headers: { 'Content-Type': mp.contentType }, body: mp.body });
      if (r.status >= 300) throw new Error(apiErr(r));
      return `Live at ${r.data.live_url} (site_id ${r.data.site_id}). Redeploy anytime with the same site_id.`;
    } },
  { name: 'point_domain', description: "Point one of the account's own domains at one of its sites (redirect the name to that site's content). Both must be on this account. No money.",
    inputSchema: { type: 'object', required: ['domain', 'to_site_id'], properties: { domain: { type: 'string', description: 'A domain already on this account.' }, to_site_id: { type: 'number', description: 'The site to point it at (from list_sites).' } } },
    run: async (a) => { const r = await request('POST', `${API}/ai/point`, { json: { domain: a.domain, to_site_id: a.to_site_id } }); if (r.status >= 300) throw new Error(apiErr(r)); return `${a.domain} now points at site ${a.to_site_id}.`; } },
];

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
    reply(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
  } else if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === (params && params.name));
    if (!tool) return replyErr(id, -32602, `Unknown tool: ${params && params.name}`);
    if (!TOKEN) return reply(id, { content: [{ type: 'text', text: 'No DropTheHassle token set. Add DTH_TOKEN (from dropthehassle.com -> menu -> Connect your AI) to this server\'s env.' }], isError: true });
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
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch (_) { continue; }
    handle(msg).catch((e) => { if (msg && msg.id !== undefined) replyErr(msg.id, -32603, String(e && e.message || e)); });
  }
});
process.stdin.on('end', () => process.exit(0));
