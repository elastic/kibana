/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Elasticsearch `fields` response returns all values as arrays.
 * This utility unwraps single-element arrays to their first value,
 * while preserving multi-element arrays.
 */
export function unwrapEsFields(fields: Record<string, unknown[]>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, unwrapEsFieldValue(value)])
  );
}

/**
 * Get a single field value from ES fields response, unwrapping single-element arrays.
 * Multi-element arrays are preserved.
 */
export function getEsField<T = unknown>(
  fields: Record<string, unknown[] | undefined> | undefined,
  key: string
): T | undefined {
  return unwrapEsFieldValue(fields?.[key]) as T | undefined;
}

function unwrapEsFieldValue(value: unknown): unknown {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}
