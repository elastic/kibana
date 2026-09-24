/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Accept/reject coverage for the per-type monitor field codecs, driven by
 * fully-populated fixtures so every field of every type is exercised.
 *
 * Pins:
 *  - which fields are required vs optional (an exhaustive, auto-derived list)
 *  - field-level type rules, including the hand-written codecs
 *  - unknown-key handling: plain decode keeps extras; `.strip()` removes
 *    top-level extras only (nested looseObject extras stay)
 */

import type { z } from '@kbn/zod';
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
  codec: z.ZodType;
  exactCodec: z.ZodType;
  valid: MonitorFixture;
  requiredKeys: string[];
  violations: Array<[string, unknown]>;
}

type LooseObjectSchema = z.ZodObject<z.ZodRawShape> & { strip: () => z.ZodType };

const fieldsCase = (
  label: string,
  codec: LooseObjectSchema,
  valid: MonitorFixture,
  typeRequiredKeys: string[],
  typeViolations: Array<[string, unknown]>
): FieldsCase => ({
  label,
  codec,
  // Flat looseObject + .strip(): top-level extras go, nested looseObject extras stay.
  exactCodec: codec.strip(),
  valid,
  requiredKeys: [...COMMON_REQUIRED_KEYS, ...typeRequiredKeys].sort(),
  violations: [...commonFieldTypeViolations, ...typeViolations],
});

const httpRequired = [
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
];
const httpViolations: Array<[string, unknown]> = [
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
];

const tcpRequired = [
  ConfigKey.METADATA,
  ConfigKey.HOSTS,
  ConfigKey.PORT,
  ConfigKey.PROXY_URL,
  ConfigKey.PROXY_USE_LOCAL_RESOLVER,
  ConfigKey.RESPONSE_RECEIVE_CHECK,
  ConfigKey.REQUEST_SEND_CHECK,
];
const tcpViolations: Array<[string, unknown]> = [
  [ConfigKey.HOSTS, ''],
  [ConfigKey.HOSTS, '   '],
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER, 'true'],
  [ConfigKey.RESPONSE_RECEIVE_CHECK, 42],
  [ConfigKey.PORT, '9200'],
];

const icmpRequired = [ConfigKey.HOSTS, ConfigKey.WAIT];
const icmpViolations: Array<[string, unknown]> = [
  [ConfigKey.HOSTS, ''],
  [ConfigKey.WAIT, 2],
  [ConfigKey.MODE, 'fast'],
];

const browserRequired = [
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
];
const browserViolations: Array<[string, unknown]> = [
  [ConfigKey.SOURCE_INLINE, 'journey("full journey", () => {})'],
  [ConfigKey.SOURCE_INLINE, 'console.log("no step definition")'],
  [ConfigKey.THROTTLING_CONFIG, { value: { download: '5' }, label: 'l', id: 'i' }],
  [ConfigKey.SYNTHETICS_ARGS, '--no-sandbox'],
  [ConfigKey.IGNORE_HTTPS_ERRORS, 'false'],
  [ConfigKey.SCREENSHOTS, 42],
];

const cases: FieldsCase[] = [
  fieldsCase(
    'HTTPFieldsCodec',
    HTTPFieldsCodec as LooseObjectSchema,
    fullHttpMonitor(),
    httpRequired,
    httpViolations
  ),
  fieldsCase(
    'TCPFieldsCodec',
    TCPFieldsCodec as LooseObjectSchema,
    fullTcpMonitor(),
    tcpRequired,
    tcpViolations
  ),
  fieldsCase(
    'ICMPFieldsCodec',
    ICMPFieldsCodec as LooseObjectSchema,
    fullIcmpMonitor(),
    icmpRequired,
    icmpViolations
  ),
  fieldsCase(
    'BrowserFieldsCodec',
    BrowserFieldsCodec as LooseObjectSchema,
    fullBrowserMonitor(),
    browserRequired,
    browserViolations
  ),
];

describe.each(cases)(
  '$label',
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
 * a full monitor through `.strip()` of one drops the secret-bearing fields.
 * These lists pin exactly which secrets must not survive into the encrypted form.
 */
describe.each([
  {
    label: 'EncryptedHTTPFieldsCodec',
    exactCodec: (EncryptedHTTPFieldsCodec as LooseObjectSchema).strip(),
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
    exactCodec: (EncryptedTCPFieldsCodec as LooseObjectSchema).strip(),
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
    exactCodec: (EncryptedBrowserFieldsCodec as LooseObjectSchema).strip(),
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
])('$label secret stripping', ({ exactCodec, valid, strippedKeys }) => {
  it('strips exactly the sensitive fields through the exact codec', () => {
    const result = decode(exactCodec, valid);
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

describe('SyntheticsMonitorCodec union', () => {
  const codec = SyntheticsMonitorCodec;
  it.each([
    ['http', fullHttpMonitor()],
    ['tcp', fullTcpMonitor()],
    ['icmp', fullIcmpMonitor()],
    ['browser', fullBrowserMonitor()],
  ])('accepts a fully-populated %s monitor', (_type, valid) => {
    expect(decode(codec, valid).success).toBe(true);
  });

  it('rejects an object that matches no monitor variant', () => {
    expect(decode(codec, { type: 'not-a-monitor' }).success).toBe(false);
  });
});
