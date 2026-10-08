# Changelog

## 0.5.0 (2026-10-04)

Published on npm as `dropthehassle-mcp@0.5.0` on 4 Oct 2026. This repository was synced to that tarball on 8 Oct 2026. The tag `v0.5.0` points at that sync. Nothing was republished to npm.

- This package is now a small alias. `bin/dth-mcp.js` runs the server that ships in the `dropthehassle` package, and `package.json` depends on `dropthehassle` 0.5.0. The command stays `npx -y dropthehassle-mcp@latest`, and both packages can be installed globally side by side.
- One connection for the computer. The `connect` tool gives the human one link and a short code, and the saved login lives in `~/.config/dropthehassle/credentials.json`, shared with the CLI. `DTH_TOKEN` stays optional and wins when it is set. `server.json` lists `connect`.
- No account for a first deploy. On the local server `deploy_site` and `search_domain` work with no token, and an anonymous deploy returns a claim link. The same two tools need no token on the hosted endpoint.
- The local server now carries the account tools (sites, domains, email, analytics), the same set as the hosted MCP at the time of the 0.5.0 publish. Tools that change something for good take `confirm=true` only after the human said yes, and no tool charges a card: payments are a link the human opens.
- `server.json` is the 0.5.0 registry entry: version 0.5.0, package `dropthehassle-mcp` 0.5.0, description "Your AI puts your site online on a free link with HTTPS. Your own .com later. No token needed."

Not in this release, because they landed on the hosted server after npm 0.5.0 was published: the factual tool descriptions (monorepo PR #192, 5 Oct), the connector redirect and Claude CIMD fix (PR #193, 5 Oct), and the "register a domain" plus "a mailbox that sends and receives" wording (PR #198, 6 Oct). Those are live on `https://dropthehassle.com/mcp` and are not in the 0.5.0 tarball.

## 0.4.2 (2026-09-27)

First tagged release of this repository. `bin/dth-mcp.js` was the server itself, with no dependency, matching `dropthehassle-mcp@0.4.2` on npm.
