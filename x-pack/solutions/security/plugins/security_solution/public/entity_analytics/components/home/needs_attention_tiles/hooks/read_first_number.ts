/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

/**
 * Reads a number from the first row of an ES|QL response. An empty result or a null value is 0;
 * a row without the named column throws, so the delta is left out rather than read from the wrong column.
 */
export const readFirstNumber = (raw: ESQLSearchResponse, column: string): number => {
  const row = raw.values?.[0];
  if (!row) return 0;
  const index = raw.columns?.findIndex((c) => c.name === column) ?? -1;
  if (index < 0) throw new Error(`The ES|QL response has no "${column}" column`);
  const value = row[index];
  return typeof value === 'number' ? value : 0;
};
