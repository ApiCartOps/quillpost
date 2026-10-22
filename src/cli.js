#!/usr/bin/env node
import { parseArgs } from "node:util";
import { loadConfig, saveConfig, clearToken, configPath } from "./config.js";
import { login } from "./auth.js";
import { whoami, createPost, deletePost } from "./api.js";

const HELP = `linkedin-official: CLI + MCP server on LinkedIn's official API

  setup --client-id=ID --client-secret=SECRET [--redirect-uri=URL] [--api-version=YYYYMM]
  login                         OAuth 2.0 browser flow (scopes: openid profile email w_member_social)
  logout                        Forget the stored token
  whoami                        Show the authenticated member
  post <text> [--visibility=PUBLIC|CONNECTIONS] [--dry-run]
  delete <urn>
  mcp                           Run as an MCP server over stdio
  status                        Show config/token state

Register an app at https://www.linkedin.com/developers/, add the products
"Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn", and add
the redirect URL (default http://localhost:8765/callback).`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "client-id": { type: "string" },
    "client-secret": { type: "string" },
    "redirect-uri": { type: "string" },
    "api-version": { type: "string" },
    visibility: { type: "string", default: "PUBLIC" },
    "dry-run": { type: "boolean" },
  },
});
const [cmd, ...rest] = positionals;
const out = (o) => console.log(JSON.stringify(o, null, 2));

try {
  switch (cmd) {
    case "setup":
      if (!values["client-id"] || !values["client-secret"]) throw new Error("setup needs --client-id and --client-secret");
      saveConfig({
        clientId: values["client-id"],
        clientSecret: values["client-secret"],
        ...(values["redirect-uri"] && { redirectUri: values["redirect-uri"] }),
        ...(values["api-version"] && { apiVersion: values["api-version"] }),
      });
      console.log(`Saved to ${configPath}. Now run: linkedin-official login`);
      break;
    case "login": out(await login()); break;
    case "logout": clearToken(); console.log("Logged out."); break;
    case "whoami": out(await whoami()); break;
    case "status": {
      const c = loadConfig();
      out({
        configPath,
        clientId: c.clientId ?? null,
        hasSecret: !!c.clientSecret,
        loggedIn: !!c.accessToken,
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
        apiVersion: c.apiVersion,
      });
      break;
    }
    case "post": {
      const text = rest.join(" ");
      if (!text) throw new Error("Usage: post <text>");
      if (values["dry-run"]) out({ wouldPost: text, visibility: values.visibility });
      else out(await createPost(text, values.visibility));
      break;
    }
    case "delete":
      if (!rest[0]) throw new Error("Usage: delete <urn>");
      out(await deletePost(rest[0]));
      break;
    case "mcp": await (await import("./mcp.js")).serve(); break;
    default: console.log(HELP);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
