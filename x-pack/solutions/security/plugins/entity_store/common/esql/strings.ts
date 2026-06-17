/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castField } from './cast';

export function esqlIsNotNullOrEmpty(field: string) {
  const ref = castField(field);
  return `${ref} IS NOT NULL AND ${ref} != ""`;
}

/**
 * Returns the precomputed column name for a field's boolean presence alias.
 * Used by the optimized entity-id pipeline to hoist `IS NOT NULL AND != ""`
 * checks out of per-row CASE arms into a single upstream EVAL stage.
 *
 * Example: `entity.namespace` → `entity_namespace_present`
 */
export function esqlPresentColumnName(field: string): string {
  return `${field.replace(/\./g, '_')}_present`;
}

export function esqlIsNullOrEmpty(field: string) {
  const ref = castField(field);
  return `(${ref} IS NULL OR ${ref} == "")`;
}

/** Escape a string for use inside double-quoted ESQL string literals (backslash and double-quote). */
export function escapeEsqlStringLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
