/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes raw (unescaped) control characters that appear inside JSON string literals so the text
 * parses as valid JSON.
 *
 * The `detection-rule-edit` skill has the model hand-stringify the rule JSON for non-query field
 * edits. When a string value (e.g. a rule `description`) contains a line break, the model can emit a
 * raw newline instead of the escaped `\n`, producing invalid JSON that throws on `JSON.parse` when
 * the card is re-rendered. The prompt now asks the model to escape newlines (mirroring the
 * `automatic_troubleshooting` insight prompts); this enforces the same on ingest as a safety net so a
 * model slip cannot persist unparseable text.
 *
 * This is a targeted transform for control-char-in-string only; it does not attempt to repair other
 * classes of malformed JSON.
 */
const CONTROL_CHAR_ESCAPES: Record<string, string> = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
};

export const escapeJsonControlChars = (text: string): string => {
  let result = '';
  let inString = false;
  let afterBackslash = false;

  for (const char of text) {
    if (afterBackslash) {
      // A backslash starts an escape sequence; pass the next char through untouched so escaped
      // quotes (\") don't flip the in-string state.
      result += char;
      afterBackslash = false;
    } else if (char === '\\') {
      result += char;
      afterBackslash = true;
    } else if (char === '"') {
      inString = !inString;
      result += char;
    } else if (inString && char < ' ') {
      // Raw control character inside a string literal — escape it so the text parses.
      result +=
        CONTROL_CHAR_ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
    } else {
      result += char;
    }
  }

  return result;
};
