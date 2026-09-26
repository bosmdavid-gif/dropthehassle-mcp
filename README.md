# DropTheHassle MCP server

Let your AI put a site online and manage its domain on [DropTheHassle](https://dropthehassle.com). It can publish, but it can never spend your money.

This server talks to your DropTheHassle account over MCP (stdio). The agent can deploy a built static site, update it later, check whether a domain is free and what it costs, point a domain you already own at one of your sites, rename the free link, and route paths to a backend you host elsewhere. It works with any static build that contains an `index.html` (Cursor, Claude, ChatGPT, Gemini, Lovable, Bolt, v0, or by hand).

There is no purchase tool. `search_domain` only looks up availability and price. Buying a domain, or turning on email, stays a click you make in the browser. The token is created under **Connect your AI** in the dashboard and can be revoked there. Publishing on the free `yourname.dropthehassle.app` link does not need a card.

Package: [`dropthehassle-mcp`](https://www.npmjs.com/package/dropthehassle-mcp) **0.3.1** (MIT, Node.js 18+). Registry name: `io.github.bosmdavid-gif/dropthehassle`.

## Token

On [dropthehassle.com](https://dropthehassle.com), open the menu (top right) and pick **Connect your AI**. Copy the token (it starts with `dth_`) and export it before you start the client:

```bash
export DTH_TOKEN="dth_your-token-here"
```

Optional: set `DTH_API` if you need an API base other than `https://dropthehassle.com/api/v1`.

## Add to Cursor

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=dropthehassle&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImRyb3B0aGVoYXNzbGUtbWNwIl0sImVudiI6eyJEVEhfVE9LRU4iOiIke2VudjpEVEhfVE9LRU59In19)

The button uses the [Cursor MCP install link](https://cursor.com/docs/mcp/install-links) format. It installs a stdio server named `dropthehassle` that runs `npx -y dropthehassle-mcp` and reads `DTH_TOKEN` from your environment (`${env:DTH_TOKEN}`). The same link as text:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=dropthehassle&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImRyb3B0aGVoYXNzbGUtbWNwIl0sImVudiI6eyJEVEhfVE9LRU4iOiIke2VudjpEVEhfVE9LRU59In19
```

To add it by hand, put this in `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "dropthehassle": {
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

## Claude Code

User scope, with the token already in the environment:

```bash
claude mcp add --scope user dropthehassle --env DTH_TOKEN="$DTH_TOKEN" -- npx -y dropthehassle-mcp
```

Or commit a project `.mcp.json` (Claude Code expands `${DTH_TOKEN}`, not Cursor's `${env:DTH_TOKEN}` form):

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

## Claude Desktop

Edit the desktop config and restart Claude.

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

Paste the token in that file. Claude Desktop does not expand `${env:DTH_TOKEN}`.

## Windsurf

Cascade reads `~/.codeium/windsurf/mcp_config.json` (Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`). You can open it from the Cascade MCP panel or with **Windsurf: Configure MCP Servers**.

```json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp"],
      "env": {
        "DTH_TOKEN": "${env:DTH_TOKEN}"
      }
    }
  }
}
```

Restart Windsurf after saving so Cascade reloads the server.

## Tools

| Tool | What it does |
| --- | --- |
| `whoami` | Shows which DropTheHassle account the token belongs to. |
| `list_sites` | Lists the sites in the account with their live links, status, and domains. |
| `search_domain` | Checks whether a domain is available and what it would cost. Read-only. It never buys. |
| `deploy_site` | Puts a folder that contains `index.html` online on a free link, or updates an existing site. Optional `slug` names a new link. Never buys a domain. |
| `point_domain` | Points a domain that is already on this account at one of its sites. It does not buy a domain and it does not change DNS at another registrar. |
| `choose_link` | Renames a site's free link (`name.dropthehassle.app`). The old link redirects to the new one. Call it only after the owner has agreed (`confirm: true`). |
| `set_backend` | Routes API paths, or the whole site, to an HTTPS backend hosted elsewhere (for example Railway or Render). An empty `url` unlinks it. |

Examples: *"put the site in ./dist online"* or *"is pocketlighthouse.com free?"*.
