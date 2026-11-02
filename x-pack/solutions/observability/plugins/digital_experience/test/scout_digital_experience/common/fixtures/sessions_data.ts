/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient } from '@kbn/scout-oblt';
import {
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_PIPELINE_NAME,
  SESSIONS_TRANSFORM_PATTERN,
} from '../../../../common/sessions';
import { OTEL_APPS } from './constants';

/** The application of the mock sessions. */
export const SESSIONS_APP = OTEL_APPS.shop;

/**
 * The mock sessions are from the last day: the transform's retention policy deletes summaries that
 * ended more than 31 days ago, so ones from `TIME_RANGE` would vanish at its next checkpoint.
 */
export const SESSIONS_TIME_RANGE = { rangeFrom: 'now-7d', rangeTo: 'now' };

/** Sessions in `SESSIONS_TIME_RANGE`, more than a page of 10, so the list pages. */
export const SESSION_COUNT = 12;

/** The session with a user, errors and raw events, so its detail shows a waterfall and journey. */
export const DETAILED_SESSION = {
  id: 'dx-session-01',
  user: 'jane@example.com',
  pages: ['/', '/products', '/cart'],
  errorType: 'TypeError',
  errorMessage: 'cart is undefined',
} as const;

/** Sessions with errors: the detailed one and `dx-session-02`. */
export const SESSIONS_WITH_ERRORS = 2;

/** Sessions on Firefox: every third one. */
export const FIREFOX_SESSIONS = 4;

const RAW_EVENTS_INDEX = 'logs-generic.otel-default';
const SECOND_MS = 1000;
const DAY_MS = 24 * 60 * 60 * SECOND_MS;

const at = (startMs: number, offsetMs: number) => new Date(startMs + offsetMs).toISOString();

const sessionId = (index: number) => `dx-session-${String(index + 1).padStart(2, '0')}`;

/** A summary as the sessions transform and its pipeline write it. */
const summaryOf = (sessionsStartMs: number, index: number) => {
  const isDetailed = index === 0;
  const startMs = index * 4 * 60 * SECOND_MS;
  const durationMs = isDetailed ? 150 * SECOND_MS : (index + 1) * 10 * SECOND_MS;
  const errorCount = index < SESSIONS_WITH_ERRORS ? index + 1 : 0;
  const journey = isDetailed ? [...DETAILED_SESSION.pages] : ['/', `/products/${index}`];
  const firefox = index % 3 === 2;
  return {
    session: { id: sessionId(index) },
    service: { name: SESSIONS_APP },
    start_time: at(sessionsStartMs, startMs),
    end_time: at(sessionsStartMs, startMs + durationMs),
    duration_ms: durationMs,
    event_count: 10,
    page_view_count: journey.length,
    // The detailed session's raw events have one click.
    click_count: isDetailed ? 1 : index,
    error_count: errorCount,
    has_error: errorCount > 0,
    bounced: false,
    entry_page: journey[0],
    exit_page: journey[journey.length - 1],
    journey,
    user: { key: isDetailed ? DETAILED_SESSION.user : null },
    user_agent: firefox
      ? { browser: 'Firefox', browser_version: '131', os: 'Linux' }
      : { browser: 'Chrome', browser_version: '130', os: 'macOS' },
    geo: { country_iso: 'NL', city: 'Amsterdam' },
    web_vitals: { lcp: 1800, cls: 0.05 },
  };
};

/** Raw EDOT Browser events of the detailed session: three pages, a click, a vital and an error. */
const rawEventsOfDetailedSession = (sessionsStartMs: number) => {
  const event = (offsetMs: number, eventName: string, attributes: Record<string, unknown>) => ({
    '@timestamp': at(sessionsStartMs, offsetMs),
    event_name: eventName,
    // Without `telemetry.sdk.language: webjs`, the applications list and its metrics leave them out;
    // the session detail reads them by session ID.
    resource: { attributes: { 'service.name': SESSIONS_APP } },
    attributes: { 'session.id': DETAILED_SESSION.id, ...attributes },
  });
  const url = (page: string) => ({ 'url.full': `https://${SESSIONS_APP}.example.com${page}` });
  const [home, products, cart] = DETAILED_SESSION.pages;
  return [
    event(0, 'browser.navigation', url(home)),
    event(2 * SECOND_MS, 'browser.web_vital', {
      ...url(home),
      'browser.web_vital.name': 'lcp',
      'browser.web_vital.value': 1800,
    }),
    event(20 * SECOND_MS, 'browser.user_action.click', {
      ...url(home),
      'browser.css_selector': 'a#shop-now',
    }),
    event(30 * SECOND_MS, 'browser.navigation', url(products)),
    event(90 * SECOND_MS, 'browser.navigation', url(cart)),
    event(120 * SECOND_MS, 'exception', {
      ...url(cart),
      'exception.type': DETAILED_SESSION.errorType,
      'exception.message': DETAILED_SESSION.errorMessage,
    }),
  ];
};

const rawEventId = (index: number) => `dx-session-event-${index}`;

const RAW_EVENT_IDS = rawEventsOfDetailedSession(0).map((_, index) => rawEventId(index));

/**
 * Sets sessions up as the system user, then writes the mock summaries straight to the sessions
 * index. The transform never rewrites them: their raw events have no `telemetry.sdk.language`, which
 * it filters on.
 */
export const ingestSessionsData = async (esClient: EsClient, kbnClient: KbnClient) => {
  const sessionsStartMs = Date.now() - DAY_MS;
  await kbnClient.request({
    method: 'POST',
    path: '/internal/digital_experience/sessions/enable',
    headers: { 'x-elastic-internal-origin': 'kibana' },
  });

  const summaries = Array.from({ length: SESSION_COUNT }, (_, index) =>
    summaryOf(sessionsStartMs, index)
  );
  const { errors, items } = await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      ...summaries.flatMap((summary) => [
        { index: { _index: SESSIONS_INDEX, _id: summary.session.id } },
        summary,
      ]),
      ...rawEventsOfDetailedSession(sessionsStartMs).flatMap((event, index) => [
        { create: { _index: RAW_EVENTS_INDEX, _id: rawEventId(index) } },
        event,
      ]),
    ],
  });
  const failure = items.find(
    (item) => (item.index ?? item.create)?.error && (item.create?.status ?? 0) !== 409
  );
  if (errors && failure) {
    throw new Error(`Could not ingest the sessions data: ${JSON.stringify(failure)}`);
  }
};

/** Removes the sessions setup and the mock sessions, leaving the rest of the data streams. */
export const deleteSessionsData = async (esClient: EsClient) => {
  const { transforms } = await esClient.transform.getTransform({
    transform_id: SESSIONS_TRANSFORM_PATTERN,
    allow_no_match: true,
  });
  for (const { id } of transforms) {
    await esClient.transform.deleteTransform({ transform_id: id, force: true });
  }
  // Test clusters refuse wildcard deletes (`action.destructive_requires_name`), so by name.
  const indices = Object.keys(
    await esClient.indices.get({
      index: SESSIONS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
    })
  );
  if (indices.length > 0) {
    await esClient.indices.delete({ index: indices });
  }
  await esClient.indices.deleteIndexTemplate(
    { name: SESSIONS_INDEX_TEMPLATE_NAME },
    { ignore: [404] }
  );
  await esClient.ingest.deletePipeline({ id: SESSIONS_PIPELINE_NAME }, { ignore: [404] });
  await esClient.deleteByQuery({
    index: RAW_EVENTS_INDEX,
    query: { ids: { values: RAW_EVENT_IDS } },
    refresh: true,
    ignore_unavailable: true,
  });
};
