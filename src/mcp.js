import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { whoami, createPost, deletePost } from "./api.js";

const wrap = (fn) => async (args) => {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await fn(args), null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: String(e.message ?? e) }] };
  }
};

export async function serve() {
  const server = new McpServer({ name: "linkedin-official", version: "0.1.0" });
  server.tool("linkedin_whoami", "Get the authenticated LinkedIn member's profile (name, email, id).", {}, wrap(() => whoami()));
  server.tool(
    "linkedin_create_post",
    "Publish a text post to the authenticated member's LinkedIn feed. Public and outward-facing: only call after the user has approved the exact text.",
    { text: z.string().min(1).max(3000), visibility: z.enum(["PUBLIC", "CONNECTIONS"]).default("PUBLIC") },
    wrap(({ text, visibility }) => createPost(text, visibility)),
  );
  server.tool(
    "linkedin_delete_post",
    "Delete a post by URN (e.g. urn:li:share:123 or urn:li:ugcPost:123). Irreversible.",
    { urn: z.string() },
    wrap(({ urn }) => deletePost(urn)),
  );
  await server.connect(new StdioServerTransport());
}
