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
