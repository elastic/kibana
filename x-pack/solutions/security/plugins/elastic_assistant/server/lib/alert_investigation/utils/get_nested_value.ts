/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Get a nested value from an object using a dot-separated path.
 *
 * Supports both:
 * - Flat dotted keys from ES: { "host.name": "server1" }
 * - Nested objects: { host: { name: "server1" } }
 *
 * Checks flat key first (ES alert format), falls back to nested traversal.
 */
export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  // Check flat dotted key first (ES returns alerts with flat keys like "host.name")
  if (path in obj) return obj[path];
  // Fall back to nested traversal (for properly nested objects)
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};
