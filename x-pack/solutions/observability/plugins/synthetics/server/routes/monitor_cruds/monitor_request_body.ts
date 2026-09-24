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

const fieldFor = (key: string): z.ZodType => typedOverlays[key] ?? boundedJson.optional();

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
  const shape = Object.fromEntries(allowedKeysForType(type).map((key) => [key, fieldFor(key)]));
  return z
    .strictObject({
      type: z.literal(type),
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
