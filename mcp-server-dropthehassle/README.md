# DropTheHassle MCP server for Zed

Zed extension that starts the [DropTheHassle](https://dropthehassle.com) MCP server. It does not bundle the server. On startup Zed runs:

```sh
npx -y dropthehassle-mcp@latest
```

Node.js must be on your `PATH`. A first deploy works with no account. Set `DTH_TOKEN` (a token from dropthehassle.com → **Connect your AI**, starting with `dth_`) when you want account tools such as listing sites. If you leave the setting empty, a `DTH_TOKEN` already in the environment Zed was started with is left as-is.

The official MCP registry already has `io.github.bosmdavid-gif/dropthehassle` **0.5.1**. Zed is moving MCP extensions to that registry; this extension is for current Zed versions that install context servers from the marketplace.

## Install as a dev extension

Use this to test before the extension is in the marketplace.

1. Install [Rust](https://www.rust-lang.org/tools/install). Zed compiles the extension to WebAssembly (`wasm32-wasip2`) and installs that target itself when Rust came from rustup.
2. Clone this repository.
3. In Zed, open the extensions page (`zed: extensions`).
4. Click **Install Dev Extension** and choose this directory (the folder that contains `extension.toml`).

A published copy of this extension, if you already installed one, is replaced by the dev extension until you uninstall the dev extension.

If the server does not start, open `zed: open log`. Launch Zed from a terminal with `zed --foreground` to see extension logs. The usual cause is `npx` or `node` missing from `PATH`.

Optional token, in Zed settings:

```json
{
  "context_servers": {
    "dropthehassle": {
      "source": "extension",
      "settings": {
        "DTH_TOKEN": "dth_your-token-here"
      }
    }
  }
}
```

## Marketplace

Publishing is a pull request to [zed-industries/extensions](https://github.com/zed-industries/extensions). That pull request adds this repository as a submodule and an `extensions.toml` entry. It is not opened from this repository. Steps are in [zed-industries/extensions](https://github.com/zed-industries/extensions) and in the [Zed publishing guide](https://zed.dev/docs/extensions/publishing).

Submodule HTTPS URL:

```text
https://github.com/bosmdavid-gif/mcp-server-dropthehassle
```

`extensions.toml` entry (version must match `extension.toml` at the submodule commit):

```toml
[mcp-server-dropthehassle]
submodule = "extensions/mcp-server-dropthehassle"
version = "0.1.0"
```

After adding the submodule, run `pnpm sort-extensions` in the extensions repo so `extensions.toml` and `.gitmodules` stay sorted.

## License

MIT, same as [`dropthehassle-mcp`](https://github.com/bosmdavid-gif/dropthehassle-mcp).
