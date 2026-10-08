# Install the DropTheHassle MCP server (Cline)

This file is for an agent installing the server. Do the steps in order. Do not clone this repository, and do not build it. The local server is the npm package `dropthehassle-mcp` (this repo, version 0.5.0, Node.js 18+). Since 0.5.0 it is a small alias: its one dependency, the `dropthehassle` package (same version), contains the server.

Pick one transport. Local stdio can publish a folder on this machine. The remote endpoint cannot read a local folder.

The token cannot spend money. A payment link, when a tool returns one, is for the human to open and pay. Do not open it, fill it in, or pay it. Do not call `deploy_site`, `point_domain`, `choose_link`, `set_backend`, or `get_checkout_link` to test the install.

## 1. Get a token

Ask the human to do this. You cannot create the token yourself.

1. Open [https://dropthehassle.com](https://dropthehassle.com).
2. Open the menu at the top right and choose **Connect your AI**.
3. Copy the token. It starts with `dth_`.

Keep the token only in the MCP settings file on the human's machine. Do not commit it, and do not paste it into a repository, a log, or a chat transcript.

The process starts with no token. On the local server, `deploy_site` and `search_domain` work with no token; every other tool returns a connect link and a short code for the human instead of running (or set `DTH_TOKEN`). On the remote server, `initialize`, `tools/list`, `ping`, `deploy_site`, `search_domain`, and `whoami` work with no token. Account tools ask for the bearer token.

## 2. Local stdio

Requires Node.js 18 or newer. Check with `node -v`.

The command is:

```bash
npx -y dropthehassle-mcp@latest
```

The process reads the account token from the environment variable `DTH_TOKEN`. That is the only token variable. Leave `DTH_API` unset unless the human has asked for a different API base. The default base is `https://dropthehassle.com/api/v1`.

This transport speaks newline-delimited JSON-RPC 2.0 on stdin and stdout. `deploy_site` takes a `folder` argument: an absolute path to the project or the built site. The server chooses `index.html`, `dist/`, `build/`, `out/`, `_site/`, or `public/`.

### cline_mcp_settings.json (local)

Cline's VS Code extension stores servers in `cline_mcp_settings.json`. Open it from the Cline panel: **MCP Servers** icon, **Configure** tab, **Configure MCP Servers**. The Cline CLI uses the same `mcpServers` object in `~/.cline/mcp.json`.

If `mcpServers` already has entries, add `dropthehassle` beside them. Leave the other servers in place.

Paste the human's token as the literal `DTH_TOKEN` string. Use the token itself, not a `${env:DTH_TOKEN}` placeholder.

```json
{
  "mcpServers": {
    "dropthehassle": {
      "command": "npx",
      "args": ["-y", "dropthehassle-mcp@latest"],
      "env": {
        "DTH_TOKEN": "dth_your-token-here"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

On Windows, if the editor reports that it cannot spawn `npx`, set `command` to `cmd` and `args` to `["/c", "npx", "-y", "dropthehassle-mcp@latest"]`. The first launch downloads the package. If Cline times out, raise that server's `timeout` (seconds) and retry.

## 3. Remote Streamable HTTP

URL: `https://dropthehassle.com/mcp`

No Node.js install. The client POSTs JSON-RPC to that URL. Cline's transport value is `streamableHttp` (camelCase). Set it. A URL entry with no `type` is legacy SSE in current Cline, and this endpoint is not SSE: a GET returns HTTP 405 and tells the client to use POST with Streamable HTTP.

The bearer header is optional. When you send it, the header name is `Authorization` and the value is `Bearer ` plus the same `dth_` token, with one space after `Bearer`.

On this URL, `deploy_site` does not accept a folder. Its required argument is `files`: an array of objects with `path`, `content`, and `encoding` (`utf8` or `base64`).

### cline_mcp_settings.json (remote)

Same file as the local example. Use a different server name if the local `dropthehassle` entry is already present, so one does not replace the other.

```json
{
  "mcpServers": {
    "dropthehassle": {
      "type": "streamableHttp",
      "url": "https://dropthehassle.com/mcp",
      "headers": {
        "Authorization": "Bearer dth_your-token-here"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Omit the `headers` object to connect with no token. Add it before calling account tools. Leave `autoApprove` empty so Cline asks the human before each tool call.

You can also add the remote server from the **Remote Servers** tab: name `dropthehassle`, URL `https://dropthehassle.com/mcp`, transport **Streamable HTTP**, then the `Authorization` header if the human has a token.

## 4. Verify

Confirm the connection first. Then, once the token is in place, call the read-only domain check. That call does not register a name.

### Connection (no token required)

Local stdio. Expect one JSON object per line. `serverInfo.name` is `dropthehassle`, and `tools/list` includes `search_domain`.

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cline","version":"0.0.1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | npx -y dropthehassle-mcp@latest
```

Remote. Expect HTTP 200 and a JSON body (`Content-Type: application/json`) whose `serverInfo.name` is `dropthehassle`.

```bash
curl -sS https://dropthehassle.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"cline","version":"0.0.1"}}}'

curl -sS https://dropthehassle.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

`tools/list` includes `deploy_site`, `search_domain`, `whoami`, `list_sites`, `point_domain`, `choose_link`, `set_backend`, and `get_checkout_link`, plus the account tools. The full list grows between releases, so read it from `tools/list`.

### Domain price check (no token needed)

Call `search_domain` with `{ "name": "example.com" }`. It is read-only. It reports whether that name is available and, when it is, the price in EUR. It does not buy the domain.

From Cline, after the server is connected, ask it to check whether `example.com` is free.

From the shell, local:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cline","version":"0.0.1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_domain","arguments":{"name":"example.com"}}}' \
  | npx -y dropthehassle-mcp@latest
```

Remote:

```bash
curl -sS https://dropthehassle.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_domain","arguments":{"name":"example.com"}}}'
```

A successful result is text that starts with the domain and its status (for example `example.com: Taken.` locally, `example.com: Unavailable.` remotely), with the price when the name is available. It is a read-only check and never spends money.

An account tool called with no token returns `isError: true`. Locally the text gives the human a connect link and a short code to approve; remotely it says to send the token as `Authorization: Bearer <token>`. Connect (or put the token in `DTH_TOKEN` or the bearer header) and call the tool again.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Local account tool returns a connect link | The human opens the link and approves the code, or put the `dth_` token in that server's `env.DTH_TOKEN` and restart the MCP server. |
| Remote tool says it needs a DropTheHassle token | Add `Authorization: Bearer <token>` and retry. |
| `Invalid or revoked API token` | The human copies a new token from the menu, **Connect your AI**. |
| Remote client fails immediately, or uses SSE | Set `"type": "streamableHttp"` and the URL `https://dropthehassle.com/mcp`. |
| `npx` is not found, or the first start times out | Install Node.js 18+, or on Windows use the `cmd /c` form above, then raise Cline's `timeout` and retry. |
| Another MCP server disappeared | Restore the previous settings file and merge the `dropthehassle` entry into `mcpServers`. |
