/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTEL_EVENT_NAME, TELEMETRY_SDK_NAME } from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import {
  CRASH_EVENTS,
  EVENT_WIDGET_CLICK,
  MOBILE_SDK_NAMES,
  OTEL_OBSERVED_TIMESTAMP,
  OTEL_SCOPE_NAME,
  VIEW_CONTROLLER_SCOPE,
} from '../../../common/otel_data';
import { SESSIONS_MAX_SESSION_HOURS } from '../../../common/sessions';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import { SOURCE_SERVICE_NAME_FIELD, SOURCE_SESSION_ID_FIELD } from '../../lib/otel/source_fields';
import {
  ESQL_MAX_ROWS,
  HTTP_REQUEST_EVALS,
  HTTP_REQUEST_STATS,
  NULLIFY_UNMAPPED_FIELDS,
  RAW_PREFIX,
  attributeQueryParts,
  renderStats,
  sessionEventsOf,
  texts,
  type Stat,
  type SummaryQueryOf,
} from './summary_queries';

/** Candidate source fields per mobile attribute, in priority order. */
export const MOBILE_SESSION_ATTRIBUTE_FIELDS = {
  environment: SESSION_ATTRIBUTE_FIELDS.environment,
  user: SESSION_ATTRIBUTE_FIELDS.user,
  appVersion: ['resource.attributes.service.version'],
  appBuildId: ['resource.attributes.app.build_id'],
  // EDOT Android and EDOT iOS write the model identifier, such as `iPhone15,2`.
  deviceModel: [
    'resource.attributes.device.model.name',
    'resource.attributes.device.model.identifier',
  ],
  deviceManufacturer: ['resource.attributes.device.manufacturer'],
  os: ['resource.attributes.os.name'],
  osVersion: ['resource.attributes.os.version'],
  networkConnectionType: ['attributes.network.connection.type'],
  countryIso: SESSION_ATTRIBUTE_FIELDS.countryIso,
  region: SESSION_ATTRIBUTE_FIELDS.region,
  city: SESSION_ATTRIBUTE_FIELDS.city,
} as const;

export type MobileSessionAttribute = keyof typeof MOBILE_SESSION_ATTRIBUTE_FIELDS;

/** Attributes read from the same event, as `SESSION_ATTRIBUTE_GROUPS`. */
export const MOBILE_SESSION_ATTRIBUTE_GROUPS = {
  environment: ['environment'],
  user: ['user'],
  app: ['appVersion', 'appBuildId'],
  device: ['deviceModel', 'deviceManufacturer', 'os', 'osVersion'],
  network: ['networkConnectionType'],
  geo: ['countryIso', 'region', 'city'],
} as const satisfies Record<string, readonly MobileSessionAttribute[]>;

const {
  seenEvals: SEEN_EVALS,
  stats: ATTRIBUTE_STATS,
  evals: ATTRIBUTE_EVALS,
} = attributeQueryParts(MOBILE_SESSION_ATTRIBUTE_FIELDS, MOBILE_SESSION_ATTRIBUTE_GROUPS);

/**
 * A crash sent more than the longest session after it happened: its session would be rebuilt from
 * too late to see its other events, and the partial summary would replace the full one.
 */
const LATE_CRASH = `COALESCE(${OTEL_EVENT_NAME} IN (${texts(
  CRASH_EVENTS
)}) AND TO_DATETIME(${OTEL_OBSERVED_TIMESTAMP}) < @timestamp - ${SESSIONS_MAX_SESSION_HOURS} hours, false)`;

/** The EDOT Android and EDOT iOS events with a session and an application, but late crashes. */
export const mobileSessionEvents = sessionEventsOf(
  `${TELEMETRY_SDK_NAME} IN (${texts(MOBILE_SDK_NAMES)})
  AND NOT ${LATE_CRASH}`
);

const MOBILE_SESSION_STATS: Stat[] = [
  ['start_time', 'MIN(event_time)'],
  ['end_time', 'MAX(event_time)'],
  ['event_count', 'COUNT(@timestamp)'],
  ['crash_count', 'COUNT(*) WHERE is_crash'],
  ['screen_view_count', 'COUNT(*) WHERE is_screen_view'],
  ['tap_count', `COUNT(*) WHERE event == ${escapeStringValue(EVENT_WIDGET_CLICK)}`],
  ...HTTP_REQUEST_STATS,
  ...ATTRIBUTE_STATS,
];

/**
 * One row per session of `sessionIds`, rebuilt from its events since `?rebuild_from`: its counts,
 * times and latest attributes. A crash counts at the time it happened: EDOT iOS sends it on the
 * next launch with only its observed time set to the crash.
 */
export const mobileSessionSummaryQuery: SummaryQueryOf = (
  { changedTo, rebuildFrom },
  sessionIds,
  maxRows = ESQL_MAX_ROWS
) => ({
  query: `${NULLIFY_UNMAPPED_FIELDS}
${mobileSessionEvents('rebuild_from', 'changed_to')}
  AND ${SOURCE_SESSION_ID_FIELD} IN (${texts(sessionIds)})
| EVAL event = COALESCE(${OTEL_EVENT_NAME}, "")
| EVAL is_crash = event IN (${texts(CRASH_EVENTS)}),
       is_screen_view = COALESCE(${OTEL_SCOPE_NAME} == ${escapeStringValue(
    VIEW_CONTROLLER_SCOPE
  )}, false),
       ${HTTP_REQUEST_EVALS},
       ${SEEN_EVALS.join(',\n       ')}
| EVAL event_time = CASE(is_crash, COALESCE(TO_DATETIME(${OTEL_OBSERVED_TIMESTAMP}), @timestamp), @timestamp)
| STATS ${renderStats(MOBILE_SESSION_STATS, '        ')}
  BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD}
| EVAL ${ATTRIBUTE_EVALS.join(',\n       ')}
| DROP ${RAW_PREFIX}*
| LIMIT ${maxRows}`,
  params: [{ rebuild_from: rebuildFrom }, { changed_to: changedTo }],
});
