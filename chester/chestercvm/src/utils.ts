import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";

/**
 * Wrap a payload for MCP tool response
 */
export function jsonContent(payload: unknown): { content: TextContent[] } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Get current timestamp in ISO8601 UTC format
 */
export function nowISO(): string {
  return new Date().toISOString();
}
