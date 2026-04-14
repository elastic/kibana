/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ONE_MILLISECOND_IN_NANOSECONDS = 1_000_000;

// Handles the ECS string | number | undefined union that numeric event log fields use.
export const coerceEcsNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

export const nsToMs = (value: unknown): number | null => {
  const num = coerceEcsNumber(value);
  return num !== null ? Math.round(num / ONE_MILLISECOND_IN_NANOSECONDS) : null;
};

export const toOptionalInt = (value: unknown): number | null => {
  const num = coerceEcsNumber(value);
  return num !== null ? Math.round(num) : null;
};
