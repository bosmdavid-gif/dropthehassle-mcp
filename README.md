# DropTheHassle MCP server

How do I get my site online with my AI? Add this server and say "put this site online": your AI puts it live on a free HTTPS link, with no account needed.

```sh
# Claude Code
claude mcp add dropthehassle -- npx -y dropthehassle-mcp@latest

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

Or skip the install and use the hosted connector: `https://dropthehassle.com/mcp` (no token for a first deploy). From a terminal, the same thing is `npx -y dropthehassle@latest deploy`.

What your AI can do:

1. Put the site live on a free HTTPS link (`deploy_site`), with no account, and give you a claim link.
2. Check whether a domain name is free and what it costs (`search_domain`), straight from the domain registry.
3. Hand you a payment link for your own .com: €19 / $19 a year, including VAT in the EU, the same every year. You pay on Stripe's page, and the site then goes live on the domain with HTTPS and no DNS setup.
4. Hand you a payment link for a real mailbox on that domain: it sends and receives, read in the dashboard webmail or any mail app over IMAP/SMTP. €5 / $5 a month, including VAT in the EU.

It cannot spend money. You open the link and pay. A DropTheHassle payment link is always on `checkout.stripe.com`. In the ChatGPT and Claude directory apps, buying happens on dropthehassle.com.

Got a server part too? Keep it on AWS, Google Cloud, DigitalOcean or your own server, and your AI links it to your site in one step.

Package [`dropthehassle-mcp`](https://www.npmjs.com/package/dropthehassle-mcp) **0.5.1** in this repo (MIT, Node.js 18+). Registry name: `io.github.bosmdavid-gif/dropthehassle`.

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

### Zed

Install the Zed extension `mcp-server-dropthehassle` once it is in the marketplace.

Until then, add a remote MCP server: Zed **Settings → AI → MCP Servers → Add Remote Server** → `https://dropthehassle.com/mcp` (no token for a first publish).

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
| `deploy_site` | Puts a folder that contains `index.html` online on a free link, or updates an existing site. The server chooses the built folder. Never buys a domain. Without a token the site is anonymous and you must give the human the claim link. |
| `point_domain` | Moves a domain already on your account onto one of your sites. It does not buy a name and it does not edit DNS at another registrar. |
| `choose_link` | Renames a site's free link (`name.dropthehassle.app`). The old link redirects to the new one. Call it only after the owner has agreed (`confirm: true`). |
| `set_backend` | Routes API paths, or the whole site, to an HTTPS backend hosted elsewhere (for example Railway or Render). An empty `url` unlinks it. |
| `get_checkout_link` | Returns a payment link the human opens and pays. The agent must not open, fill in, or pay it. After payment the domain goes live on that site. Only for sites on the account. For an anonymous site, give the human the claim link first. |
| `site_of_the_day_badge` | Returns the one line to paste before `</body>` for a Site of the day, week, month or year award, plus instructions. Read-only. The ribbon shows only during the winning period. |
| `award_readiness` | Checklist for a site on this account (favicon, share image, title and description, mobile viewport, page weight, custom domain, https, a real page), each with a fix hint. Read-only. |

Examples: *"put the site in ./dist online"*, *"is pocketlighthouse.com free?"*, *"give me a payment link for that .com"*.

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
