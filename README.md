# DropTheHassle MCP server

Let your AI put sites online, find real available domain names, and point names at sites, all from
your editor. It **cannot spend money**: buying a domain stays a click you make in the dashboard.

## Connect

1. On [dropthehassle.com](https://dropthehassle.com), open the menu (top right) and pick
   **Connect your AI**. Copy your token (starts with `dth_`).
2. Add this server to your AI's MCP config, with the token as `DTH_TOKEN`.

Claude Desktop / Claude Code (`claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp"],
      "env": { "DTH_TOKEN": "dth_your-token-here" }
    }
  }
}
```

## Tools your AI gets

- **whoami** — confirm the connected account.
- **list_sites** — your sites, their live URLs and the domains on each.
- **search_domain** — is a name free, and what does it cost? (read-only; never buys)
- **deploy_site** — put a built folder online on a free link (or update an existing site).
- **point_domain** — point one of your names at one of your sites.

Just ask, e.g. *"put the site in ./dist online"* or *"find me a free .com like pocketlighthouse"*.
