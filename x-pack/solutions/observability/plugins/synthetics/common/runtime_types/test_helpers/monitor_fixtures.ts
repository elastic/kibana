/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fully-populated monitor payloads used by the characterization tests.
 *
 * Every field of every monitor type is set to a distinctive, non-default value
 * so a decode round-trip proves each field is both accepted and preserved. The
 * fixtures are written out explicitly rather than spread from `DEFAULT_FIELDS`
 * so that a field disappearing from a codec shows up as a test failure instead
 * of silently passing.
 */

import { ConfigKey } from '../monitor_management/config_key';
import {
  CodeEditorMode,
  FormMonitorType,
  HTTPMethod,
  Mode,
  MonitorTypeEnum,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  ScreenshotOption,
  SourceType,
  TLSVersion,
  VerificationMode,
} from '../monitor_management/monitor_configs';

export type MonitorFixture = Record<string, unknown>;

/** Elastic-managed location — matches `MonitorServiceLocationCodec`. */
export const publicLocationFixture = {
  id: 'us_central',
  label: 'US Central',
  geo: { lat: 41.25, lon: -95.86 },
  url: 'https://us-central.synthetics.elastic.dev',
  isServiceManaged: true,
  status: 'ga',
};

/** Private location — matches `PrivateLocationCodec`. */
export const privateLocationFixture = {
  id: 'private-loc-1',
  label: 'Private Location',
  agentPolicyId: 'agent-policy-1',
  isServiceManaged: false,
  tags: ['private'],
  geo: { lat: 52.52, lon: 13.4 },
  namespace: 'fixture_namespace',
  spaces: ['default'],
  isAgentSharding: true,
};

const metadataFixture = {
  is_tls_enabled: true,
  script_source: { is_generated_script: false, file_name: 'journey.ts' },
};

const tlsFields = {
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: [
    '-----BEGIN CERTIFICATE-----ca-----END CERTIFICATE-----',
  ],
  [ConfigKey.TLS_CERTIFICATE]: '-----BEGIN CERTIFICATE-----cert-----END CERTIFICATE-----',
  [ConfigKey.TLS_VERIFICATION_MODE]: VerificationMode.FULL,
  [ConfigKey.TLS_VERSION]: [TLSVersion.ONE_TWO, TLSVersion.ONE_THREE],
  [ConfigKey.TLS_KEY]: '-----BEGIN PRIVATE KEY-----key-----END PRIVATE KEY-----',
  [ConfigKey.TLS_KEY_PASSPHRASE]: 'fixture-passphrase',
};

/** Every field of `CommonFieldsCodec`, required and optional. */
const commonFields = {
  [ConfigKey.NAME]: 'Full fixture monitor',
  [ConfigKey.NAMESPACE]: 'fixture_namespace',
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.APM_SERVICE_NAME]: 'fixture-service',
  [ConfigKey.TAGS]: ['tag-one', 'tag-two'],
  [ConfigKey.LOCATIONS]: [publicLocationFixture, privateLocationFixture],
  [ConfigKey.MONITOR_QUERY_ID]: 'fixture-query-id',
  [ConfigKey.CONFIG_ID]: 'fixture-config-id',
  [ConfigKey.MAX_ATTEMPTS]: 3,
  [ConfigKey.TIMEOUT]: '30',
  [ConfigKey.REVISION]: 4,
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
  [ConfigKey.CONFIG_HASH]: 'fixture-hash',
  [ConfigKey.JOURNEY_ID]: 'fixture-journey',
  [ConfigKey.PROJECT_ID]: 'fixture-project',
  [ConfigKey.ORIGINAL_SPACE]: 'default',
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: 'fixture-heartbeat-id',
  [ConfigKey.ALERT_CONFIG]: {
    status: { enabled: true, groupBy: 'locationId' },
    tls: { enabled: false },
  },
  [ConfigKey.PARAMS]: '{"token":"fixture"}',
  [ConfigKey.LABELS]: { env: 'test', team: 'obs' },
  [ConfigKey.MAINTENANCE_WINDOWS]: ['mw-1', 'mw-2'],
  [ConfigKey.KIBANA_SPACES]: ['default'],
  retest_on_failure: true,
};

export const fullHttpMonitor = (): MonitorFixture => ({
  ...commonFields,
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
  [ConfigKey.METADATA]: metadataFixture,
  [ConfigKey.MAX_REDIRECTS]: '3',
  [ConfigKey.URLS]: 'https://www.elastic.co/health',
  [ConfigKey.PORT]: 443,
  [ConfigKey.PROXY_URL]: 'http://proxy.internal:3128',
  [ConfigKey.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy.ON_ERROR,
  [ConfigKey.RESPONSE_HEADERS_INDEX]: true,
  [ConfigKey.RESPONSE_STATUS_CHECK]: ['200', '201'],
  [ConfigKey.REQUEST_METHOD_CHECK]: HTTPMethod.POST,
  [ConfigKey.MODE]: Mode.ALL,
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: '2048',
  [ConfigKey.IPV4]: true,
  [ConfigKey.IPV6]: false,
  [ConfigKey.PASSWORD]: 'fixture-password',
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: ['unexpected error'],
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: ['status: ok'],
  [ConfigKey.RESPONSE_HEADERS_CHECK]: { 'content-type': 'application/json' },
  [ConfigKey.REQUEST_BODY_CHECK]: { value: '{"ping":true}', type: CodeEditorMode.JSON },
  [ConfigKey.REQUEST_HEADERS_CHECK]: { 'x-fixture': 'yes' },
  [ConfigKey.USERNAME]: 'fixture-user',
  [ConfigKey.PROXY_HEADERS]: { 'x-proxy-fixture': 'yes' },
  [ConfigKey.RESPONSE_JSON_CHECK]: [{ description: 'body is ok', expression: '$.ok == true' }],
  ...tlsFields,
});

export const fullTcpMonitor = (): MonitorFixture => ({
  ...commonFields,
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.TCP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.TCP,
  [ConfigKey.METADATA]: metadataFixture,
  [ConfigKey.HOSTS]: 'tcp.elastic.co:9200',
  [ConfigKey.URLS]: 'tcp://tcp.elastic.co:9200',
  [ConfigKey.PORT]: 9200,
  [ConfigKey.PROXY_URL]: 'socks5://proxy.internal:1080',
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: true,
  [ConfigKey.MODE]: Mode.ANY,
  [ConfigKey.IPV4]: true,
  [ConfigKey.IPV6]: true,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: 'PONG',
  [ConfigKey.REQUEST_SEND_CHECK]: 'PING',
  ...tlsFields,
});

export const fullIcmpMonitor = (): MonitorFixture => ({
  ...commonFields,
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.ICMP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.ICMP,
  [ConfigKey.HOSTS]: '8.8.8.8',
  [ConfigKey.WAIT]: '2',
  [ConfigKey.MODE]: Mode.ANY,
  [ConfigKey.IPV4]: true,
  [ConfigKey.IPV6]: false,
});

export const fullBrowserMonitor = (): MonitorFixture => ({
  ...commonFields,
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
  [ConfigKey.METADATA]: metadataFixture,
  [ConfigKey.PLAYWRIGHT_OPTIONS]: '{"headless":true}',
  [ConfigKey.TEXT_ASSERTION]: 'Welcome to Elastic',
  [ConfigKey.SOURCE_INLINE]: 'step("load homepage", async () => {});',
  [ConfigKey.SOURCE_PROJECT_CONTENT]: 'UEsDBBQACAAI',
  [ConfigKey.URLS]: 'https://www.elastic.co',
  [ConfigKey.PORT]: null,
  [ConfigKey.SCREENSHOTS]: ScreenshotOption.ONLY_ON_FAILURE,
  [ConfigKey.JOURNEY_FILTERS_MATCH]: 'checkout',
  [ConfigKey.JOURNEY_FILTERS_TAGS]: ['smoke'],
  [ConfigKey.IGNORE_HTTPS_ERRORS]: false,
  [ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST]: ['sha256/fixture-spki-hash'],
  [ConfigKey.THROTTLING_CONFIG]: {
    value: { download: '5', upload: '3', latency: '20' },
    label: 'Default',
    id: 'default',
  },
  [ConfigKey.SYNTHETICS_ARGS]: ['--no-sandbox'],
  ...tlsFields,
});

/** Field-level type violations exercised against every monitor type. */
export const commonFieldTypeViolations: Array<[string, unknown]> = [
  [ConfigKey.NAME, ''], // NonEmptyString rejects blank
  [ConfigKey.NAME, 42],
  [ConfigKey.NAMESPACE, 'Invalid Namespace'], // Fleet namespace rules
  [ConfigKey.ENABLED, 'yes'],
  [ConfigKey.SCHEDULE, { number: 5, unit: 'm' }], // number must be a string
  [ConfigKey.SCHEDULE, { number: '5', unit: 'h' }], // unit outside ScheduleUnit
  [ConfigKey.TAGS, 'tag-one'], // must be an array
  [ConfigKey.TAGS, [1, 2]],
  [ConfigKey.LOCATIONS, []], // NonEmptyArray
  [ConfigKey.LOCATIONS, [{ label: 'no id' }]],
  [ConfigKey.MAX_ATTEMPTS, '3'],
  [ConfigKey.LABELS, { env: 1 }], // Record<string, string>
  [ConfigKey.MAINTENANCE_WINDOWS, 'mw-1'],
  [ConfigKey.ALERT_CONFIG, { status: { enabled: 'true' } }],
  [ConfigKey.MONITOR_SOURCE_TYPE, 'cli'], // outside SourceType
];
