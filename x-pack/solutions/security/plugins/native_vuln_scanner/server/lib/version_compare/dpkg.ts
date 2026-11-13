/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Debian/Ubuntu version ordering: a port of dpkg's verrevcmp (lib/dpkg/version.c), plus a
 * sortable key whose plain byte order equals dpkg order. The key is also built at ingest by a
 * painless script; both must stay byte-identical.
 */

import { encodeNumber, isAlpha, isDigit, MAX_EPOCH, sign, UnencodableVersionError } from './common';
import type { Ordering } from './common';

export interface DpkgVersion {
  readonly epoch: number;
  readonly upstream: string;
  readonly revision: string;
}

/** Splits `[epoch:]upstream[-revision]`; the revision starts after the last '-'. */
export const parseDpkg = (raw: string): DpkgVersion => {
  const trimmed = raw.trim();
  const colon = trimmed.indexOf(':');
  const epoch = colon >= 0 ? Number.parseInt(trimmed.slice(0, colon), 10) || 0 : 0;
  const rest = colon >= 0 ? trimmed.slice(colon + 1) : trimmed;
  const dash = rest.lastIndexOf('-');
  return dash >= 0
    ? { epoch, upstream: rest.slice(0, dash), revision: rest.slice(dash + 1) }
    : { epoch, upstream: rest, revision: '' };
};

// dpkg's order(): '~' < end of run < letters < everything else.
const order = (c: string | undefined): number => {
  if (c === undefined || isDigit(c)) return 0;
  if (c === '~') return -1;
  if (isAlpha(c)) return c.charCodeAt(0);
  return c.charCodeAt(0) + 256;
};

const verrevcmp = (a: string, b: string): number => {
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    let firstDiff = 0;
    while ((i < a.length && !isDigit(a[i])) || (j < b.length && !isDigit(b[j]))) {
      const ac = order(a[i]);
      const bc = order(b[j]);
      if (ac !== bc) return ac - bc;
      i++;
      j++;
    }
    while (a[i] === '0') i++;
    while (b[j] === '0') j++;
    while (isDigit(a[i]) && isDigit(b[j])) {
      if (!firstDiff) firstDiff = a.charCodeAt(i) - b.charCodeAt(j);
      i++;
      j++;
    }
    if (isDigit(a[i])) return 1;
    if (isDigit(b[j])) return -1;
    if (firstDiff) return firstDiff;
  }
  return 0;
};

/** Compares two dpkg versions exactly as `dpkg --compare-versions` does. */
export const compareDpkg = (a: string, b: string): Ordering => {
  const left = parseDpkg(a);
  const right = parseDpkg(b);
  if (left.epoch !== right.epoch) return sign(left.epoch - right.epoch);
  const upstream = verrevcmp(left.upstream, right.upstream);
  if (upstream) return sign(upstream);
  return sign(verrevcmp(left.revision, right.revision));
};

// Key alphabet (all printable ASCII, so UTF-8 byte order == JS string order == keyword order):
//   '~'                 -> '!'  sorts before end of run
//   end of run          -> '"'
//   letters             -> themselves
//   '+' '-' '.' ':'     -> '{' '|' '}' '~'  keeps dpkg's ASCII order and sorts after letters
//   digit run           -> length char then the digits (see encodeNumber)
const NON_ALPHA: Readonly<Record<string, string>> = { '+': '{', '-': '|', '.': '}', ':': '~' };
const END = '"';

const encodeRuns = (value: string): string => {
  let out = '';
  let i = 0;
  // Always emit at least one (non-digit run, digit run) pair, so "" encodes the same as "0".
  do {
    while (i < value.length && !isDigit(value[i])) {
      const c = value[i];
      if (c === '~') out += '!';
      else if (isAlpha(c)) out += c;
      else if (NON_ALPHA[c]) out += NON_ALPHA[c];
      else throw new UnencodableVersionError(`unexpected char ${JSON.stringify(c)} in ${value}`);
      i++;
    }
    out += END;
    const start = i;
    while (isDigit(value[i])) i++;
    out += encodeNumber(value.slice(start, i));
  } while (i < value.length);
  return out + END;
};

/** Builds a keyword whose byte order equals dpkg order; throws UnencodableVersionError. */
export const dpkgKey = (raw: string): string => {
  const { epoch, upstream, revision } = parseDpkg(raw);
  if (epoch < 0 || epoch > MAX_EPOCH) {
    throw new UnencodableVersionError(`epoch out of range: ${raw}`);
  }
  return encodeNumber(String(epoch)) + encodeRuns(upstream) + encodeRuns(revision);
};
