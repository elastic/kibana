/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests pinning the current io-ts behavior of the per-type
 * monitor field codecs before the zod migration. The highest-risk behavior to
 * preserve is unknown-key handling: a plain decode keeps extra keys, while the
 * `t.exact(...)` wrapper used by `validateMonitor` strips them. The zod twins
 * must reproduce both — `.strip()` only works on a flat `ZodObject`, never on a
 * `z.intersection`, so this is the trap the migration has to clear.
 */

import * as t from 'io-ts';
import { DEFAULT_FIELDS } from '../../constants/monitor_defaults';
import { ConfigKey } from './config_key';
import { MonitorTypeEnum } from './monitor_configs';
import { decode } from '../test_helpers/codec_agnostic';
import {
  BrowserFieldsCodec,
  HTTPFieldsCodec,
  ICMPFieldsCodec,
  SyntheticsMonitorCodec,
  TCPFieldsCodec,
} from './monitor_types';

// Minimal location accepted by `MonitorServiceLocationCodec` (id + label).
const validLocation = { id: 'us_central', label: 'US Central' };

const withRequiredCommon = (base: Record<string, unknown>, overrides: Record<string, unknown>) => ({
  ...base,
  [ConfigKey.NAME]: 'test-monitor',
  [ConfigKey.LOCATIONS]: [validLocation],
  ...overrides,
});

const validHttp = withRequiredCommon(DEFAULT_FIELDS[MonitorTypeEnum.HTTP], {
  [ConfigKey.URLS]: 'https://elastic.co',
});
const validTcp = withRequiredCommon(DEFAULT_FIELDS[MonitorTypeEnum.TCP], {
  [ConfigKey.HOSTS]: 'localhost:5601',
});
const validIcmp = withRequiredCommon(DEFAULT_FIELDS[MonitorTypeEnum.ICMP], {
  [ConfigKey.HOSTS]: 'localhost',
});
const validBrowser = withRequiredCommon(DEFAULT_FIELDS[MonitorTypeEnum.BROWSER], {
  [ConfigKey.SOURCE_INLINE]: 'step("load homepage", async () => {})',
});

interface FieldsCase {
  label: string;
  flavor: 'io-ts' | 'zod';
  codec: t.Mixed;
  exactCodec: t.Mixed;
  valid: Record<string, unknown>;
}

// Only the io-ts flavor exists today; the migration PR appends the zod twins
// (same `valid` fixtures) so the identical expectations run against both.
const ioTsCase = (
  label: string,
  codec: t.HasProps & t.Mixed,
  valid: Record<string, unknown>
): FieldsCase => ({ label, flavor: 'io-ts', codec, exactCodec: t.exact(codec), valid });

const cases: FieldsCase[] = [
  ioTsCase('HTTPFieldsCodec', HTTPFieldsCodec, validHttp),
  ioTsCase('TCPFieldsCodec', TCPFieldsCodec, validTcp),
  ioTsCase('ICMPFieldsCodec', ICMPFieldsCodec, validIcmp),
  ioTsCase('BrowserFieldsCodec', BrowserFieldsCodec, validBrowser),
];

describe.each(cases)('$label ($flavor)', ({ codec, exactCodec, valid }) => {
  it('decodes a valid monitor of its type', () => {
    expect(decode(codec, valid).success).toBe(true);
  });

  it('keeps unknown keys on a plain (non-exact) decode', () => {
    const result = decode(codec, { ...valid, someUnknownKey: 'kept' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toHaveProperty('someUnknownKey');
    }
  });

  it('strips unknown keys through the exact codec used by validateMonitor', () => {
    const result = decode(exactCodec, { ...valid, someUnknownKey: 'stripped' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).not.toHaveProperty('someUnknownKey');
    }
  });

  it('rejects a payload missing the required name', () => {
    const withoutName = { ...valid };
    delete withoutName[ConfigKey.NAME];
    expect(decode(codec, withoutName).success).toBe(false);
  });

  it('rejects a payload with a wrong-typed enabled flag', () => {
    expect(decode(codec, { ...valid, [ConfigKey.ENABLED]: 'yes' }).success).toBe(false);
  });
});

describe('SyntheticsMonitorCodec union (io-ts)', () => {
  it.each([
    ['http', validHttp],
    ['tcp', validTcp],
    ['icmp', validIcmp],
    ['browser', validBrowser],
  ])('accepts a valid %s monitor', (_type, valid) => {
    expect(decode(SyntheticsMonitorCodec, valid).success).toBe(true);
  });

  it('rejects an object that matches no monitor variant', () => {
    expect(decode(SyntheticsMonitorCodec, { type: 'not-a-monitor' }).success).toBe(false);
  });
});
