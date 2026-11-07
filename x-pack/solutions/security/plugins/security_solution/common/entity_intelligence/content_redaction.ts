/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RedactedContent {
  text: string;
  redacted: boolean;
  truncated: boolean;
}

export interface AgentCapturedText extends RedactedContent {
  source: string;
  recordHash?: string;
}

export interface AgentCapturedPrompt extends AgentCapturedText {
  id: string;
  timestamp: string;
}

export interface AgentCapturedInput extends AgentCapturedText {
  kind: 'command' | 'arguments';
}

export interface AgentCapturedContent {
  mode: 'metadata_only' | 'redacted_local';
  redaction_version?: number;
  title?: AgentCapturedText;
  prompts?: AgentCapturedPrompt[];
  prompts_total?: number;
  prompts_truncated?: boolean;
  input?: AgentCapturedInput;
  output?: AgentCapturedText;
}

export interface ContentRedactor {
  getRevision: () => number;
  observe: (text: string) => void;
  redact: (text: string, maxLength?: number) => RedactedContent;
}

const marker = '[REDACTED]';
const maxInput = 256_000;
const credentialKey =
  '(?:(?:[a-z0-9]{1,64}[_-]){0,4}(?:password|passwd|pwd|pass|passphrase|secret|token|(?:api|auth|access|private)[_ -]?key|(?:access|refresh|id|auth)[_ -]?token|client[_ -]?secret|credentials?|authorization|cookie)|es_auth)';
const patterns = [
  /-----BEGIN (?:[A-Z ]*PRIVATE KEY|OPENSSH PRIVATE KEY)-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\b(?:sk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{12,}|gh[pousr]_[a-zA-Z0-9]{12,}|github_pat_[a-zA-Z0-9_]{12,}|xox[baprs]-[a-zA-Z0-9-]{10,}|AKIA[A-Z0-9]{16})\b/g,
  /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g,
];
const passwordProsePattern =
  /\b(?:password|passwd|pwd|passphrase)(?:\s+for\s+[^\s:]+)?\s+(?:is|was)\s+("[^"\r\n]*"|'[^'\r\n]*'|[^\s.,;:]+)/gi;
const valuePatterns = [
  /\b([a-zA-Z0-9_.@-]{1,64}\s*\/\s*[^\s]{4,128})(?=\s+(?:as\s+)?(?:credentials?|login|password)\b)/gi,
  /\b(?:login|credentials?)\s*(?:(?:is|are)\s*)?[:=]?\s*([a-zA-Z0-9_.@-]{1,64}\s*[/\:]\s*[^\s,;]+)/gi,
  passwordProsePattern,
  new RegExp(
    `(?<![a-z0-9_-])(?:["']?${credentialKey}["']?\\s*(?::|=)\\s*)("[^"\\r\\n]*"|'[^'\\r\\n]*'|[^\\s,;)}\\]]+)`,
    'gi'
  ),
  new RegExp(`--${credentialKey}(?:=|\\s+)("[^"\\r\\n]*"|'[^'\\r\\n]*'|[^\\s;]+)`, 'gi'),
  /\b(?:authorization|proxy[-_]authorization)["']?\s*[:=]\s*["']?(?:Bearer|Basic)\s+([a-zA-Z0-9+/_.=:-]+)/gi,
  /https?:\/\/([^\s/@]+:[^\s/@]+)@/gi,
  /(?:^|\s)(?:-u|--user)(?:=|\s+)["']?([^\s"']+:[^\s"']+)/g,
  /(?:\b(?:user(?:name)?\s*[/,]\s*pass(?:word)?|credentials?)\s*(?:(?:are|is)\s*)?[:=]?\s*)([^\s,:/]+\s*[:/]\s*[^\s,;]+)/gi,
];

const unquote = (value: string): string =>
  /^(?:"[\s\S]*"|'[\s\S]*')$/.test(value) ? value.slice(1, -1) : value;
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasSecretShape = (value: string): boolean => /[0-9!#$%&*+/:=?@^_|~\\-]/.test(value);
const shouldMaskValue = (pattern: RegExp, value: string): boolean => {
  const secret = unquote(value);
  if (secret.startsWith('[REDACTED')) return false;
  const quoted = secret !== value;
  if (!quoted && /^(?:true|false|null|undefined|NaN|Infinity|Bearer|Basic)$/i.test(secret))
    return false;
  return pattern !== passwordProsePattern || quoted || hasSecretShape(secret);
};
const canLearn = (value: string): boolean => value.length >= 8 && !/\s/.test(value);

/** Redacts credential patterns and explicit secrets learned in memory before content is exported. */
export const createContentRedactor = (): ContentRedactor => {
  const secrets = new Set<string>();
  let known: RegExp | undefined;
  let knownSize = 0;
  const remember = (value: string, recognizedToken = false): void => {
    const secret = unquote(value);
    if (
      (recognizedToken || canLearn(secret)) &&
      secret.length <= 8192 &&
      secrets.size < 2048 &&
      !secret.startsWith('[REDACTED')
    ) {
      secrets.add(secret);
      secrets.add(JSON.stringify(secret).slice(1, -1));
    }
    if (/^[^\s:/]+\s*[:/]\s*[^\s]+$/.test(secret)) {
      const password = secret.slice(secret.search(/[:/]/) + 1).trim();
      if (canLearn(password) && password.length <= 8192 && secrets.size < 2048) {
        secrets.add(password);
        secrets.add(JSON.stringify(password).slice(1, -1));
      }
    }
  };
  const observe = (text: string): void => {
    if (text.length > maxInput) return;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) remember(match[0], true);
    }
    for (const pattern of valuePatterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        if (shouldMaskValue(pattern, match[1])) remember(match[1]);
      }
    }
  };
  const redact = (text: string, maxLength = 8000): RedactedContent => {
    if (text.length > maxInput) {
      return {
        text: '[Content omitted: exceeds redaction limit]',
        redacted: true,
        truncated: true,
      };
    }
    observe(text);
    let safe = text;
    for (const pattern of patterns) safe = safe.replace(pattern, marker);
    for (const pattern of valuePatterns) {
      safe = safe.replace(pattern, (match: string, value: string) =>
        shouldMaskValue(pattern, value) ? match.replace(value, marker) : match
      );
    }
    if (knownSize !== secrets.size) {
      known = secrets.size
        ? new RegExp(
            [...secrets]
              .sort((left, right) => right.length - left.length)
              .map(escapeRegex)
              .join('|'),
            'g'
          )
        : undefined;
      knownSize = secrets.size;
    }
    if (known) safe = safe.replace(known, marker);
    const limit = Math.max(0, Math.min(32_000, maxLength));
    return { text: safe.slice(0, limit), redacted: safe !== text, truncated: safe.length > limit };
  };
  return { observe, redact, getRevision: () => secrets.size };
};
