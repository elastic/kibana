/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ES|QL and `_source` return a keyword as a string or an array; this reads either as an array. */
export const toStringArray = (value: unknown): string[] => {
  if (value == null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string' && item !== '');
};

export const firstString = (value: unknown): string | undefined => toStringArray(value)[0];

export const toNumber = (value: unknown): number | undefined => {
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single === 'number' && Number.isFinite(single)) return single;
  if (typeof single === 'string' && single !== '' && Number.isFinite(Number(single))) {
    return Number(single);
  }
  return undefined;
};

/** Reads a boolean that may be mapped (`true`) or loaded from `_source` as a keyword (`"true"`). */
export const toBoolean = (value: unknown): boolean | undefined => {
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single === 'boolean') return single;
  if (single === 'true') return true;
  if (single === 'false') return false;
  return undefined;
};
