/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function esqlIsNotNullOrEmpty(field: string) {
  return `${field} IS NOT NULL AND ${field} != ""`;
}

export function esqlIsNullOrEmpty(field: string) {
  return `(${field} IS NULL OR ${field} == "")`;
}

/** Escape a string for use inside double-quoted ESQL string literals (backslash and double-quote). */
export function escapeEsqlStringLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Wrap an arbitrary field name in ESQL backtick quotes so the parser treats it as a single
 * identifier rather than parsing the bytes as ESQL syntax. Embedded backticks are doubled,
 * per the ESQL grammar's escape rule for quoted identifiers.
 *
 * Required for any field name containing characters outside the bare-identifier set
 * (`[a-zA-Z_][a-zA-Z0-9_]*` joined by `.`), e.g. flat-dotted Azure claim paths like
 * `azure.activitylogs.identity.claims.http://schemas_xmlsoap_org/.../upn` whose `:`/`/`
 * characters would otherwise terminate the identifier and trigger a `parsing_exception`.
 *
 * Safe to apply unconditionally: backticked identifiers always resolve to the same field
 * as their bare equivalent, so plain-dotted paths are unaffected at runtime.
 */
export function escapeEsqlIdentifier(s: string): string {
  return `\`${s.replace(/`/g, '``')}\``;
}
