use zed_extension_api::{
    self as zed, settings::ContextServerSettings, Command, ContextServerConfiguration,
    ContextServerId, Project, Result,
};

const CONTEXT_SERVER_ID: &str = "dropthehassle";

struct DropTheHassleExtension;

impl zed::Extension for DropTheHassleExtension {
    fn new() -> Self {
        Self
    }

    fn context_server_command(
        &mut self,
        _context_server_id: &ContextServerId,
        project: &Project,
    ) -> Result<Command> {
        // Node must be on PATH. npx downloads dropthehassle-mcp; this extension
        // does not bundle the server. An empty env leaves an inherited DTH_TOKEN
        // alone. A token set in Zed settings is passed through explicitly.
        Ok(Command {
            command: "npx".to_string(),
            args: vec!["-y".to_string(), "dropthehassle-mcp@latest".to_string()],
            env: dth_token_env(project),
        })
    }

    fn context_server_configuration(
        &mut self,
        _context_server_id: &ContextServerId,
        _project: &Project,
    ) -> Result<Option<ContextServerConfiguration>> {
        Ok(Some(ContextServerConfiguration {
            installation_instructions: INSTALLATION_INSTRUCTIONS.to_string(),
            default_settings: DEFAULT_SETTINGS.to_string(),
            settings_schema: SETTINGS_SCHEMA.to_string(),
        }))
    }
}

fn dth_token_env(project: &Project) -> Vec<(String, String)> {
    match configured_dth_token(project) {
        Some(token) => vec![("DTH_TOKEN".to_string(), token)],
        None => Vec::new(),
    }
}

/// Token from this context server's Zed settings, if the user set one.
///
/// `std::env::var` is not the user's shell inside the extension sandbox, so
/// the token is read from settings. When this returns `None`, the spawned
/// `npx` process still inherits Zed's own environment, including `DTH_TOKEN`
/// when that was set before Zed started.
fn configured_dth_token(project: &Project) -> Option<String> {
    let settings = ContextServerSettings::for_project(CONTEXT_SERVER_ID, project).ok()?;

    if let Some(command) = settings.command {
        if let Some(env) = command.env {
            if let Some(token) = nonempty(env.get("DTH_TOKEN").map(String::as_str)) {
                return Some(token);
            }
        }
    }

    let value = settings.settings?;
    nonempty(value.get("DTH_TOKEN").and_then(|v| v.as_str()))
        .or_else(|| nonempty(value.get("dth_token").and_then(|v| v.as_str())))
}

fn nonempty(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(str::to_string)
}

const INSTALLATION_INSTRUCTIONS: &str = "\
DropTheHassle runs with `npx -y dropthehassle-mcp@latest`. Node.js must be on your PATH.

A first deploy works without an account. For account tools, paste a token from dropthehassle.com (menu → Connect your AI). It starts with `dth_`.\
";

const DEFAULT_SETTINGS: &str = "\
{
  // Optional. Leave empty to deploy without an account.
  \"DTH_TOKEN\": \"\"
}\
";

const SETTINGS_SCHEMA: &str = r#"{
  "type": "object",
  "properties": {
    "DTH_TOKEN": {
      "type": "string",
      "description": "Optional DropTheHassle account token (dth_…). Leave empty for a first deploy."
    }
  },
  "additionalProperties": false
}"#;

zed::register_extension!(DropTheHassleExtension);
