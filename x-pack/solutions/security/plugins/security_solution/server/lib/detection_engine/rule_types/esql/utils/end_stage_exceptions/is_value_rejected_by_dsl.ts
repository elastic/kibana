/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from 'net';

const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const SPECIAL_NUMBER_PATTERN = /^[+-]?(NaN|Infinity)$/;
const NUMERIC_TYPES: ReadonlySet<string> = new Set(['integer', 'long', 'unsigned_long', 'double']);

const isIpOrCidr = (value: string): boolean => {
  const [address, prefix, ...rest] = value.split('/');
  const version = isIP(address);
  if (version === 0 || rest.length > 0) {
    return false;
  }
  if (prefix === undefined) {
    return true;
  }
  return /^\+?\d+$/.test(prefix) && Number(prefix) <= (version === 4 ? 32 : 128);
};

/**
 * Whether the DSL filter of an exception fails the request when `value` is compared with a field of `type`,
 * as Elasticsearch does for `'bogus' is not an IP string literal`. The check answers "yes" only when the DSL
 * is certain to fail, so a rule is never failed for a value that the DSL accepts. The values were
 * compared with a `match_phrase` query on a field of each type:
 *
 * - `ip`: fails unless the value is an address or a CIDR with a valid prefix.
 * - `integer`, `long`, `unsigned_long`, `double`: fail unless the value reads as a number. A value that is
 *   out of range, has a fraction or an exponent, or is `NaN` or `Infinity` is not treated as a failure. A
 *   hexadecimal value fails.
 * - `boolean`: fails unless the value is `true` or `false` in lowercase.
 * - `version` accepts any string, and `date` and `date_nanos` accept the formats of the mapping, which the
 *   executor does not know, so they never fail here.
 */
export const isValueRejectedByDsl = (value: string, type: string): boolean => {
  if (type === 'ip') {
    return !isIpOrCidr(value);
  }
  if (type === 'boolean') {
    return value !== 'true' && value !== 'false';
  }
  if (NUMERIC_TYPES.has(type)) {
    const trimmed = value.trim();
    // `NaN` and `Infinity` are accepted by a double field, and not checked for the others. A hexadecimal
    // value (`0x10`) fails on every numeric type.
    return !NUMBER_PATTERN.test(trimmed) && !SPECIAL_NUMBER_PATTERN.test(trimmed);
  }
  return false;
};
