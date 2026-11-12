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
