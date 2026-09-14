/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * zod twins of `../monitor_management/monitor_types.ts`.
 *
 * Per-type field codecs (HTTP/TCP/ICMP/Browser/…) are **flat** `z.looseObject`s
 * (spread, not `z.intersection` / `.and()`), so:
 *  - plain decode keeps unknown top-level keys (matches `t.intersection`)
 *  - `.strip()` strips unknown top-level keys only, while nested
 *    `looseObject`s keep extras (matches shallow `t.exact`)
 *
 * Wrappers that attach ids / heartbeat fields onto a *union* still use `.and()`
 * — same as io-ts `t.intersection([SyntheticsMonitorCodec, t.type(…)])`. Those
 * shapes are not passed through `.strip()` (Phase 3 exact-decode targets the
 * flat per-type codecs only).
 */

import { z } from '@kbn/zod';
import { ConfigKey } from '../monitor_management/config_key';
import { AlertConfigsCodec } from './alert_config';
import {
  FormMonitorTypeCodec,
  ModeCodec,
  MonitorTypeCodec,
  RequestBodyCheckCodec,
  ResponseBodyIndexPolicyCodec,
  ResponseCheckJSONCodec,
  ScheduleUnitCodec,
  SourceTypeCodec,
  TLSVersionCodec,
  VerificationModeCodec,
} from './monitor_configs';
import { MetadataCodec } from './monitor_meta_data';
import { MonitorServiceLocationCodec } from './locations';
import { PrivateLocationCodec } from './synthetics_private_locations';
import {
  getNonEmptyStringCodec,
  InlineScriptString,
  NameSpaceString,
  NonEmptyString,
  nonEmptyArray,
  TimeoutString,
} from './common';

const ScheduleCodec = z.looseObject({
  number: z.string(),
  unit: ScheduleUnitCodec,
});

const tlsFields = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: z.union([z.string(), z.array(z.string())]).optional(),
  [ConfigKey.TLS_CERTIFICATE]: z.string().optional(),
  [ConfigKey.TLS_VERIFICATION_MODE]: VerificationModeCodec.optional(),
  [ConfigKey.TLS_VERSION]: z.array(TLSVersionCodec).optional(),
};

const tlsSensitiveFields = {
  [ConfigKey.TLS_KEY]: z.string().optional(),
  [ConfigKey.TLS_KEY_PASSPHRASE]: z.string().optional(),
};

export const TLSFieldsCodec = z.looseObject(tlsFields);
export const TLSSensitiveFieldsCodec = z.looseObject(tlsSensitiveFields);
export const TLSCodec = z.looseObject({ ...tlsFields, ...tlsSensitiveFields });

const MonitorLocationsCodec = nonEmptyArray(
  z.union([MonitorServiceLocationCodec, PrivateLocationCodec])
);

const commonRequired = {
  [ConfigKey.NAME]: NonEmptyString,
  [ConfigKey.NAMESPACE]: NameSpaceString,
  [ConfigKey.MONITOR_TYPE]: MonitorTypeCodec,
  [ConfigKey.ENABLED]: z.boolean(),
  [ConfigKey.SCHEDULE]: ScheduleCodec,
  [ConfigKey.APM_SERVICE_NAME]: z.string(),
  [ConfigKey.TAGS]: z.array(z.string()),
  [ConfigKey.LOCATIONS]: MonitorLocationsCodec,
  [ConfigKey.MONITOR_QUERY_ID]: z.string(),
  [ConfigKey.CONFIG_ID]: z.string(),
  [ConfigKey.MAX_ATTEMPTS]: z.number(),
};

const commonOptional = {
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorTypeCodec.optional(),
  [ConfigKey.TIMEOUT]: z.union([TimeoutString, z.null(), z.number()]).optional(),
  [ConfigKey.REVISION]: z.number().optional(),
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceTypeCodec.optional(),
  [ConfigKey.CONFIG_HASH]: z.string().optional(),
  [ConfigKey.JOURNEY_ID]: z.string().optional(),
  [ConfigKey.PROJECT_ID]: z.string().optional(),
  [ConfigKey.ORIGINAL_SPACE]: z.string().optional(),
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: z.string().optional(),
  [ConfigKey.ALERT_CONFIG]: AlertConfigsCodec.optional(),
  [ConfigKey.PARAMS]: z.string().optional(),
  [ConfigKey.LABELS]: z.record(z.string(), z.string()).optional(),
  [ConfigKey.MAINTENANCE_WINDOWS]: z.array(z.string()).optional(),
  [ConfigKey.KIBANA_SPACES]: z.array(z.string()).optional(),
  retest_on_failure: z.boolean().optional(),
};

export const CommonFieldsCodec = z.looseObject({ ...commonRequired, ...commonOptional });

const tcpSimple = {
  [ConfigKey.METADATA]: MetadataCodec,
  [ConfigKey.HOSTS]: getNonEmptyStringCodec('host'),
  [ConfigKey.PORT]: z.union([z.number(), z.null()]),
  [ConfigKey.URLS]: z.string().optional(),
};

const tcpAdvanced = {
  [ConfigKey.PROXY_URL]: z.string(),
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: z.boolean(),
  [ConfigKey.MODE]: ModeCodec.optional(),
  [ConfigKey.IPV4]: z.boolean().optional(),
  [ConfigKey.IPV6]: z.boolean().optional(),
};

const tcpSensitiveAdvanced = {
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: z.string(),
  [ConfigKey.REQUEST_SEND_CHECK]: z.string(),
};

export const TCPSimpleFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...tcpSimple,
});

export const TCPAdvancedFieldsCodec = z.looseObject(tcpAdvanced);
export const TCPSensitiveAdvancedFieldsCodec = z.looseObject(tcpSensitiveAdvanced);
export const TCPAdvancedCodec = z.looseObject({ ...tcpAdvanced, ...tcpSensitiveAdvanced });

export const EncryptedTCPFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...tcpSimple,
  ...tcpAdvanced,
  ...tlsFields,
});

export const TCPFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...tcpSimple,
  ...tcpAdvanced,
  ...tcpSensitiveAdvanced,
  ...tlsFields,
  ...tlsSensitiveFields,
});

const icmpSimple = {
  [ConfigKey.HOSTS]: NonEmptyString,
  [ConfigKey.WAIT]: z.string(),
};

const icmpAdvanced = {
  [ConfigKey.MODE]: ModeCodec.optional(),
  [ConfigKey.IPV4]: z.boolean().optional(),
  [ConfigKey.IPV6]: z.boolean().optional(),
};

export const ICMPSimpleFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...icmpSimple,
});

export const ICMPAdvancedFieldsCodec = z.looseObject(icmpAdvanced);

export const ICMPFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...icmpSimple,
  ...icmpAdvanced,
});

const httpSimple = {
  [ConfigKey.METADATA]: MetadataCodec,
  [ConfigKey.MAX_REDIRECTS]: z.union([z.string(), z.number()]),
  [ConfigKey.URLS]: getNonEmptyStringCodec('url'),
  [ConfigKey.PORT]: z.union([z.number(), z.null()]),
};

const httpAdvanced = {
  [ConfigKey.PROXY_URL]: z.string(),
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicyCodec,
  [ConfigKey.RESPONSE_HEADERS_INDEX]: z.boolean(),
  [ConfigKey.RESPONSE_STATUS_CHECK]: z.array(z.string()),
  [ConfigKey.REQUEST_METHOD_CHECK]: z.string(),
  [ConfigKey.MODE]: ModeCodec.optional(),
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: z.string().optional(),
  [ConfigKey.IPV4]: z.boolean().optional(),
  [ConfigKey.IPV6]: z.boolean().optional(),
};

const httpSensitiveAdvanced = {
  [ConfigKey.PASSWORD]: z.string(),
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: z.array(z.string()),
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: z.array(z.string()),
  [ConfigKey.RESPONSE_HEADERS_CHECK]: z.record(z.string(), z.string()),
  [ConfigKey.REQUEST_BODY_CHECK]: RequestBodyCheckCodec,
  [ConfigKey.REQUEST_HEADERS_CHECK]: z.record(z.string(), z.string()),
  [ConfigKey.USERNAME]: z.string(),
  [ConfigKey.PROXY_HEADERS]: z.record(z.string(), z.string()).optional(),
  [ConfigKey.RESPONSE_JSON_CHECK]: z.array(ResponseCheckJSONCodec).optional(),
};

export const HTTPSimpleFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...httpSimple,
});

export const HTTPAdvancedFieldsCodec = z.looseObject(httpAdvanced);
export const HTTPSensitiveAdvancedFieldsCodec = z.looseObject(httpSensitiveAdvanced);
export const HTTPAdvancedCodec = z.looseObject({ ...httpAdvanced, ...httpSensitiveAdvanced });

export const EncryptedHTTPFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...httpSimple,
  ...httpAdvanced,
  ...tlsFields,
});

export const HTTPFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...httpSimple,
  ...httpAdvanced,
  ...httpSensitiveAdvanced,
  ...tlsFields,
  ...tlsSensitiveFields,
});

const ThrottlingConfigValueCodec = z.looseObject({
  download: z.string(),
  upload: z.string(),
  latency: z.string(),
});

export const ThrottlingConfigCodec = z.looseObject({
  value: z.union([ThrottlingConfigValueCodec, z.null()]),
  label: z.string(),
  id: z.string(),
});

const browserEncryptedSimple = {
  [ConfigKey.METADATA]: MetadataCodec,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: z.string().optional(),
  [ConfigKey.TEXT_ASSERTION]: z.string().optional(),
};

const browserSensitiveSimple = {
  [ConfigKey.SOURCE_INLINE]: InlineScriptString,
  [ConfigKey.SOURCE_PROJECT_CONTENT]: z.string(),
  [ConfigKey.URLS]: z.union([z.string(), z.null()]),
  [ConfigKey.PORT]: z.union([z.number(), z.null()]),
};

const browserEncryptedAdvanced = {
  [ConfigKey.SCREENSHOTS]: z.string(),
  [ConfigKey.JOURNEY_FILTERS_MATCH]: z.string(),
  [ConfigKey.JOURNEY_FILTERS_TAGS]: z.array(z.string()),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: z.boolean(),
  [ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST]: z.array(z.string()),
  [ConfigKey.THROTTLING_CONFIG]: ThrottlingConfigCodec,
};

const browserSensitiveAdvanced = {
  [ConfigKey.SYNTHETICS_ARGS]: z.array(z.string()),
};

export const EncryptedBrowserSimpleFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...browserEncryptedSimple,
});

export const BrowserSensitiveSimpleFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...browserSensitiveSimple,
});

export const EncryptedBrowserAdvancedFieldsCodec = z.looseObject(browserEncryptedAdvanced);
export const BrowserSensitiveAdvancedFieldsCodec = z.looseObject(browserSensitiveAdvanced);

export const BrowserSimpleFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...browserEncryptedSimple,
  ...browserSensitiveSimple,
});

export const BrowserAdvancedFieldsCodec = z.looseObject({
  ...browserEncryptedAdvanced,
  ...browserSensitiveAdvanced,
});

export const EncryptedBrowserFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...browserEncryptedSimple,
  ...browserEncryptedAdvanced,
  ...tlsFields,
});

export const BrowserFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...browserEncryptedSimple,
  ...browserSensitiveSimple,
  ...browserEncryptedAdvanced,
  ...browserSensitiveAdvanced,
  ...tlsFields,
  ...tlsSensitiveFields,
});

export const MonitorFieldsCodec = z.looseObject({
  ...commonRequired,
  ...commonOptional,
  ...httpSimple,
  ...httpAdvanced,
  ...httpSensitiveAdvanced,
  ...tcpSimple,
  ...tcpAdvanced,
  ...tcpSensitiveAdvanced,
  ...icmpSimple,
  ...browserEncryptedSimple,
  ...browserSensitiveSimple,
  ...browserEncryptedAdvanced,
  ...browserSensitiveAdvanced,
  ...tlsFields,
  ...tlsSensitiveFields,
});

export const MonitorFieldsResultCodec = MonitorFieldsCodec.extend({
  id: z.string(),
  updated_at: z.string(),
  created_at: z.string(),
});

export const SyntheticsMonitorCodec = z.union([
  HTTPFieldsCodec,
  TCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  BrowserFieldsCodec,
]);

export const EncryptedSyntheticsMonitorCodec = z.union([
  EncryptedHTTPFieldsCodec,
  EncryptedTCPFieldsCodec,
  ICMPSimpleFieldsCodec,
  EncryptedBrowserFieldsCodec,
]);

export const SyntheticsMonitorWithIdCodec = SyntheticsMonitorCodec.and(
  z.looseObject({
    id: z.string(),
    updated_at: z.string(),
    created_at: z.string(),
    spaces: z.array(z.string()).optional(),
    spaceId: z.string().optional(),
    revision: z.number().optional(),
  })
);

const HeartbeatFieldsCodec = z.looseObject({
  config_id: z.string(),
  run_once: z.boolean().optional(),
  test_run_id: z.string().optional(),
  'monitor.project.name': z.string().optional(),
  'monitor.id': z.string().optional(),
  'monitor.project.id': z.string().optional(),
  'monitor.fleet_managed': z.boolean().optional(),
  'monitor.interval': z.number().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  kibanaUrl: z.string().optional(),
});

export const HeartbeatConfigCodec = SyntheticsMonitorCodec.and(
  z.looseObject({
    id: z.string(),
    fields_under_root: z.boolean().optional(),
    fields: HeartbeatFieldsCodec.optional(),
  })
);

export const EncryptedSyntheticsSavedMonitorCodec = EncryptedSyntheticsMonitorCodec.and(
  z.looseObject({
    id: z.string(),
    updated_at: z.string(),
    created_at: z.string(),
  })
);
