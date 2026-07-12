import { expect, test } from "bun:test";

import { sanitizeCaptureOutput } from "../server-demo";
import { redactSecrets } from "../src/redact";

test("secret fixtures share stable redaction markers", () => {
  const input = [
    "OPENAI_API_KEY=sk-examplefixture1234567890",
    "Authorization: Bearer bearerfixture1234567890",
    "AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF",
    "DATABASE_PASSWORD=correct-horse-battery-staple",
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "ed25519-private-material-fixture",
    "-----END OPENSSH PRIVATE KEY-----",
  ].join("\n");

  const output = redactSecrets(input);

  expect(output).toContain("OPENAI_API_KEY=[REDACTED]");
  expect(output).toContain("Authorization: Bearer [REDACTED]");
  expect(output).toContain("AWS_ACCESS_KEY_ID=[REDACTED_ACCESS_KEY]");
  expect(output).toContain("DATABASE_PASSWORD=[REDACTED]");
  expect(output).toContain("[REDACTED_PRIVATE_KEY]");
  expect(output).not.toContain("sk-examplefixture1234567890");
  expect(output).not.toContain("bearerfixture1234567890");
  expect(output).not.toContain("AKIA1234567890ABCDEF");
  expect(output).not.toContain("correct-horse-battery-staple");
  expect(output).not.toContain("ed25519-private-material-fixture");
});

test("known non-secrets and terminal formatting pass through unchanged", () => {
  const input = [
    "\u001b[32mbuild passed\u001b[0m",
    "branch=agents/stoa-redaction-core",
    "account count: 8",
    "ordinary URL: https://example.com/docs?section=security",
  ].join("\n");

  expect(redactSecrets(input)).toBe(input);
});

test("capture output strips ANSI and applies the shared secret boundary", () => {
  const input = "\u001b[31mAPI_KEY=capture-secret-fixture\u001b[0m\nplain output";
  const output = sanitizeCaptureOutput(input);

  expect(output).toBe("API_KEY=[REDACTED]\nplain output");
  expect(output).not.toContain("capture-secret-fixture");
  expect(output).not.toContain("\u001b[");
});
