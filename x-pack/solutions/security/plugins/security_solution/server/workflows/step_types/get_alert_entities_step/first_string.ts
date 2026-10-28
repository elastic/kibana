/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The first non-empty string of an ES `fields` value, which is always an array.
 */
export const firstString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;

  return typeof first === 'string' && first !== '' ? first : undefined;
};
