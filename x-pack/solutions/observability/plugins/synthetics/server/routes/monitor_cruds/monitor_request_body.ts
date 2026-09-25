/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DEFAULT_FIELDS } from '../../../common/constants/monitor_defaults';
import { ConfigKey } from '../../../common/constants/monitor_management';
import { AlertConfigsCodec } from '../../../common/runtime_types/zod/alert_config';
import { MonitorTypeEnum } from '../../../common/runtime_types/monitor_management/monitor_configs';
import { NameSpaceString } from '../../../common/runtime_types/zod/common';
import {
  FormMonitorTypeCodec,
  ModeCodec,
  MonitorTypeCodec,
  ScheduleUnitCodec,
  SourceTypeCodec,
} from '../../../common/runtime_types/zod/monitor_configs';
import {
  MAX_MONITOR_FANOUT_SIZE,
  MAX_PARAM_VALUE_LENGTH,
  MAX_ROUTE_ID_LENGTH,
  MAX_ROUTE_STRING_LENGTH,
  maxArraySizeMessage,
} from '../zod_query';

/**
 * Public create/edit/inspect/run-once body. Per-type HTTP shape (url/host/
 * inline_script aliases, string location ids, schedule as a number), not
 * HTTPFieldsCodec. Field codecs still run in-handler after normalizeAPIConfig.
 */
type BoundedJson =
  | string
  | number
  | boolean
  | null
  | BoundedJson[]
  | { [key: string]: BoundedJson };

const boundedJson: z.ZodType<BoundedJson> = z
  .lazy(() =>
    z.union([
      z.string().max(MAX_PARAM_VALUE_LENGTH),
      z.number().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
      z.boolean(),
      z.null(),
      z.array(boundedJson).max(MAX_MONITOR_FANOUT_SIZE),
      z.record(z.string().max(MAX_ROUTE_STRING_LENGTH), boundedJson),
    ])
  )
  .meta({ id: 'syntheticsJsonValue' });

const MONITOR_OAS_IDS: Record<MonitorTypeEnum, string> = {
  [MonitorTypeEnum.HTTP]: 'httpMonitorFields',
  [MonitorTypeEnum.TCP]: 'tcpMonitorFields',
  [MonitorTypeEnum.ICMP]: 'icmpMonitorFields',
  [MonitorTypeEnum.BROWSER]: 'browserMonitorFields',
  [MonitorTypeEnum.API]: 'apiMonitorFields',
};

const locationInput = z.union([
  z.string().min(1).max(MAX_ROUTE_ID_LENGTH),
  z.looseObject({
    id: z.string().min(1).max(MAX_ROUTE_ID_LENGTH),
  }),
]);

const locationsField = z
  .array(locationInput)
  .max(MAX_MONITOR_FANOUT_SIZE, { error: maxArraySizeMessage(MAX_MONITOR_FANOUT_SIZE) });

const scheduleField = z.union([
  z.number().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
  z.strictObject({
    number: z.union([z.string().max(32), z.number()]),
    unit: ScheduleUnitCodec,
  }),
]);

const stringList = z.union([
  z.string().max(MAX_ROUTE_STRING_LENGTH),
  z.array(z.string().max(MAX_ROUTE_STRING_LENGTH)).max(MAX_MONITOR_FANOUT_SIZE),
]);

const stringMap = z.record(
  z.string().max(MAX_ROUTE_STRING_LENGTH),
  z.string().max(MAX_PARAM_VALUE_LENGTH)
);

const optionalString = z.string().max(MAX_ROUTE_STRING_LENGTH).optional();
const optionalIdList = z
  .array(z.string().max(MAX_ROUTE_ID_LENGTH))
  .max(MAX_MONITOR_FANOUT_SIZE)
  .optional();

/** Nested public-API objects that flatten into dotted ConfigKeys. Not `url` (string alias). */
const NESTED_PARENTS = [
  'ssl',
  'check',
  'response',
  'source',
  'filter_journeys',
  'service',
] as const;

const TYPE_ALIASES: Record<MonitorTypeEnum, readonly string[]> = {
  [MonitorTypeEnum.HTTP]: ['url'],
  [MonitorTypeEnum.TCP]: ['host'],
  [MonitorTypeEnum.ICMP]: ['host'],
  [MonitorTypeEnum.BROWSER]: ['inline_script', 'source.inline'],
  [MonitorTypeEnum.API]: ['inline_script', 'source.inline'],
};

const SHARED_REQUEST_KEYS = [
  'private_locations',
  'retest_on_failure',
  ConfigKey.PROJECT_ID,
  ConfigKey.ORIGINAL_SPACE,
  ConfigKey.CUSTOM_HEARTBEAT_ID,
] as const;

const typedOverlays: Record<string, z.ZodType> = {
  [ConfigKey.NAME]: optionalString,
  [ConfigKey.NAMESPACE]: NameSpaceString.optional(),
  [ConfigKey.ENABLED]: z.boolean().optional(),
  [ConfigKey.LOCATIONS]: locationsField.optional(),
  [ConfigKey.SCHEDULE]: scheduleField.optional(),
  [ConfigKey.TAGS]: stringList.optional(),
  [ConfigKey.PARAMS]: z.union([z.string().max(MAX_PARAM_VALUE_LENGTH), stringMap]).optional(),
  [ConfigKey.ALERT_CONFIG]: AlertConfigsCodec.optional(),
  [ConfigKey.LABELS]: stringMap.optional(),
  [ConfigKey.KIBANA_SPACES]: optionalIdList,
  [ConfigKey.MAINTENANCE_WINDOWS]: optionalIdList,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorTypeCodec.optional(),
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceTypeCodec.optional(),
  [ConfigKey.MODE]: ModeCodec.optional(),
  [ConfigKey.IPV4]: z.boolean().optional(),
  [ConfigKey.IPV6]: z.boolean().optional(),
  [ConfigKey.TIMEOUT]: z.union([z.string().max(32), z.number(), z.null()]).optional(),
  [ConfigKey.MAX_ATTEMPTS]: z
    .number()
    .min(Number.MIN_SAFE_INTEGER)
    .max(Number.MAX_SAFE_INTEGER)
    .optional(),
  [ConfigKey.MAX_REDIRECTS]: z.union([z.string().max(32), z.number()]).optional(),
  [ConfigKey.URLS]: z.union([z.string().max(MAX_ROUTE_STRING_LENGTH), z.null()]).optional(),
  [ConfigKey.HOSTS]: optionalString,
  url: optionalString,
  host: optionalString,
  inline_script: z.string().max(MAX_PARAM_VALUE_LENGTH).optional(),
  'source.inline': boundedJson.optional(),
  private_locations: locationsField.optional(),
  ssl: boundedJson.optional(),
  check: boundedJson.optional(),
  response: boundedJson.optional(),
  source: boundedJson.optional(),
  filter_journeys: boundedJson.optional(),
  service: boundedJson.optional(),
  retest_on_failure: z.boolean().optional(),
};

const SSL_DESCRIPTION =
  "The TLS/SSL connection settings for use with the HTTPS endpoint. If you don't specify settings, the system defaults are used.";

const FIELD_DESCRIPTIONS: Record<string, string> = {
  [ConfigKey.NAME]: 'The monitor name.',
  [ConfigKey.ENABLED]: 'Specify whether the monitor is enabled. Defaults to `true`.',
  [ConfigKey.ALERT_CONFIG]:
    'The alert configuration. The default is `{ status: { enabled: true }, tls: { enabled: true } }`.',
  [ConfigKey.LOCATIONS]: `The Elastic-managed locations to deploy the monitor to.
Monitors can be deployed in multiple locations so that you can detect differences in availability and response times across those locations.
To list available locations, run the \`elastic-synthetics locations\` command with the deployment's Kibana URL, or go to *Synthetics > Management* and click *Create monitor*.

You can provide \`locations\` or \`private_locations\` or both. At least one is required.`,
  private_locations: `The private locations to deploy the monitor to.
These locations are hosted and managed by you, whereas \`locations\` are hosted by Elastic.
You can specify a private location using the location's name.
To list available private locations, run the \`elastic-synthetics locations\` command with the deployment's Kibana URL, or go to *Synthetics > Settings* and click *Private locations*.`,
  [ConfigKey.NAMESPACE]:
    'The namespace field should be lowercase and not contain spaces. The namespace must not include any of the following characters: `*`, `\\`, `/`, `?`, `"`, `<`, `>`, `|`, whitespace, `,`, `#`, `:`, or `-`. Defaults to `default`.',
  [ConfigKey.PARAMS]: 'The monitor parameters, as a JSON string or an object.',
  retest_on_failure:
    'Turn retesting for when a monitor fails on or off. By default, monitors are automatically retested if the monitor goes from "up" to "down". If the result of the retest is also "down", an error is created and, if configured, an alert is sent. Using `retest_on_failure` can reduce noise related to transient problems.',
  [ConfigKey.SCHEDULE]:
    "The monitor's schedule in minutes. Supported values are `1`, `3`, `5`, `10`, `15`, `30`, `60`, `120`, and `240`. The default value is `3` minutes for HTTP, TCP, and ICMP monitors, and `10` minutes for browser monitors.",
  [ConfigKey.APM_SERVICE_NAME]: 'The APM service name.',
  [ConfigKey.TAGS]: 'An array of tags.',
  [ConfigKey.LABELS]:
    'Key-value pairs of labels to associate with the monitor. Labels can be used for filtering and grouping monitors.',
  [ConfigKey.TIMEOUT]: `The monitor timeout in seconds. The monitor fails if it doesn't complete within this time. Defaults to \`16\`.

For browser monitors, the minimum timeout is 30 seconds. Browser monitor timeouts only apply on private locations; on public locations the timeout has no effect and the response includes a warning.`,
  url: 'The URL to monitor.',
  host: 'The host to monitor; it can be an IP address or a hostname.',
  [ConfigKey.USERNAME]:
    'The username for authenticating with the server. The credentials are passed with the request.',
  [ConfigKey.PASSWORD]:
    'The password for authenticating with the server. The credentials are passed with the request.',
  [ConfigKey.PROXY_URL]: 'The URL of the proxy to use for this monitor.',
  [ConfigKey.PROXY_HEADERS]: 'Additional headers to send to proxies during CONNECT requests.',
  [ConfigKey.MAX_REDIRECTS]: 'The maximum number of redirects to follow. Defaults to `0`.',
  [ConfigKey.MODE]:
    "The mode of the monitor. If it is `all`, the monitor pings all resolvable IPs for a hostname. If it is `any`, the monitor pings only one IP address for a hostname. If you're using a DNS-load balancer and want to ping every IP address for the specified hostname, use `all`. Defaults to `any`.",
  [ConfigKey.IPV4]: 'If `true`, ping using the ipv4 protocol. Defaults to `true`.',
  [ConfigKey.IPV6]: 'If `true`, ping using the ipv6 protocol. Defaults to `true`.',
  check: 'The check request settings, as nested `request` and `response` objects.',
  [ConfigKey.REQUEST_METHOD_CHECK]: 'The HTTP method to use: `HEAD`, `GET`, `POST`, or `OPTIONS`.',
  [ConfigKey.REQUEST_HEADERS_CHECK]:
    'A dictionary of additional HTTP headers to send. By default, Synthetics sets the User-Agent header to identify itself.',
  [ConfigKey.REQUEST_BODY_CHECK]: 'Optional request body content.',
  [ConfigKey.RESPONSE_HEADERS_CHECK]:
    'A dictionary of expected HTTP headers. If the header is not found, the check fails.',
  response:
    'Controls the indexing of the HTTP response body contents to the `http.response.body.contents` field.',
  ssl: SSL_DESCRIPTION,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]:
    'Specify that hostnames are resolved locally instead of being resolved on the proxy server. If `false`, name resolution occurs on the proxy server. Defaults to `false`.',
  [ConfigKey.WAIT]: 'The wait time in seconds. Defaults to `1`.',
  inline_script: 'The inline script.',
  [ConfigKey.IGNORE_HTTPS_ERRORS]: 'Ignore HTTPS errors. Defaults to `false`.',
  [ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST]:
    "PEM certificates whose public keys (SPKI) are allowlisted so Chromium bypasses certificate errors for matching presented certificates. This does not add a CA to Chromium's trust store.",
  [ConfigKey.PLAYWRIGHT_OPTIONS]: 'Playwright options.',
  [ConfigKey.SCREENSHOTS]:
    'The screenshot option: `on`, `off`, or `only-on-failure`. Defaults to `on`.',
  [ConfigKey.SYNTHETICS_ARGS]: 'Synthetics agent CLI arguments.',
};

const TYPE_FIELD_DESCRIPTIONS: Partial<Record<MonitorTypeEnum, Record<string, string>>> = {
  [MonitorTypeEnum.TCP]: {
    host: 'The host to monitor; it can be an IP address or a hostname. The host can include the port using a colon, for example "example.com:9200".',
    [ConfigKey.PROXY_URL]:
      'The URL of the SOCKS5 proxy to use when connecting to the server. The value must be a URL with a scheme of `socks5://`. If the SOCKS5 proxy server requires client authentication, a username and password can be embedded in the URL. When using a proxy, hostnames are resolved on the proxy server instead of on the client, unless `proxy_use_local_resolver` is set.',
  },
  [MonitorTypeEnum.ICMP]: {
    host: 'The host to ping.',
  },
};

const fieldFor = (key: string, type?: MonitorTypeEnum): z.ZodType => {
  const field = typedOverlays[key] ?? boundedJson.optional();
  const description = (type && TYPE_FIELD_DESCRIPTIONS[type]?.[key]) ?? FIELD_DESCRIPTIONS[key];
  return description ? field.describe(description) : field;
};

const allowedKeysForType = (type: MonitorTypeEnum): string[] => {
  const defaults = Object.keys(DEFAULT_FIELDS[type]);
  const nested = NESTED_PARENTS.filter((parent) =>
    defaults.some((key) => key === parent || key.startsWith(`${parent}.`))
  );
  return [
    ...new Set([...defaults, ...TYPE_ALIASES[type], ...SHARED_REQUEST_KEYS, ...nested]),
  ].filter((key) => key !== ConfigKey.MONITOR_TYPE);
};

const bodyForType = (type: MonitorTypeEnum) => {
  const shape = Object.fromEntries(
    allowedKeysForType(type).map((key) => [key, fieldFor(key, type)])
  );
  return z
    .strictObject({
      type: z.literal(type).describe('The monitor type.'),
      ...shape,
    })
    .meta({ id: MONITOR_OAS_IDS[type] });
};

export const createMonitorRequestBody = z
  .discriminatedUnion('type', [
    bodyForType(MonitorTypeEnum.HTTP),
    bodyForType(MonitorTypeEnum.TCP),
    bodyForType(MonitorTypeEnum.ICMP),
    bodyForType(MonitorTypeEnum.BROWSER),
    bodyForType(MonitorTypeEnum.API),
  ])
  .meta({
    id: 'createMonitorRequest',
    description:
      'Create a synthetics monitor. Required and default fields vary by type (HTTP, TCP, ICMP, browser, or API).',
  });

const editPatchShape = Object.fromEntries(
  [
    ...new Set(
      Object.values(MonitorTypeEnum).flatMap((type) => allowedKeysForType(type as MonitorTypeEnum))
    ),
  ].map((key) => [key, fieldFor(key)])
);

/**
 * One object so edit is not `z.union(discriminatedUnion, patch-without-type)`.
 * `type` optional for `{ enabled: false }` patches; when present, only that
 * type's keys are allowed. Invalid `type` is an enum 400, not nested invalid_union.
 */
export const editMonitorRequestBody = z
  .strictObject({
    type: MonitorTypeCodec.optional(),
    ...editPatchShape,
  })
  .superRefine((value, ctx) => {
    if (value.type === undefined) {
      return;
    }
    const allowed = new Set(allowedKeysForType(value.type));
    for (const key of Object.keys(value)) {
      if (key !== 'type' && !allowed.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `Unrecognized key: "${key}"`,
        });
      }
    }
  })
  .meta({
    id: 'editMonitorRequest',
    description:
      'Partial monitor update. type is optional; when present, only fields for that monitor type are allowed.',
  });
