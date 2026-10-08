#!/usr/bin/env node
'use strict';
// dropthehassle-mcp is an alias: the MCP server ships in the `dropthehassle` package (bin
// dropthehassle-mcp, shared core with the CLI). Existing configs (`npx -y dropthehassle-mcp`),
// server.json and smithery keep working through this package.
let server;
try {
  server = require('dropthehassle/bin/dth-mcp.js');
} catch (e) {
  if (!e || e.code !== 'MODULE_NOT_FOUND') throw e;
  server = require('../../cli/bin/dth-mcp.js');   // a checkout of the repo
}
server.main();
