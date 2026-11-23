/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTEL_EVENT_NAME, TELEMETRY_SDK_LANGUAGE, TELEMETRY_SDK_NAME } from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import {
  BROWSER_SDK_LANGUAGE,
  CRASH_EVENTS,
  ELASTIC_DISTRO,
  EVENT_WIDGET_CLICK,
  MOBILE_OS_NAMES,
  MOBILE_SDK_NAMES,
  OS_NAME,
  OTEL_OBSERVED_TIMESTAMP,
  OTEL_SCOPE_NAME,
  OTEL_SPAN_ID,
  TELEMETRY_DISTRO_NAME,
  VIEW_CONTROLLER_SCOPE,
  resourceAttributeField,
} from '../../../common/otel_data';
import { SESSIONS_MAX_SESSION_HOURS } from '../../../common/sessions';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import { SOURCE_SERVICE_NAME_FIELD, SOURCE_SESSION_ID_FIELD } from '../../lib/otel/source_fields';
import {
  ESQL_MAX_ROWS,
  HTTP_REQUEST_CONDITIONS,
  HTTP_REQUEST_EVALS,
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
  // EDOT iOS writes `service.build` with its legacy attribute names.
  appBuildId: ['resource.attributes.app.build_id', 'resource.attributes.service.build'],
  // A random id per install, which both SDKs send, unlike the opt-in user.
  appInstallationId: ['resource.attributes.app.installation.id'],
  // The identifier both SDKs send, such as `iPhone15,2`: marketing names in the same column would
  // count one device twice.
  deviceModel: ['resource.attributes.device.model.identifier'],
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
  app: ['appVersion', 'appBuildId', 'appInstallationId'],
  device: ['deviceModel', 'deviceManufacturer', 'os', 'osVersion'],
  network: ['networkConnectionType'],
  geo: ['countryIso', 'region', 'city'],
} as const satisfies Record<string, readonly MobileSessionAttribute[]>;

/**
 * Both SDKs send a crash on the next launch, with that launch's app, OS and network, so a crash
 * only decides the attributes of a session without any other event: a century back, it ranks
 * below every other event the query reads.
 */
const ATTRIBUTE_RANK = `attribute_rank = CASE(is_crash, @timestamp - 100 years, @timestamp)`;

const {
  seenEvals: SEEN_EVALS,
  stats: ATTRIBUTE_STATS,
  evals: ATTRIBUTE_EVALS,
} = attributeQueryParts(
  MOBILE_SESSION_ATTRIBUTE_FIELDS,
  MOBILE_SESSION_ATTRIBUTE_GROUPS,
  'attribute_rank'
);

/** How late a crash may be sent after it happened, as the next launch sends it. */
const MAX_CRASH_DELAY_HOURS = 24;

/**
 * How far before its window a changed mobile session is rebuilt from: a crash sent up to
 * `MAX_CRASH_DELAY_HOURS` late still sees every other event of its session.
 */
export const MOBILE_REBUILD_HOURS = SESSIONS_MAX_SESSION_HOURS + MAX_CRASH_DELAY_HOURS;

/**
 * A crash sent later than `MAX_CRASH_DELAY_HOURS`: its session's rebuild could start after its
 * other events, and the partial summary would replace the full one.
 */
const LATE_CRASH = `COALESCE(${OTEL_EVENT_NAME} IN (${texts(
  CRASH_EVENTS
)}) AND TO_DATETIME(${OTEL_OBSERVED_TIMESTAMP}) < @timestamp - ${MAX_CRASH_DELAY_HOURS} hours, false)`;

const SDK_LANGUAGE = resourceAttributeField(TELEMETRY_SDK_LANGUAGE);

// EDOT Browser is the Elastic distro too, and its resource could be enriched with the OS.
const MOBILE_SDK = `(${resourceAttributeField(TELEMETRY_SDK_NAME)} IN (${texts(MOBILE_SDK_NAMES)})
    OR (${resourceAttributeField(TELEMETRY_DISTRO_NAME)} == ${escapeStringValue(ELASTIC_DISTRO)}
      AND ${resourceAttributeField(OS_NAME)} IN (${texts(Object.values(MOBILE_OS_NAMES).flat())})
      AND (${SDK_LANGUAGE} IS NULL OR ${SDK_LANGUAGE} != ${escapeStringValue(
        BROWSER_SDK_LANGUAGE
      )})))`;

/** The EDOT Android and EDOT iOS events with a session and an application, but late crashes. */
export const mobileSessionEvents = sessionEventsOf(`${MOBILE_SDK}
  AND NOT ${LATE_CRASH}`);

const MOBILE_SESSION_STATS: Stat[] = [
  ['start_time', 'MIN(event_time)'],
  ['end_time', 'MAX(event_time)'],
  ['event_count', 'COUNT(@timestamp)'],
  ['crash_count', 'COUNT(*) WHERE is_crash'],
  ['screen_view_count', 'COUNT(*) WHERE is_screen_view'],
  ['tap_count', `COUNT(*) WHERE event == ${escapeStringValue(EVENT_WIDGET_CLICK)}`],
  // EDOT Android and EDOT iOS export from a disk buffer at least once, so a retried export can
  // store the same span twice.
  ...Object.entries(HTTP_REQUEST_CONDITIONS).map(([column, condition]): Stat => [
    column,
    `COUNT_DISTINCT(${OTEL_SPAN_ID}) WHERE ${condition}`,
  ]),
  ...ATTRIBUTE_STATS,
];

/**
 * One row per session of `sessionIds`, rebuilt from its events since `?rebuild_from`: its counts,
 * times and latest attributes. A crash counts at the time it happened, the earlier of its two
 * times: EDOT iOS sends it on the next launch with only its observed time set to the crash.
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
       ${ATTRIBUTE_RANK},
       ${SEEN_EVALS.join(',\n       ')}
| EVAL event_time = CASE(is_crash, LEAST(@timestamp, COALESCE(TO_DATETIME(${OTEL_OBSERVED_TIMESTAMP}), @timestamp)), @timestamp)
| STATS ${renderStats(MOBILE_SESSION_STATS, '        ')}
  BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD}
| EVAL ${ATTRIBUTE_EVALS.join(',\n       ')}
| DROP ${RAW_PREFIX}*
| LIMIT ${maxRows}`,
  params: [{ rebuild_from: rebuildFrom }, { changed_to: changedTo }],
});
