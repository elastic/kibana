/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRow, EsqlScalar } from './types';

const MAX_COLUMNS = 100;

const isScalar = (value: unknown): value is EsqlScalar =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/**
 * Reads the entity row a client sends back from a list it was given. Returns `null` unless it is a
 * flat object of scalars and lists of scalars, with a bounded number of columns. The row only
 * supplies the values to look alerts up by, and every query still runs as the requesting user.
 */
export const parseEntityRow = (json: string): EntityRow | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const entries = Object.entries(parsed);
  const isFlat = entries.every(
    ([, value]) => isScalar(value) || (Array.isArray(value) && value.every(isScalar))
  );
  return entries.length > 0 && entries.length <= MAX_COLUMNS && isFlat
    ? Object.fromEntries(entries)
    : null;
};
