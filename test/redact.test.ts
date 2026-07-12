import { expect, test } from "bun:test";

import { sanitizeCaptureOutput } from "../server-demo";
import { redactSecrets } from "../src/redact";

test("secret fixtures share stable redaction markers", () => {
  const input = [
    "OPENAI_API_KEY=sk-examplefixture1234567890",
    "Authorization: Bearer bearerfixture1234567890",
    "AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF",
    "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "SECRET_KEY=secret-key-fixture",
    "PRIVATE_KEY=private-key-fixture",
    "ENCRYPTION_KEY=encryption-key-fixture",
    "SESSION_KEY=session-key-fixture",
    "DATABASE_PASSWORD=correct-horse-battery-staple",
    "DB_CONNECTION=postgres://user:database-password@db.example/app",
    "REDIS_URL=redis://:redis-password@cache.example/0",
    "password='my secret pass'",
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "ed25519-private-material-fixture",
    "-----END OPENSSH PRIVATE KEY-----",
  ].join("\n");

  const output = redactSecrets(input);

  expect(output).toContain("OPENAI_API_KEY=[REDACTED]");
  expect(output).toContain("Authorization: Bearer [REDACTED]");
  expect(output).toContain("AWS_ACCESS_KEY_ID=[REDACTED_ACCESS_KEY]");
  expect(output).toContain("AWS_SECRET_ACCESS_KEY=[REDACTED]");
  expect(output).toContain("SECRET_KEY=[REDACTED]");
  expect(output).toContain("PRIVATE_KEY=[REDACTED]");
  expect(output).toContain("ENCRYPTION_KEY=[REDACTED]");
  expect(output).toContain("SESSION_KEY=[REDACTED]");
  expect(output).toContain("DATABASE_PASSWORD=[REDACTED]");
  expect(output).toContain("DB_CONNECTION=[REDACTED]");
  expect(output).toContain("REDIS_URL=[REDACTED]");
  expect(output).toContain("password=[REDACTED]");
  expect(output).toContain("[REDACTED_PRIVATE_KEY]");
  expect(output).not.toContain("sk-examplefixture1234567890");
  expect(output).not.toContain("bearerfixture1234567890");
  expect(output).not.toContain("AKIA1234567890ABCDEF");
  expect(output).not.toContain("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
  expect(output).not.toContain("secret-key-fixture");
  expect(output).not.toContain("private-key-fixture");
  expect(output).not.toContain("encryption-key-fixture");
  expect(output).not.toContain("session-key-fixture");
  expect(output).not.toContain("correct-horse-battery-staple");
  expect(output).not.toContain("database-password");
  expect(output).not.toContain("redis-password");
  expect(output).not.toContain("my secret pass");
  expect(output).not.toContain("ed25519-private-material-fixture");
});

test("connection-string passwords are redacted outside environment assignments", () => {
  const input = [
    "postgres://app:postgres-password@db.example/app",
    "redis://:redis-password@cache.example/0",
  ].join("\n");

  expect(redactSecrets(input)).toBe([
    "postgres://app:[REDACTED]@db.example/app",
    "redis://:[REDACTED]@cache.example/0",
  ].join("\n"));
});

test("dangling private-key snapshots redact from BEGIN through end of buffer", () => {
  const input = [
    "plain prefix",
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "truncated-ed25519-material",
  ].join("\n");

  expect(redactSecrets(input)).toBe("plain prefix\n[REDACTED_PRIVATE_KEY]");
  expect(redactSecrets(input)).not.toContain("truncated-ed25519-material");
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
  const input = [
    "\u001b[31mAPI_KEY=capture-secret-fixture\u001b[0m",
    "AWS_SECRET_ACCESS_KEY=capture-aws-secret",
    "password='capture quoted secret'",
    "plain output",
    "-----BEGIN OPENSSH PRIVATE KEY-----",
    "capture-truncated-private-material",
  ].join("\n");
  const output = sanitizeCaptureOutput(input);

  expect(output).toBe([
    "API_KEY=[REDACTED]",
    "AWS_SECRET_ACCESS_KEY=[REDACTED]",
    "password=[REDACTED]",
    "plain output",
    "[REDACTED_PRIVATE_KEY]",
  ].join("\n"));
  expect(output).not.toContain("capture-secret-fixture");
  expect(output).not.toContain("capture-aws-secret");
  expect(output).not.toContain("capture quoted secret");
  expect(output).not.toContain("capture-truncated-private-material");
  expect(output).not.toContain("\u001b[");
});
