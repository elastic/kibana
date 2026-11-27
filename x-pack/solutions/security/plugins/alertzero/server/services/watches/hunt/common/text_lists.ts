/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_LISTED = 6;

export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export const code = (value: string): string => `\`${value}\``;

/** "a, b and c", or "a, b and 3 more" past `max`. */
export const listOf = (items: string[], max = MAX_LISTED): string => {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  if (shown.length === 0) return '';
  if (rest > 0) return `${shown.join(', ')} and ${plural(rest, 'more', 'more')}`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
};

export const codeList = (items: string[], max = MAX_LISTED): string => listOf(items.map(code), max);
