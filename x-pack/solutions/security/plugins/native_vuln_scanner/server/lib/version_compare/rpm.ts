/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * RPM version ordering: a port of rpmvercmp (rpmio/rpmvercmp.c, rpm 4.16) with EVR handling,
 * plus a sortable key whose plain byte order equals rpm order. The key is also built at ingest
 * by a painless script; both must stay byte-identical.
 */

import { encodeNumber, isAlpha, isDigit, sign } from './common';
import type { Ordering } from './common';

export interface Evr {
  readonly epoch: number;
  readonly version: string;
  readonly release: string;
}

/** Accepts "E:V-R", "V-R" or "V". Missing epoch = 0; missing release = "". */
export const parseEvr = (raw: string): Evr => {
  const trimmed = raw.trim();
  const colon = trimmed.indexOf(':');
  const epoch = colon >= 0 ? Number.parseInt(trimmed.slice(0, colon), 10) || 0 : 0;
  const rest = colon >= 0 ? trimmed.slice(colon + 1) : trimmed;
  const dash = rest.lastIndexOf('-');
  return dash >= 0
    ? { epoch, version: rest.slice(0, dash), release: rest.slice(dash + 1) }
    : { epoch, version: rest, release: '' };
};

const isAlnum = (c: string | undefined): boolean => isDigit(c) || isAlpha(c);

/** Compares one version or release string exactly as librpm's rpmvercmp does. */
export const rpmvercmp = (a: string, b: string): Ordering => {
  if (a === b) return 0;
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    while (i < a.length && !isAlnum(a[i]) && a[i] !== '~' && a[i] !== '^') i++;
    while (j < b.length && !isAlnum(b[j]) && b[j] !== '~' && b[j] !== '^') j++;

    if (a[i] === '~' || b[j] === '~') {
      if (a[i] !== '~') return 1;
      if (b[j] !== '~') return -1;
      i++;
      j++;
      continue;
    }
    if (a[i] === '^' || b[j] === '^') {
      if (i >= a.length) return -1;
      if (j >= b.length) return 1;
      if (a[i] !== '^') return 1;
      if (b[j] !== '^') return -1;
      i++;
      j++;
      continue;
    }
    if (!(i < a.length && j < b.length)) break;

    const startA = i;
    const startB = j;
    const isNumeric = isDigit(a[i]);
    const inSegment = isNumeric ? isDigit : isAlpha;
    while (inSegment(a[i])) i++;
    while (inSegment(b[j])) j++;
    let segA = a.slice(startA, i);
    let segB = b.slice(startB, j);
    // A numeric segment is newer than an alpha one.
    if (segB.length === 0) return isNumeric ? 1 : -1;

    if (isNumeric) {
      segA = segA.replace(/^0+/, '');
      segB = segB.replace(/^0+/, '');
      if (segA.length !== segB.length) return sign(segA.length - segB.length);
    }
    if (segA !== segB) return segA < segB ? -1 : 1;
  }
  if (i >= a.length && j >= b.length) return 0;
  return i < a.length ? 1 : -1;
};

/** Compares two EVR strings exactly as librpm's labelCompare does. */
export const compareRpm = (a: string, b: string): Ordering => {
  const left = parseEvr(a);
  const right = parseEvr(b);
  if (left.epoch !== right.epoch) return sign(left.epoch - right.epoch);
  return rpmvercmp(left.version, right.version) || rpmvercmp(left.release, right.release);
};

// Key alphabet:
//   '~'            -> '!'  before end
//   end            -> '"'
//   '^'            -> '#'  after end, before any segment
//   alpha segment  -> '*' + letters + ' ' (0x20 terminator sorts below every letter)
//   numeric seg    -> '+' + encodeNumber(digits) ('+' > '*': numeric is newer than alpha)
//   other chars    -> dropped, rpm treats them as separators
const encodeVersion = (value: string): string => {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const c = value[i];
    if (c === '~') {
      out += '!';
      i++;
    } else if (c === '^') {
      out += '#';
      i++;
    } else if (isDigit(c)) {
      const start = i;
      while (isDigit(value[i])) i++;
      out += '+' + encodeNumber(value.slice(start, i));
    } else if (isAlpha(c)) {
      const start = i;
      while (isAlpha(value[i])) i++;
      out += '*' + value.slice(start, i) + ' ';
    } else {
      i++;
    }
  }
  return out + '"';
};

/** Builds a keyword whose byte order equals rpm order; throws UnencodableVersionError. */
export const rpmKey = (raw: string): string => {
  const { epoch, version, release } = parseEvr(raw);
  return encodeNumber(String(epoch)) + encodeVersion(version) + encodeVersion(release);
};
