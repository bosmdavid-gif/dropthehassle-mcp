# Zed extensions pull request

Paste the title into the pull request title. Paste the body below it into the description.

Fork `zed-industries/extensions` under **bosmdavid-gif** (not a different account). One extension per pull request.

## Title

Add mcp-server-dropthehassle Zed extension

## Body

Add the DropTheHassle MCP server extension.

This pull request adds one extension. DropTheHassle MCP publishes a site with `npx -y dropthehassle-mcp@latest`. No server binary is bundled. `DTH_TOKEN` is optional and is read from Zed settings.

- Extension repository: https://github.com/bosmdavid-gif/mcp-server-dropthehassle
- Official MCP registry: `io.github.bosmdavid-gif/dropthehassle` 0.5.1

Submodule (HTTPS, not SSH):

```sh
git submodule add https://github.com/bosmdavid-gif/mcp-server-dropthehassle.git extensions/mcp-server-dropthehassle
```

`extensions.toml` (version `0.1.0` matches `extension.toml` at the submodule commit):

```toml
[mcp-server-dropthehassle]
submodule = "extensions/mcp-server-dropthehassle"
version = "0.1.0"
```

The version must match `extension.toml` at the submodule commit. Run `pnpm sort-extensions` so `extensions.toml` and `.gitmodules` stay sorted.
