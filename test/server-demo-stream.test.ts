import { expect, test } from "bun:test";

import {
  captureLines,
  captureTarget,
  encodeSseData,
  handleRequest,
  redactPaneOutput,
  streamFrameDelta,
} from "../server-demo";

test("stream parameters reuse capture validation", () => {
  expect(captureTarget("01-agora", "1")).toBe("01-agora:1");
  expect(captureTarget("01-agora", "%2457")).toBe("%2457");
  expect(captureTarget("bad;session", "1")).toBeNull();
  expect(captureLines(null)).toBe(80);
  expect(captureLines("500")).toBe(500);
  expect(captureLines("501")).toBeNull();
});

test("pane redaction preserves ANSI while removing obvious secrets", () => {
  const input = [
    "\u001b[31mcolored\u001b[0m",
    "API_KEY=supersecretvalue123",
    "Authorization: Bearer abcdefghijklmnop",
    "account_id=t2",
    "sk-ant-abcdefghijklmnop",
    "-----BEGIN TEST PRIVATE KEY-----",
    "super-private-material",
    "-----END TEST PRIVATE KEY-----",
  ].join("\n");
  const output = redactPaneOutput(input);

  expect(output).toContain("\u001b[31mcolored\u001b[0m");
  expect(output).toContain("API_KEY=[REDACTED]");
  expect(output).toContain("Bearer [REDACTED]");
  expect(output).toContain("account_id=[REDACTED]");
  expect(output).toContain("[REDACTED_TOKEN]");
  expect(output).toContain("[REDACTED_PRIVATE_KEY]");
  expect(output).not.toContain("supersecretvalue123");
  expect(output).not.toContain("abcdefghijklmnop");
  expect(output).not.toContain("super-private-material");
});

test("SSE framing preserves multiline ANSI data as one event", () => {
  const encoded = new TextDecoder().decode(encodeSseData("\u001b[32mone\u001b[0m\ntwo\n"));
  expect(encoded).toBe("data: \u001b[32mone\u001b[0m\ndata: two\ndata: \n\n");
});

test("SSE snapshot framing carries a resumable sequence id", () => {
  const encoded = new TextDecoder().decode(encodeSseData("pane\n", 42, "snapshot"));
  expect(encoded).toBe("id: 42\nevent: snapshot\ndata: pane\ndata: \n\n");
});

test("peek fallback appends prefixes and redraws replaced screens", () => {
  expect(streamFrameDelta("one\n", "one\ntwo\n")).toBe("two\n");
  expect(streamFrameDelta("old", "new")).toBe("\u001b[2J\u001b[Hnew");
  expect(streamFrameDelta("same", "same")).toBeNull();
});

test("invalid stream input returns 400 without opening a tail", async () => {
  const response = await handleRequest(new Request(
    "http://localhost/api/agora/stream?session=bad%3Bsession&window=1&lines=999",
  ));
  expect(response.status).toBe(400);
  expect(response.headers.get("x-agora-content-warning")).toContain("pane-snapshot");
});
