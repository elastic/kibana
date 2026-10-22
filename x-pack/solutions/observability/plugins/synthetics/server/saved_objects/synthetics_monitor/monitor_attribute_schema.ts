/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import {
  MAX_MONITOR_FANOUT_SIZE,
  MAX_PARAM_VALUE_LENGTH,
  MAX_ROUTE_STRING_LENGTH,
} from '../../../common/constants/monitor_attribute_limits';
import { ConfigKey } from '../../../common/constants/monitor_management';
import {
  CodeEditorMode,
  FormMonitorType,
  KerberosAuthType,
  Mode,
  MonitorTypeEnum,
  ResponseBodyIndexPolicy,
  ScheduleUnit,
  ScreenshotOption,
  SourceType,
  TLSVersion,
  VerificationMode,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import {
  AUTH_INLINE_CONF_MAX,
  AUTH_STRING_MAX,
} from '../../../common/runtime_types/schemas/monitor_configs';

// `secrets` is the JSON of every secret field, so it has to hold more than one script.
const SECRETS_STRING = MAX_PARAM_VALUE_LENGTH * 8;

const shortString = () => schema.string({ maxLength: MAX_ROUTE_STRING_LENGTH });
const longString = () => schema.string({ maxLength: MAX_PARAM_VALUE_LENGTH });
const stringArray = () => schema.arrayOf(shortString(), { maxSize: MAX_MONITOR_FANOUT_SIZE });

const literals = (values: readonly string[]) =>
  schema.oneOf(values.map((value) => schema.literal(value)) as [Type<string>, ...Type<string>[]]);

const loose = <P extends Record<string, Type<unknown>>>(props: P) =>
  schema.object(props, { unknowns: 'allow' });

const scheduleSchema = loose({
  // Stored as a string. A numeric value is also accepted.
  number: schema.oneOf([schema.string({ maxLength: 32 }), schema.number()]),
  unit: schema.maybe(literals(Object.values(ScheduleUnit))),
});

const geoSchema = loose({
  lat: schema.maybe(schema.oneOf([shortString(), schema.number(), schema.literal(null)])),
  lon: schema.maybe(schema.oneOf([shortString(), schema.number(), schema.literal(null)])),
});

const locationSchema = loose({
  id: shortString(),
  label: shortString(),
  isServiceManaged: schema.maybe(schema.boolean()),
  isInvalid: schema.maybe(schema.boolean()),
  url: schema.maybe(shortString()),
  geo: schema.maybe(geoSchema),
  status: schema.maybe(shortString()),
  agentPolicyId: schema.maybe(shortString()),
  tags: schema.maybe(stringArray()),
  namespace: schema.maybe(shortString()),
  spaces: schema.maybe(stringArray()),
});

const alertStatusSchema = loose({
  enabled: schema.boolean(),
  groupBy: schema.maybe(shortString()),
});

const stringRecord = () =>
  schema.recordOf(
    schema.string({ maxLength: MAX_ROUTE_STRING_LENGTH }),
    schema.string({ maxLength: MAX_PARAM_VALUE_LENGTH })
  );

const authString = () => schema.string({ maxLength: AUTH_STRING_MAX });
const authInline = () => schema.string({ maxLength: AUTH_INLINE_CONF_MAX });

const kerberosSchema = schema.object({
  enabled: schema.boolean(),
  auth_type: literals(Object.values(KerberosAuthType)),
  username: authString(),
  password: authString(),
  keytab: authInline(),
  config_path: authString(),
  krb5_conf: authInline(),
  realm: authString(),
  service_name: authString(),
  enable_krb5_fast: schema.boolean(),
});

const ntlmSchema = schema.object({
  enabled: schema.boolean(),
  username: authString(),
  password: authString(),
  domain: authString(),
  workstation: authString(),
});

const requestBodySchema = loose({
  value: longString(),
  type: literals(Object.values(CodeEditorMode)),
});

const responseJsonCheckSchema = loose({
  description: longString(),
  expression: longString(),
});

const throttlingValueSchema = loose({
  download: shortString(),
  upload: shortString(),
  latency: shortString(),
});

const metadataSchema = loose({
  is_tls_enabled: schema.maybe(schema.boolean()),
  script_source: schema.maybe(
    loose({
      is_generated_script: schema.boolean(),
      file_name: shortString(),
    })
  ),
});

/**
 * Attributes stored on a multi-space monitor. Fields that only some monitor
 * types, or older documents, carry are optional. Unknown top-level keys fail
 * create. `forwardCompatibility` is this schema with unknown keys removed.
 */
export const monitorCreateSchema = schema.object({
  [ConfigKey.NAME]: shortString(),
  [ConfigKey.MONITOR_TYPE]: literals(Object.values(MonitorTypeEnum)),
  [ConfigKey.ENABLED]: schema.boolean(),
  [ConfigKey.SCHEDULE]: scheduleSchema,
  [ConfigKey.NAMESPACE]: shortString(),
  [ConfigKey.TAGS]: stringArray(),
  // A location is a service or private location object. Tests also store a location id string.
  [ConfigKey.LOCATIONS]: schema.maybe(
    schema.arrayOf(schema.oneOf([shortString(), locationSchema]), {
      maxSize: MAX_MONITOR_FANOUT_SIZE,
    })
  ),
  [ConfigKey.APM_SERVICE_NAME]: schema.maybe(shortString()),
  [ConfigKey.MONITOR_QUERY_ID]: schema.maybe(shortString()),
  [ConfigKey.CONFIG_ID]: schema.maybe(shortString()),
  [ConfigKey.MAX_ATTEMPTS]: schema.maybe(schema.number()),
  [ConfigKey.FORM_MONITOR_TYPE]: schema.maybe(literals(Object.values(FormMonitorType))),
  [ConfigKey.TIMEOUT]: schema.maybe(
    schema.oneOf([shortString(), schema.number(), schema.literal(null)])
  ),
  [ConfigKey.REVISION]: schema.maybe(schema.number()),
  [ConfigKey.MONITOR_SOURCE_TYPE]: schema.maybe(literals(Object.values(SourceType))),
  [ConfigKey.CONFIG_HASH]: schema.maybe(shortString()),
  [ConfigKey.JOURNEY_ID]: schema.maybe(shortString()),
  [ConfigKey.PROJECT_ID]: schema.maybe(shortString()),
  [ConfigKey.ORIGINAL_SPACE]: schema.maybe(shortString()),
  [ConfigKey.CUSTOM_HEARTBEAT_ID]: schema.maybe(shortString()),
  [ConfigKey.ALERT_CONFIG]: schema.maybe(
    loose({
      status: schema.maybe(alertStatusSchema),
      tls: schema.maybe(alertStatusSchema),
    })
  ),
  [ConfigKey.PARAMS]: schema.maybe(longString()),
  [ConfigKey.LABELS]: schema.maybe(stringRecord()),
  [ConfigKey.MAINTENANCE_WINDOWS]: schema.maybe(stringArray()),
  [ConfigKey.KIBANA_SPACES]: schema.maybe(stringArray()),
  retest_on_failure: schema.maybe(schema.boolean()),
  [ConfigKey.METADATA]: schema.maybe(metadataSchema),
  [ConfigKey.HOSTS]: schema.maybe(shortString()),
  [ConfigKey.PORT]: schema.maybe(schema.nullable(schema.number())),
  [ConfigKey.URLS]: schema.maybe(schema.nullable(shortString())),
  [ConfigKey.PROXY_URL]: schema.maybe(shortString()),
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: schema.maybe(schema.boolean()),
  [ConfigKey.MODE]: schema.maybe(literals(Object.values(Mode))),
  [ConfigKey.IPV4]: schema.maybe(schema.boolean()),
  [ConfigKey.IPV6]: schema.maybe(schema.boolean()),
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: schema.maybe(longString()),
  [ConfigKey.REQUEST_SEND_CHECK]: schema.maybe(longString()),
  [ConfigKey.MAX_REDIRECTS]: schema.maybe(schema.oneOf([shortString(), schema.number()])),
  [ConfigKey.RESPONSE_BODY_INDEX]: schema.maybe(literals(Object.values(ResponseBodyIndexPolicy))),
  [ConfigKey.RESPONSE_HEADERS_INDEX]: schema.maybe(schema.boolean()),
  [ConfigKey.RESPONSE_STATUS_CHECK]: schema.maybe(stringArray()),
  [ConfigKey.REQUEST_METHOD_CHECK]: schema.maybe(shortString()),
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: schema.maybe(shortString()),
  [ConfigKey.PASSWORD]: schema.maybe(longString()),
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: schema.maybe(stringArray()),
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: schema.maybe(stringArray()),
  [ConfigKey.RESPONSE_HEADERS_CHECK]: schema.maybe(stringRecord()),
  [ConfigKey.REQUEST_BODY_CHECK]: schema.maybe(requestBodySchema),
  [ConfigKey.REQUEST_HEADERS_CHECK]: schema.maybe(stringRecord()),
  [ConfigKey.USERNAME]: schema.maybe(longString()),
  [ConfigKey.PROXY_HEADERS]: schema.maybe(stringRecord()),
  [ConfigKey.RESPONSE_JSON_CHECK]: schema.maybe(
    schema.arrayOf(responseJsonCheckSchema, { maxSize: MAX_MONITOR_FANOUT_SIZE })
  ),
  [ConfigKey.KERBEROS]: schema.maybe(kerberosSchema),
  [ConfigKey.NTLM]: schema.maybe(ntlmSchema),
  [ConfigKey.WAIT]: schema.maybe(shortString()),
  [ConfigKey.PLAYWRIGHT_OPTIONS]: schema.maybe(longString()),
  [ConfigKey.TEXT_ASSERTION]: schema.maybe(longString()),
  [ConfigKey.SOURCE_INLINE]: schema.maybe(longString()),
  [ConfigKey.SOURCE_PROJECT_CONTENT]: schema.maybe(longString()),
  [ConfigKey.SCREENSHOTS]: schema.maybe(literals(Object.values(ScreenshotOption))),
  [ConfigKey.JOURNEY_FILTERS_MATCH]: schema.maybe(shortString()),
  [ConfigKey.JOURNEY_FILTERS_TAGS]: schema.maybe(stringArray()),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: schema.maybe(schema.boolean()),
  [ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST]: schema.maybe(
    schema.oneOf([longString(), schema.arrayOf(longString(), { maxSize: MAX_MONITOR_FANOUT_SIZE })])
  ),
  [ConfigKey.THROTTLING_CONFIG]: schema.maybe(
    loose({
      value: schema.nullable(throttlingValueSchema),
      label: shortString(),
      id: shortString(),
    })
  ),
  [ConfigKey.SYNTHETICS_ARGS]: schema.maybe(stringArray()),
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: schema.maybe(
    schema.oneOf([longString(), schema.arrayOf(longString(), { maxSize: MAX_MONITOR_FANOUT_SIZE })])
  ),
  [ConfigKey.TLS_CERTIFICATE]: schema.maybe(longString()),
  [ConfigKey.TLS_VERIFICATION_MODE]: schema.maybe(literals(Object.values(VerificationMode))),
  [ConfigKey.TLS_VERSION]: schema.maybe(
    schema.arrayOf(literals(Object.values(TLSVersion)), { maxSize: 10 })
  ),
  [ConfigKey.TLS_KEY]: schema.maybe(longString()),
  [ConfigKey.TLS_KEY_PASSPHRASE]: schema.maybe(longString()),
  // Secret ConfigKeys are packed into this JSON string before the document is stored.
  secrets: schema.maybe(schema.string({ maxLength: SECRETS_STRING })),
});

export const monitorForwardCompatibilitySchema = monitorCreateSchema.extends(
  {},
  { unknowns: 'ignore' }
);
