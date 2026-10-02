# DropTheHassle MCP server

[DropTheHassle](https://dropthehassle.com) does domains, static hosting, DNS and email forwarding. This server lets your AI publish a static site, check whether a name is free, and move a domain that is already on your account onto one of your sites. It can hand you a payment link on `checkout.stripe.com`. It cannot spend your money, and it cannot turn email on. Buying a domain, or turning on email forwarding, stays a click you make.

Package [`dropthehassle-mcp`](https://www.npmjs.com/package/dropthehassle-mcp) **0.4.2** in this repo (MIT, Node.js 18+). Registry name: `io.github.bosmdavid-gif/dropthehassle`.

## Try it without an account

`deploy_site` works without a token. The site goes live on a free HTTPS link and the reply contains a claim link for the human. On the hosted endpoint, `search_domain` and `whoami` also work without a token.

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
