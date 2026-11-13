/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Ordering = -1 | 0 | 1;

/** Thrown when a version contains something the sortable key cannot represent losslessly. */
export class UnencodableVersionError extends Error {}

export const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';

export const isAlpha = (c: string | undefined): boolean =>
  c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));

export const sign = (n: number): Ordering => (n < 0 ? -1 : n > 0 ? 1 : 0);

/** Largest epoch the keys encode; larger ones lose precision in JS and overflow in painless. */
export const MAX_EPOCH = 999_999_999;

/** Java's String.trim(): strips chars <= U+0020 only, so painless sees the same string. */
export const trimVersion = (raw: string): string =>
  raw.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');

/**
 * Optional sign then leading ASCII digits, else 0. Mirrors the painless parseEpoch, including
 * that it stops accumulating past {@link MAX_EPOCH} (callers reject anything above it).
 */
export const parseEpoch = (s: string): number => {
  let i = 0;
  const negative = s[0] === '-';
  if (negative || s[0] === '+') i++;
  let value = 0;
  for (; isDigit(s[i]); i++) {
    if (value <= MAX_EPOCH) value = value * 10 + (s.charCodeAt(i) - 48);
  }
  return negative ? -value : value;
};

// Leading zeros are stripped, then one length char (0x30 + digit count) precedes the digits, so
// longer numbers sort higher and equal-length numbers sort by their digits.
const MAX_DIGITS = 0x7e - 0x30;

export const encodeNumber = (digits: string): string => {
  const significant = digits.replace(/^0+/, '');
  if (significant.length > MAX_DIGITS) {
    throw new UnencodableVersionError(`number too long: ${digits}`);
  }
  return String.fromCharCode(0x30 + significant.length) + significant;
};

/** Compares sortable keys the way an Elasticsearch keyword field orders them. */
export const compareKeys = (x: string, y: string): Ordering => (x < y ? -1 : x > y ? 1 : 0);
