# DropTheHassle MCP server

How do I get my site live with my AI? Add this server and say "publish this site": your AI puts your site live on a free HTTPS link with no account. Email is optional: after go-live, it asks once if you want a .com (€19/$19, no DNS) and an optional mailbox. No tool spends money.

```sh
# Claude Code
claude mcp add dropthehassle -- npx -y dropthehassle-mcp@latest

# Grok Build (Grok CLI)
grok mcp add dropthehassle -- npx -y dropthehassle-mcp@latest

# Cursor: add to .cursor/mcp.json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp@latest"]
    }
  }
}
```

Agent skills (publish, buy a domain, connect your own domain, domain email) for Claude Code, Cursor, Codex, Gemini CLI and more: `npx skills add bosmdavid-gif/dropthehassle-skill`.

Or skip the install and use the hosted connector: `https://dropthehassle.com/mcp` (no token and no email for a first deploy). Your AI publishes the site first and gives you the live link and a claim link; after go-live, it asks once if you want a .com (payment link, no DNS) and an optional mailbox that sends and receives. From a terminal, the same thing is `npx -y dropthehassle@latest deploy .` (email optional; add `--email you@example.com` after go-live to get the claim link mailed).

What your AI can do:

1. Publish the site on a free HTTPS link (`deploy_site`), with no account, and give you a claim link.
2. Check whether a domain name is free and what it costs (`search_domain`), straight from the domain registry.
3. Hand you a payment link for your own .com: €19 / $19 a year, including VAT in the EU, the same every year. You pay on Stripe's page, and the site then goes live on the domain with HTTPS and no DNS setup.
4. Hand you a payment link for a real mailbox on that domain: it sends and receives, read in the dashboard webmail or any mail app over IMAP/SMTP. €5 / $5 a month, including VAT in the EU.

It cannot spend money. You open the link and pay. A DropTheHassle payment link is always on `checkout.stripe.com`. In the ChatGPT and Claude directory apps, buying happens on dropthehassle.com.

Got a server part too? Keep it on AWS, Google Cloud, DigitalOcean or your own server, and your AI links it to your site in one step.

Package [`dropthehassle-mcp`](https://www.npmjs.com/package/dropthehassle-mcp) **0.5.2** (MIT, Node.js 18+). Registry name: `io.github.bosmdavid-gif/dropthehassle`.

Prices are written as **€19 / $19**. Contact: [hello@dropthehassle.com](mailto:hello@dropthehassle.com).

## Try it without an account

`deploy_site` works without a token. The site goes live on a free link with HTTPS and the reply contains a claim link for the human. On the hosted endpoint, `search_domain` and `whoami` also work without a token.

Claude Code:

```bash
claude mcp add --transport http dropthehassle https://dropthehassle.com/mcp
```

Cursor, Windsurf or any client that takes a remote `mcp.json` entry:

```json
{
  "mcpServers": {
    "dropthehassle": {
      "url": "https://dropthehassle.com/mcp"
    }
  }
}
```

Add a token (below) when you want the AI to list your sites, update them or attach a domain that is already on your account.

## One-minute quickstart

1. On [dropthehassle.com](https://dropthehassle.com), open the menu (top right) and choose **Connect your AI**. Copy the token. It starts with `dth_`.
2. Paste it into the config for your editor below. Do not commit the token.

Optional: set `DTH_API` only if you need an API base other than `https://dropthehassle.com/api/v1`.

### Claude Code

User scope, so it is available in every project:

```bash
claude mcp add --scope user dropthehassle --env DTH_TOKEN="dth_your-token-here" -- npx -y dropthehassle-mcp
```

Or a project `.mcp.json` (Claude Code expands `${DTH_TOKEN}`):

```json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp"],
      "env": {
        "DTH_TOKEN": "${DTH_TOKEN}"
      }
    }
  }
}
```

Claude Code asks you to approve a project `.mcp.json` the first time you run `claude` in that folder.

### Cursor

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=dropthehassle&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImRyb3B0aGVoYXNzbGUtbWNwIl0sImVudiI6eyJEVEhfVE9LRU4iOiIke2VudjpEVEhfVE9LRU59In19)

The button installs a stdio server named `dropthehassle` that runs `npx -y dropthehassle-mcp` and reads `DTH_TOKEN` from your environment.

To add it by hand, put this in `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "dropthehassle": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp"],
      "env": {
        "DTH_TOKEN": "${env:DTH_TOKEN}"
      }
    }
  }
}
```

The repo root [`.mcp.json`](./.mcp.json) is the same block, for clients that detect an MCP server from the repository.

### Grok Build (Grok CLI)

Grok Build (the `grok` command) adds MCP servers with `grok mcp add`. Hosted connector, no token for a first publish:

```bash
grok mcp add --transport http dropthehassle https://dropthehassle.com/mcp
```

Or run the npm package locally (stdio):

```bash
grok mcp add dropthehassle -- npx -y dropthehassle-mcp@latest
```

For account tools, pass your token. Keep it in your environment; Grok expands `${DTH_TOKEN}`:

```bash
grok mcp add --transport http dropthehassle https://dropthehassle.com/mcp --header 'Authorization: Bearer ${DTH_TOKEN}'
```

Check it with `grok mcp list` and `grok mcp doctor dropthehassle`. Add `--scope project` to write `.grok/config.toml` in the current project instead of your user config. Grok also reads a server you already added for Claude Code (`~/.claude.json`) or Cursor (`.cursor/mcp.json`). See [xAI's MCP docs](https://docs.x.ai/build/features/mcp-servers).

### OpenCode

Add to `opencode.json` (project) or `~/.config/opencode/opencode.json`. Hosted connector, no token for a first publish:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "dropthehassle": { "type": "remote", "url": "https://dropthehassle.com/mcp", "enabled": true }
  }
}
```

Or the local server: `"dropthehassle": { "type": "local", "command": ["npx", "-y", "dropthehassle-mcp@latest"], "enabled": true }`. Check it with `opencode mcp list`. See [OpenCode's MCP docs](https://opencode.ai/docs/mcp-servers/).

### Cline

Cline CLI:

```bash
cline mcp add dropthehassle https://dropthehassle.com/mcp --transport http --yes
# or the local server
cline mcp add dropthehassle --yes -- npx -y dropthehassle-mcp@latest
```

Check it with `cline config mcp`. In the Cline extension: **MCP Servers → Remote Servers**, URL `https://dropthehassle.com/mcp`, transport **Streamable HTTP**. Or in `cline_mcp_settings.json`: `"dropthehassle": { "type": "streamableHttp", "url": "https://dropthehassle.com/mcp" }` (without `type`, Cline uses legacy SSE). See [Cline's MCP docs](https://docs.cline.bot/mcp/adding-and-configuring-servers).

### Devin CLI

```bash
devin mcp add dropthehassle https://dropthehassle.com/mcp
# or the local server
devin mcp add dropthehassle -- npx -y dropthehassle-mcp@latest
```

Adding the hosted URL opens an optional DropTheHassle sign-in; you can skip it, a first publish needs no account. Check it with `devin mcp list`. Add `-s project` to write `.devin/mcp_config.json`. See [Devin's MCP docs](https://docs.devin.ai/cli/extensibility/mcp/configuration).

### Zed

Zed **Settings → AI → MCP Servers → Add Server → Add Remote Server** → `https://dropthehassle.com/mcp` (no token for a first publish). Or add it to your Zed settings file (`zed: open settings file`):

```json
{
  "context_servers": {
    "dropthehassle": { "url": "https://dropthehassle.com/mcp" }
  }
}
```

Or the local server:

```json
{
  "context_servers": {
    "dropthehassle": { "command": "npx", "args": ["-y", "dropthehassle-mcp@latest"] }
  }
}
```

With no `Authorization` header Zed offers the standard MCP sign-in; you can skip it, a first publish needs no account. A green dot next to the server in Settings → AI → MCP Servers means it is active. See [Zed's MCP docs](https://zed.dev/docs/ai/mcp). A Zed extension, `mcp-server-dropthehassle`, will follow once it is in the marketplace.

### Windsurf

Cascade reads `~/.codeium/windsurf/mcp_config.json` (Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`). Open it from the Cascade MCP panel. New Devin Local tabs keep secrets in the gitignored project file `.devin/mcp_config.local.json`. Both use the same shape:

```json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp"],
      "env": {
        "DTH_TOKEN": "dth_your-token-here"
      }
    }
  }
}
```

Restart Windsurf after saving so the agent reloads the server.

### Smithery

[`smithery.yaml`](./smithery.yaml) is a stdio config. The install wizard asks for an optional `dthToken` and passes it as `DTH_TOKEN` to `npx -y dropthehassle-mcp`. Leave it empty to try `deploy_site` anonymously.

### Hosted remote

The same server is published at `https://dropthehassle.com/mcp` (streamable HTTP). A client `mcp.json` can point at that URL instead of running `npx`. Send the token as a Bearer header. Without the header, `initialize`, `tools/list`, `deploy_site`, `search_domain` and `whoami` still work; the other tools need the token.

```json
{
  "mcpServers": {
    "dropthehassle": {
      "url": "https://dropthehassle.com/mcp",
      "headers": {
        "Authorization": "Bearer dth_your-token-here"
      }
    }
  }
}
```

## Tools

| Tool | What it does |
| --- | --- |
| `whoami` | Shows which DropTheHassle account the token belongs to. |
| `list_sites` | Lists the sites on the account with their live links, status, and domains. |
| `search_domain` | Checks whether a domain is available and what it would cost. Read-only. It never buys. |
| `deploy_site` | Publishes a folder that contains `index.html` on a free link, or updates an existing site. The server chooses the built folder. Never buys a domain. Without a token the site is anonymous and you must give the human the claim link. |
| `point_domain` | Moves a domain already on your account onto one of your sites. It does not buy a name and it does not edit DNS at another registrar. |
| `choose_link` | Renames a site's free link (`name.dropthehassle.app`). The old link redirects to the new one. Call it only after the owner has agreed (`confirm: true`). |
| `rollback_site` | Restores the previous version of a claimed site (one step back). Doing it again restores the version that was replaced. Call it only after the owner has agreed (`confirm: true`). The owner can also press Restore on the site's Update screen. Does not charge. |
| `list_site_files` | Lists the file paths of a live site. Read-only. Works with an account token or that site's own token. |
| `get_site_file` | Returns one file of a live site (for example `index.html` or `css/site.css`). Read-only. Same tokens as `list_site_files`. |
| `edit_site_file` | Changes or adds one text file on a live site without a full folder Update; other files stay as they are. Restore undoes the last Update or Edit files save. Same tokens as `list_site_files`. |
| `enable_form` | Collect leads on a claimed site: turns the contact form on or off. Visitors send a name, email and message; each message goes to the owner's mailbox and is kept for the dashboard (See messages). Claim the site first. Does not charge. |
| `list_form_submissions` | Lists recent messages from a claimed site's contact form. Read-only. |
| `set_site_password` | Locks a claimed site with a password visitors type before it opens. An empty password makes it public. Works on the free link and on a custom domain. Does not charge. |
| `clear_site_password` | Removes the password from a claimed site so anyone can open it. Does not charge. |
| `set_site_indexing` | Hide from Google: on a claimed site, `noindex` asks search engines to skip it and `allow` lists it again (the default after claim). Visitors can still open the site. Claim the site first. Does not charge. |
| `set_backend` | Routes API paths, or the whole site, to an HTTPS backend hosted elsewhere (for example Railway or Render). An empty `url` unlinks it. |
| `get_checkout_link` | Returns a payment link the human opens and pays. The agent must not open, fill in, or pay it. After payment the domain goes live on that site. Only for sites on the account. For an anonymous site, give the human the claim link first. |
| `site_of_the_day_badge` | Returns the one line to paste before `</body>` for a Site of the day, week, month or year award, plus instructions. Read-only. The ribbon shows only during the winning period. |
| `award_readiness` | Checklist for a site on this account (favicon, share image, title and description, mobile viewport, page weight, custom domain, https, a real page), each with a fix hint. Read-only. |

Examples: *"publish the site in ./dist"*, *"is pocketlighthouse.com free?"*, *"give me a payment link for that .com"*.

## Operator

Operator tools are not in the list above. They are registered only when `DTH_OPS=1` is set (`DTH_OPERATOR=1` is the same switch), or when a `whoami` check at startup shows the token belongs to the ops account. A normal token does not see them, and a call by name is rejected as an unknown tool. The API still returns 404 for those routes unless the token is the ops owner.

## Claude Desktop

| OS | File |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp"],
      "env": {
        "DTH_TOKEN": "dth_your-token-here"
      }
    }
  }
}
```

Paste the token in that file. Claude Desktop does not expand `${env:DTH_TOKEN}`. Restart Claude after saving.
