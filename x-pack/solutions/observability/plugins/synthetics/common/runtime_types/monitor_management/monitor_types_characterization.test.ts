/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests pinning the current io-ts behavior of the per-type
 * monitor field codecs before the zod migration, driven by fully-populated
 * fixtures so every field of every type is exercised.
 *
 * The behaviors most at risk in the migration, and therefore pinned here:
 *  - which fields are required vs optional (an exhaustive, auto-derived list)
 *  - field-level type rules, including the hand-written codecs
 *  - unknown-key handling: a plain decode keeps extra keys, `t.exact(...)` (used
 *    by `validateMonitor`) strips them at the top level only, and nested extras
 *    survive even through `t.exact`. zod strips recursively at every
 *    `ZodObject` and does not strip through `z.intersection` at all, so all
 *    three of these have to be reproduced deliberately.
 */

import * as t from 'io-ts';
import { omit } from 'lodash';
import { decode } from '../test_helpers/codec_agnostic';
import {
  commonFieldTypeViolations,
  fullBrowserMonitor,
  fullHttpMonitor,
  fullIcmpMonitor,
  fullTcpMonitor,
  type MonitorFixture,
} from '../test_helpers/monitor_fixtures';
import { ConfigKey } from './config_key';
import {
  BrowserFieldsCodec,
  EncryptedBrowserFieldsCodec,
  EncryptedHTTPFieldsCodec,
  EncryptedTCPFieldsCodec,
  HTTPFieldsCodec,
  ICMPFieldsCodec,
  SyntheticsMonitorCodec,
  TCPFieldsCodec,
} from './monitor_types';

const COMMON_REQUIRED_KEYS = [
  ConfigKey.APM_SERVICE_NAME,
  ConfigKey.CONFIG_ID,
  ConfigKey.ENABLED,
  ConfigKey.LOCATIONS,
  ConfigKey.MAX_ATTEMPTS,
  ConfigKey.MONITOR_QUERY_ID,
  ConfigKey.MONITOR_TYPE,
  ConfigKey.NAME,
  ConfigKey.NAMESPACE,
  ConfigKey.SCHEDULE,
  ConfigKey.TAGS,
];

interface FieldsCase {
  label: string;
  flavor: 'io-ts' | 'zod';
  codec: t.Mixed;
  exactCodec: t.Mixed;
  valid: MonitorFixture;
  requiredKeys: string[];
  violations: Array<[string, unknown]>;
}

// Only the io-ts flavor exists today; the migration PR appends the zod twins
// (same fixtures, same expectations) so both run against this table.
const ioTsCase = (
  label: string,
  codec: t.HasProps & t.Mixed,
  valid: MonitorFixture,
  typeRequiredKeys: string[],
  typeViolations: Array<[string, unknown]>
): FieldsCase => ({
  label,
  flavor: 'io-ts',
  codec,
  exactCodec: t.exact(codec),
  valid,
  requiredKeys: [...COMMON_REQUIRED_KEYS, ...typeRequiredKeys].sort(),
  violations: [...commonFieldTypeViolations, ...typeViolations],
});

const cases: FieldsCase[] = [
  ioTsCase(
    'HTTPFieldsCodec',
    HTTPFieldsCodec,
    fullHttpMonitor(),
    [
      ConfigKey.METADATA,
      ConfigKey.MAX_REDIRECTS,
      ConfigKey.URLS,
      ConfigKey.PORT,
      ConfigKey.PROXY_URL,
      ConfigKey.RESPONSE_BODY_INDEX,
      ConfigKey.RESPONSE_HEADERS_INDEX,
      ConfigKey.RESPONSE_STATUS_CHECK,
      ConfigKey.REQUEST_METHOD_CHECK,
      ConfigKey.PASSWORD,
      ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
      ConfigKey.RESPONSE_BODY_CHECK_POSITIVE,
      ConfigKey.RESPONSE_HEADERS_CHECK,
      ConfigKey.REQUEST_BODY_CHECK,
      ConfigKey.REQUEST_HEADERS_CHECK,
      ConfigKey.USERNAME,
    ],
    [
      [ConfigKey.URLS, ''],
      [ConfigKey.URLS, 42],
      [ConfigKey.MAX_REDIRECTS, true],
      [ConfigKey.PORT, '443'],
      [ConfigKey.RESPONSE_BODY_INDEX, 'sometimes'],
      [ConfigKey.RESPONSE_STATUS_CHECK, '200'],
      [ConfigKey.RESPONSE_HEADERS_CHECK, { 'content-type': 1 }],
      [ConfigKey.REQUEST_BODY_CHECK, { value: 'x', type: 'yaml' }],
      [ConfigKey.RESPONSE_JSON_CHECK, [{ description: 'missing expression' }]],
      [ConfigKey.TLS_VERSION, ['TLSv0.9']],
      [ConfigKey.TLS_VERIFICATION_MODE, 'lenient'],
    ]
  ),
  ioTsCase(
    'TCPFieldsCodec',
    TCPFieldsCodec,
    fullTcpMonitor(),
    [
      ConfigKey.METADATA,
      ConfigKey.HOSTS,
      ConfigKey.PORT,
      ConfigKey.PROXY_URL,
      ConfigKey.PROXY_USE_LOCAL_RESOLVER,
      ConfigKey.RESPONSE_RECEIVE_CHECK,
      ConfigKey.REQUEST_SEND_CHECK,
    ],
    [
      [ConfigKey.HOSTS, ''],
      [ConfigKey.HOSTS, '   '],
      [ConfigKey.PROXY_USE_LOCAL_RESOLVER, 'true'],
      [ConfigKey.RESPONSE_RECEIVE_CHECK, 42],
      [ConfigKey.PORT, '9200'],
    ]
  ),
  ioTsCase(
    'ICMPFieldsCodec',
    ICMPFieldsCodec,
    fullIcmpMonitor(),
    [ConfigKey.HOSTS, ConfigKey.WAIT],
    [
      [ConfigKey.HOSTS, ''],
      [ConfigKey.WAIT, 2],
      [ConfigKey.MODE, 'fast'],
    ]
  ),
  ioTsCase(
    'BrowserFieldsCodec',
    BrowserFieldsCodec,
    fullBrowserMonitor(),
    [
      ConfigKey.METADATA,
      ConfigKey.SOURCE_INLINE,
      ConfigKey.SOURCE_PROJECT_CONTENT,
      ConfigKey.URLS,
      ConfigKey.PORT,
      ConfigKey.SCREENSHOTS,
      ConfigKey.JOURNEY_FILTERS_MATCH,
      ConfigKey.JOURNEY_FILTERS_TAGS,
      ConfigKey.IGNORE_HTTPS_ERRORS,
      ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST,
      ConfigKey.THROTTLING_CONFIG,
      ConfigKey.SYNTHETICS_ARGS,
    ],
    [
      [ConfigKey.SOURCE_INLINE, 'journey("full journey", () => {})'],
      [ConfigKey.SOURCE_INLINE, 'console.log("no step definition")'],
      [ConfigKey.THROTTLING_CONFIG, { value: { download: '5' }, label: 'l', id: 'i' }],
      [ConfigKey.SYNTHETICS_ARGS, '--no-sandbox'],
      [ConfigKey.IGNORE_HTTPS_ERRORS, 'false'],
      [ConfigKey.SCREENSHOTS, 42],
    ]
  ),
];

describe.each(cases)(
  '$label ($flavor)',
  ({ codec, exactCodec, valid, requiredKeys, violations }) => {
    it('decodes a fully-populated monitor of its type', () => {
      expect(decode(codec, valid).success).toBe(true);
    });

    it('preserves every field value through decode', () => {
      const result = decode(codec, valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(valid);
      }
    });

    it('retains every known field through the exact codec', () => {
      const result = decode(exactCodec, valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(valid);
      }
    });

    it('pins exactly which fields are required', () => {
      const actual = Object.keys(valid)
        .filter((key) => !decode(codec, omit(valid, key)).success)
        .sort();
      expect(actual).toEqual(requiredKeys);
    });

    it('accepts a payload with every optional field removed', () => {
      const minimal = Object.fromEntries(
        Object.entries(valid).filter(([key]) => requiredKeys.includes(key))
      );
      expect(decode(codec, minimal).success).toBe(true);
    });

    it.each(violations)('rejects %s = %p', (key, badValue) => {
      expect(decode(codec, { ...valid, [key]: badValue }).success).toBe(false);
    });

    it('keeps unknown top-level keys on a plain decode', () => {
      const result = decode(codec, { ...valid, someUnknownKey: 'kept' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveProperty('someUnknownKey');
      }
    });

    it('strips unknown top-level keys through the exact codec', () => {
      const result = decode(exactCodec, { ...valid, someUnknownKey: 'stripped' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).not.toHaveProperty('someUnknownKey');
      }
    });

    it('keeps unknown nested keys even through the exact codec', () => {
      const nested = {
        ...valid,
        [ConfigKey.SCHEDULE]: {
          ...(valid[ConfigKey.SCHEDULE] as Record<string, unknown>),
          unknownNested: 'kept',
        },
      };
      const result = decode(exactCodec, nested);
      expect(result.success).toBe(true);
      if (result.success) {
        const schedule = (result.value as Record<string, unknown>)[ConfigKey.SCHEDULE];
        expect(schedule).toHaveProperty('unknownNested');
      }
    });
  }
);

/**
 * The `Encrypted*` codecs are the shape persisted on the saved object: running
 * a full monitor through `t.exact(...)` of one drops the secret-bearing fields.
 * A `z.intersection` port would not strip at all, so these lists pin exactly
 * which secrets must not survive into the encrypted form.
 */
describe.each([
  {
    label: 'EncryptedHTTPFieldsCodec',
    codec: EncryptedHTTPFieldsCodec,
    valid: fullHttpMonitor(),
    strippedKeys: [
      ConfigKey.PASSWORD,
      ConfigKey.PROXY_HEADERS,
      ConfigKey.REQUEST_BODY_CHECK,
      ConfigKey.REQUEST_HEADERS_CHECK,
      ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
      ConfigKey.RESPONSE_BODY_CHECK_POSITIVE,
      ConfigKey.RESPONSE_HEADERS_CHECK,
      ConfigKey.RESPONSE_JSON_CHECK,
      ConfigKey.TLS_KEY,
      ConfigKey.TLS_KEY_PASSPHRASE,
      ConfigKey.USERNAME,
    ],
  },
  {
    label: 'EncryptedTCPFieldsCodec',
    codec: EncryptedTCPFieldsCodec,
    valid: fullTcpMonitor(),
    strippedKeys: [
      ConfigKey.REQUEST_SEND_CHECK,
      ConfigKey.RESPONSE_RECEIVE_CHECK,
      ConfigKey.TLS_KEY,
      ConfigKey.TLS_KEY_PASSPHRASE,
    ],
  },
  {
    label: 'EncryptedBrowserFieldsCodec',
    codec: EncryptedBrowserFieldsCodec,
    valid: fullBrowserMonitor(),
    strippedKeys: [
      ConfigKey.PORT,
      ConfigKey.SOURCE_INLINE,
      ConfigKey.SOURCE_PROJECT_CONTENT,
      ConfigKey.SYNTHETICS_ARGS,
      ConfigKey.TLS_KEY,
      ConfigKey.TLS_KEY_PASSPHRASE,
      ConfigKey.URLS,
    ],
  },
])('$label secret stripping (io-ts)', ({ codec, valid, strippedKeys }) => {
  it('strips exactly the sensitive fields through the exact codec', () => {
    const result = decode(t.exact(codec), valid);
    expect(result.success).toBe(true);
    if (result.success) {
      const decoded = result.value as Record<string, unknown>;
      const removed = Object.keys(valid)
        .filter((key) => !(key in decoded))
        .sort();
      expect(removed).toEqual([...strippedKeys].sort());
    }
  });
});

describe('SyntheticsMonitorCodec union (io-ts)', () => {
  it.each([
    ['http', fullHttpMonitor()],
    ['tcp', fullTcpMonitor()],
    ['icmp', fullIcmpMonitor()],
    ['browser', fullBrowserMonitor()],
  ])('accepts a fully-populated %s monitor', (_type, valid) => {
    expect(decode(SyntheticsMonitorCodec, valid).success).toBe(true);
  });

  it('rejects an object that matches no monitor variant', () => {
    expect(decode(SyntheticsMonitorCodec, { type: 'not-a-monitor' }).success).toBe(false);
  });
});
