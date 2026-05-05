/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Converts epoch milliseconds to an ISO-8601 string. */
export const toIso = (ms: number): string => new Date(ms).toISOString();

/**
 * Coerces an unknown value to a finite integer, returning `fallback` if coercion fails.
 *
 * Handles both `number` inputs and stringified numbers (e.g. from JSON).
 */
export const toFiniteIntOr = (value: unknown, fallback: number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? Math.trunc(coerced) : fallback;
};

/**
 * Ensures `value` is a positive integer (>= 1), returning `fallback` otherwise.
 *
 * Useful for clamping user-supplied limits that must be at least 1.
 */
export const clampPositiveInt = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  const v = Math.trunc(value);
  return v >= 1 ? v : fallback;
};

/**
 * Computes the effective page size for a paginated ES query.
 *
 * Takes the requested page size and the remaining alert budget, returning the
 * smaller of the two (but always at least 1).
 */
export const computePageSize = (
  requestedRaw: unknown,
  remainingRaw: unknown,
  fallback: number
): number => {
  const requested = clampPositiveInt(toFiniteIntOr(requestedRaw, fallback), fallback);
  const remaining = toFiniteIntOr(remainingRaw, requested);

  if (!Number.isFinite(remaining)) return requested;
  if (remaining <= 0) return 1;

  return Math.max(1, Math.min(requested, remaining));
};
