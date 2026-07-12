/**
 * Pure §1 content boundary for terminal text.
 *
 * HTTP capture, HTTP stream, and any future P2P sender must call this exact
 * function before terminal content crosses a transport boundary.
 */
export function redactSecrets(text: string): string {
  let redacted = text.replace(
    /-----BEGIN [^-\n]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-\n]*PRIVATE KEY-----|$)/gi,
    "[REDACTED_PRIVATE_KEY]",
  );

  const replacements: Array<[RegExp, string]> = [
    [/\bsk-(?:ant-)?[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]"],
    [/\b(?:ghp|github_pat|glpat|xox[baprs])[_-][A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]"],
    [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_ACCESS_KEY]"],
    [/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[REDACTED]"],
    [
      /(\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]*:)[^@\s/]+(@)/gi,
      "$1[REDACTED]$2",
    ],
    [
      /\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret|password|passwd|account(?:_id|\s+id)?)\s*[:=]\s*)(["'])[\s\S]*?\2/gi,
      "$1[REDACTED]",
    ],
    [
      /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|KEY|URL|URI|CONNECTION|DSN|CREDENTIAL|PRIVATE|AUTH)[A-Z0-9_]*\s*=\s*)(["'])[\s\S]*?\2/gi,
      "$1[REDACTED]",
    ],
    [
      /\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret|password|passwd|account(?:_id|\s+id)?)\s*[:=]\s*)[^\s"',;]+/gi,
      "$1[REDACTED]",
    ],
    [
      /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY)[A-Z0-9_]*\s*=\s*)[^\s"']+/gi,
      "$1[REDACTED]",
    ],
    [
      /\b([A-Z][A-Z0-9_]*(?:KEY|URL|URI|CONNECTION|DSN|CREDENTIAL|PRIVATE|AUTH)[A-Z0-9_]*\s*=\s*)(?!\[REDACTED(?:_[A-Z_]+)?\])[^\s"']+/gi,
      "$1[REDACTED]",
    ],
    [/([?&](?:token|access_token|api_key|key|secret)=)[^&\s]+/gi, "$1[REDACTED]"],
  ];

  for (const [pattern, replacement] of replacements) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}
