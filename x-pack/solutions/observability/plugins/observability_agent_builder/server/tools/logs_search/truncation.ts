/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_OBSERVATION_CHARS,
  MAX_CELL_VALUE_LENGTH,
} from './constants';

export function truncateObservation(content: string, maxChars = MAX_OBSERVATION_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }
  const startSize = Math.floor(maxChars * 0.8);
  const endSize = Math.floor(maxChars * 0.2);
  return [
    content.slice(0, startSize),
    `\n[... truncated: ${content.length} total chars ...]\n`,
    content.slice(-endSize),
  ].join('');
}

export function truncateCellValue(value: unknown): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  if (str.length <= MAX_CELL_VALUE_LENGTH) {
    return str;
  }
  return str.slice(0, MAX_CELL_VALUE_LENGTH) + '…';
}

export function formatTabular(columns: Array<{ name: string }>, values: unknown[][]): string {
  if (!columns.length || !values.length) {
    return '(no results)';
  }

  const header = columns.map((c) => c.name).join(' | ');
  const rows = values.map((row) => row.map((cell) => truncateCellValue(cell)).join(' | '));
  return [header, '-'.repeat(header.length), ...rows].join('\n');
}

