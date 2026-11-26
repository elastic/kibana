/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, esql, type ComposerQuery } from '@elastic/esql';
import {
  EVENT_EXCEPTION,
  EVENT_SCREEN_CLICK,
  EVENT_WIDGET_CLICK,
  SCREEN_LOAD_SPAN,
  SPAN_KIND_CLIENT,
  VIEW_CONTROLLER_SCOPE,
} from '../otel_data';
import type { MobileSessionEventKind } from '../sessions';
import { mobileDocuments } from './documents';
import type { MOBILE_FIELDS, RESULT_COLUMNS } from './fields';
import { inValues, mobileColumn, resultColumn } from './fields';

/** Events "Before the crash" lists. */
export const SESSION_EVENTS_BEFORE_CRASH = 20;

export interface SessionEventsParams {
  serviceName: string;
  sessionId: string;
  /** Only events before this time, ISO 8601. */
  before: string;
  limit: number;
}

const KIND = {
  request: 'request',
  screen: 'screen',
  tap: 'tap',
  error: 'error',
  log: 'log',
} as const satisfies Record<MobileSessionEventKind, MobileSessionEventKind>;

/** The kind of a mobile event, or `null` for one a session timeline doesn't list. */
const eventKind = () =>
  esql.exp`CASE(
    ${mobileColumn('spanKind')} == ${SPAN_KIND_CLIENT} AND ${mobileColumn(
    'httpMethod'
  )} IS NOT NULL,
    ${KIND.request},
    ${mobileColumn('scopeName')} == ${VIEW_CONTROLLER_SCOPE}
      OR ${mobileColumn('spanName')} == ${SCREEN_LOAD_SPAN},
    ${KIND.screen},
    ${inValues('eventName', [EVENT_WIDGET_CLICK, EVENT_SCREEN_CLICK])},
    ${KIND.tap},
    ${mobileColumn('eventName')} == ${EVENT_EXCEPTION},
    ${KIND.error},
    ${mobileColumn('eventName')} IS NULL AND ${mobileColumn('severity')} IS NOT NULL,
    ${KIND.log},
    NULL
  )`;

/**
 * The mobile documents of one session of an application: the id as the crash has it, and in either
 * case, as EDOT iOS writes `session.id` in uppercase. The timeline and its Discover link both read
 * the session this way, so they show the same events.
 */
export const mobileSessionDocuments = (
  { serviceName, sessionId }: Pick<SessionEventsParams, 'serviceName' | 'sessionId'>,
  documents: ComposerQuery = mobileDocuments()
): ComposerQuery =>
  documents.pipe`WHERE ${mobileColumn('serviceName')} == ${{
    service_name: serviceName,
  }}`.pipe`WHERE ${mobileColumn('sessionId')} IN (${{ session_id: sessionId }}, ${{
    session_id_lower: sessionId.toLowerCase(),
  }}, ${{ session_id_upper: sessionId.toUpperCase() }})`;

/** Events read from spans: an SDK can send a span again, as another document with its id. */
const SPAN_KINDS: readonly MobileSessionEventKind[] = ['request', 'screen'];

/**
 * The latest events of a mobile session before a time, newest first: requests, screens, taps,
 * handled errors and logs. A span sent twice is listed once, before the limit is applied.
 */
export const sessionEventsBefore = ({
  serviceName,
  sessionId,
  before,
  limit,
}: SessionEventsParams): ComposerQuery => {
  const eventKindColumn = resultColumn('eventKind');
  const is = (value: MobileSessionEventKind) => esql.exp`${eventKindColumn} == ${value}`;
  const keptId = resultColumn('keptId');
  const isSpan = Builder.expression.func.binary('in', [
    eventKindColumn,
    Builder.expression.list.tuple({
      values: SPAN_KINDS.map((kind) => Builder.expression.literal.string(kind)),
    }),
  ]);
  return mobileSessionDocuments({ serviceName, sessionId }, mobileDocuments({ metadataFields: ['_id'] }))
    .pipe`WHERE @timestamp < TO_DATETIME(${{
    before,
  }})`.pipe`EVAL ${eventKindColumn} = ${eventKind()}`.pipe`WHERE ${eventKindColumn} IS NOT NULL`
    .pipe`INLINE STATS ${keptId} = MIN(_id) BY ${mobileColumn('spanId')}, ${eventKindColumn}`
    .pipe`WHERE NOT ${isSpan} OR _id == ${keptId}`.pipe`SORT @timestamp DESC`.pipe`LIMIT ${limit}`
    .pipe`EVAL
      ${resultColumn('name')} = COALESCE(CASE(
        ${is(KIND.request)}, ${mobileColumn('httpMethod')},
        ${is(KIND.error)}, ${mobileColumn('exceptionType')},
        ${is(KIND.log)}, ${mobileColumn('severity')},
        ${is(KIND.screen)}, COALESCE(${mobileColumn('screenName')}, ${mobileColumn('spanName')}),
        COALESCE(${mobileColumn('widgetName')}, ${mobileColumn('widgetId')}, ${mobileColumn(
    'screenName'
  )})
      ), ${eventKindColumn}),
      ${resultColumn('detail')} = CASE(
        ${is(KIND.request)}, ${mobileColumn('urlFull')},
        COALESCE(${mobileColumn('exceptionMessage')}, ${mobileColumn('logBody')})
      ),
      ${resultColumn('stacktrace')} = CASE(${is(KIND.error)}, ${mobileColumn(
    'exceptionStacktrace'
  )}, NULL),
      ${resultColumn('statusCode')} = CASE(${is(KIND.request)}, ${mobileColumn(
    'httpStatusCode'
  )}, NULL),
      ${resultColumn('durationMs')} = CASE(${is(KIND.request)}, ${mobileColumn(
    'spanDuration'
  )} / 1000000.0, NULL),
      ${resultColumn('page')} = ${mobileColumn('screenName')}`.pipe`KEEP @timestamp, ${[
    eventKindColumn,
    resultColumn('name'),
    resultColumn('page'),
    resultColumn('detail'),
    resultColumn('stacktrace'),
    mobileColumn('traceId'),
    mobileColumn('spanId'),
    resultColumn('statusCode'),
    resultColumn('durationMs'),
  ]}`;
};

/** The row of `sessionEventsBefore`: a timeline event's fields, by kind. */
export interface SessionEventRow {
  '@timestamp': string;
  [RESULT_COLUMNS.eventKind]: MobileSessionEventKind;
  [RESULT_COLUMNS.name]: string;
  [RESULT_COLUMNS.page]?: string | null;
  [RESULT_COLUMNS.detail]?: string | null;
  [RESULT_COLUMNS.stacktrace]?: string | null;
  [MOBILE_FIELDS.traceId]?: string | null;
  [MOBILE_FIELDS.spanId]?: string | null;
  [RESULT_COLUMNS.statusCode]?: number | null;
  [RESULT_COLUMNS.durationMs]?: number | null;
}
