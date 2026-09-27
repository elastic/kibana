/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests for the date-math charset allowlist on `start` / `end` in `timeRangeSchemaRequired` and
// `timeRangeSchemaOptional`. Rejection payloads are built with `String.fromCharCode` so editors
// and formatters cannot silently normalise control characters.

import { z } from '@kbn/zod/v4';
import { timeRangeSchemaRequired, timeRangeSchemaOptional } from './tool_schemas';

const requiredSchema = z.object(timeRangeSchemaRequired);
const optionalSchema = z.object(timeRangeSchemaOptional({ start: 'now-1h', end: 'now' }));

const ACCEPTED: string[] = [
  'now',
  'now-1h',
  'now-15m',
  'now-24h',
  'now+1d',
  'now/d',
  'now-1d/d',
  'now-7d/w',
  'now-1M/M',
  'now-1y/y',
  'now-30s',
  'now-500ms',
  '2024-01-01',
  '2024-01-01T00:00:00Z',
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00+05:30',
  '2024-01-01 00:00:00',
  '2024-01-01T00:00:00.000Z||+1M/d',
  '2024-01-01T00:00:00.000Z||-1d',
];

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);
const NUL = String.fromCharCode(0);
const LS = String.fromCharCode(0x2028); // U+2028 LINE SEPARATOR

const REJECTED: Array<[string, string]> = [
  ['LF-injected forged log line', `now-1h${LF}[FATAL][plugins.security] forged`],
  ['CRLF-injected forged log line', `now-1h${CR}${LF}[FATAL][plugins.security] forged`],
  ['NUL byte', `now${NUL}-1h`],
  ['tab character', `now${TAB}-1h`],
  ['U+2028 LINE SEPARATOR', `now-1h${LS}forged`],
  ['.max() overflow', 'n'.repeat(1025)],
];

describe('timeRangeSchemaRequired — date-math charset allowlist', () => {
  describe('accepts all legitimate Elasticsearch date math forms', () => {
    it.each(ACCEPTED)('%s', (value) => {
      const result = requiredSchema.safeParse({ start: value, end: value });
      expect(result.success).toBe(true);
    });
  });

  describe('rejects payloads that would forge server-log lines', () => {
    it.each(REJECTED)('%s', (_label, value) => {
      const result = requiredSchema.safeParse({ start: value, end: value });
      expect(result.success).toBe(false);
    });
  });
});

describe('timeRangeSchemaOptional — date-math charset allowlist', () => {
  it('applies the same allowlist to explicit values', () => {
    const badPayload = `now-1h${LF}forged`;
    expect(optionalSchema.safeParse({ start: badPayload }).success).toBe(false);
  });

  it('applies defaults when start/end are absent', () => {
    const result = optionalSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start).toBe('now-1h');
      expect(result.data.end).toBe('now');
    }
  });

  it('accepts a valid explicit value and does not override it with the default', () => {
    const result = optionalSchema.safeParse({ start: 'now-24h', end: 'now' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start).toBe('now-24h');
    }
  });
});
