/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KbnClient } from '@kbn/scout-oblt';
import {
  MOBILE_SESSIONS_INDEX_PATTERN,
  MOBILE_SESSIONS_INDEX_TEMPLATE_NAME,
  MOBILE_SESSIONS_TASK_ID,
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_TASK_ID,
  type SessionsStatus,
} from '../../../../common/sessions';
import { OTEL_APPS, SERVICE_NAME, STAGING_ENVIRONMENT } from './constants';

/** The application of the mock sessions. */
export const SESSIONS_APP = OTEL_APPS.shop;

/**
 * The other EDOT Browser applications of the applications list, a session each, in the
 * environments they have in the mock OTel data.
 */
const LIST_APPLICATIONS: ReadonlyArray<{ service: string; environment: string | null }> = [
  { service: OTEL_APPS.checkout, environment: 'production' },
  { service: OTEL_APPS.docs, environment: STAGING_ENVIRONMENT },
  { service: OTEL_APPS.blog, environment: null },
  { service: SERVICE_NAME, environment: 'production' },
];

/**
 * The mock sessions are from the last day: the summaries task deletes summaries that ended more
 * than 31 days ago, so ones from `TIME_RANGE` would vanish at its next run.
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

/** Sessions with JS errors: the detailed one and `dx-session-02`. */
export const SESSIONS_WITH_JS_ERRORS = 2;

/** Sessions on Firefox: every third one. */
export const FIREFOX_SESSIONS = 4;

const RAW_EVENTS_INDEX = 'logs-generic.otel-default';
const SECOND_MS = 1000;
const DAY_MS = 24 * 60 * 60 * SECOND_MS;

const at = (startMs: number, offsetMs: number) => new Date(startMs + offsetMs).toISOString();

const sessionId = (index: number) => `dx-session-${String(index + 1).padStart(2, '0')}`;

/** How long after the first session the one at `index` starts. */
export const sessionStartOffsetMs = (index: number): number => {
  return index * 4 * 60 * SECOND_MS;
};

/** The pages the session at `index` loads, one page load each. */
export const sessionJourney = (index: number): string[] => {
  return index === 0 ? [...DETAILED_SESSION.pages] : ['/', `/products/${index}`];
};

/** A summary as the summaries task writes it. */
const summaryOf = (
  sessionsStartMs: number,
  index: number,
  {
    id = sessionId(index),
    environment = 'production',
    service = SESSIONS_APP,
  }: { id?: string; environment?: string | null; service?: string } = {}
) => {
  const isDetailed = index === 0;
  const startMs = sessionStartOffsetMs(index);
  const durationMs = isDetailed ? 150 * SECOND_MS : (index + 1) * 10 * SECOND_MS;
  const errorCount = index < SESSIONS_WITH_JS_ERRORS ? index + 1 : 0;
  const journey = sessionJourney(index);
  const firefox = index % 3 === 2;
  const user = isDetailed ? DETAILED_SESSION.user : null;
  const userAgent = firefox
    ? { browser: 'Firefox', browser_version: '131', os: 'Linux' }
    : { browser: 'Chrome', browser_version: '130', os: 'macOS' };
  return {
    session: { id },
    service: { name: service },
    start_time: at(sessionsStartMs, startMs),
    end_time: at(sessionsStartMs, startMs + durationMs),
    duration_ms: durationMs,
    event_count: 10,
    page_view_count: journey.length,
    // What the applications list counts: a page load per page, and two requests, some failed.
    page_load_count: journey.length,
    js_error_count: errorCount,
    http_request_count: 2,
    http_failed_request_count: index % 4 === 0 ? 1 : 0,
    environment,
    // The detailed session's raw events have one click.
    click_count: isDetailed ? 1 : index,
    bounced: false,
    entry_page: journey[0],
    exit_page: journey[journey.length - 1],
    journey,
    user: { key: user },
    user_agent: userAgent,
    geo: { country_iso: 'NL', city: 'Amsterdam' },
    search: [
      ...new Set(
        [sessionId(index), user, userAgent.browser, userAgent.os, 'NL', 'Amsterdam', ...journey]
          .filter((value): value is string => value !== null)
          .map((value) => value.toLowerCase())
      ),
    ],
    web_vitals: { lcp: 1800, cls: 0.05 },
    web_vital_samples: {
      lcp: { count: 1, good: 1, needs_improvement: 0, poor: 0 },
      cls: { count: 1, good: 1, needs_improvement: 0, poor: 0 },
    },
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

const enableSessions = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: '/internal/digital_experience/sessions/enable',
    headers: { 'x-elastic-internal-origin': 'kibana' },
  });
};

/**
 * Sets sessions up as the system user, then writes the mock summaries, and a session of each other
 * application of the list, straight to the sessions index. The summaries task never rewrites them: their raw events have no
 * `telemetry.sdk.language`, which it filters on.
 */
export const ingestSessionsData = async (esClient: EsClient, kbnClient: KbnClient) => {
  const sessionsStartMs = Date.now() - DAY_MS;
  await enableSessions(kbnClient);

  const summaries = [
    ...Array.from({ length: SESSION_COUNT }, (_, index) => summaryOf(sessionsStartMs, index)),
    ...LIST_APPLICATIONS.map(({ service, environment }) =>
      summaryOf(sessionsStartMs, SESSION_COUNT, {
        id: `dx-session-${service}`,
        environment,
        service,
      })
    ),
  ];
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

/**
 * Runs the summaries task now instead of at its next interval; a run already in progress counts.
 * The route answers 200 with the error, so it is thrown here.
 */
export const runSessionsTask = async (kbnClient: KbnClient) => {
  const { data } = await kbnClient.request<{ error?: string }>({
    method: 'POST',
    path: `/internal/ftr/task_manager/${encodeURIComponent(SESSIONS_TASK_ID)}/run_soon`,
    headers: { 'x-elastic-internal-origin': 'kibana' },
  });
  if (data.error && !data.error.includes('as it is currently running')) {
    throw new Error(`Could not run the summaries task: ${data.error}`);
  }
};

/** Whether sessions are set up: the summaries task is scheduled, as the route reads it. */
const areSessionsInstalled = async (kbnClient: KbnClient): Promise<boolean> => {
  const { data } = await kbnClient.request<SessionsStatus>({
    method: 'GET',
    path: '/internal/digital_experience/sessions/status',
    headers: { 'x-elastic-internal-origin': 'kibana' },
  });
  return data.installed;
};

/**
 * Removes the browser and mobile summaries tasks, which also invalidates their API keys; a missing
 * task is fine.
 */
export const removeSessionsTask = async (kbnClient: KbnClient) => {
  for (const taskId of [SESSIONS_TASK_ID, MOBILE_SESSIONS_TASK_ID]) {
    await kbnClient.request({
      method: 'DELETE',
      path: `/internal/task_manager/tasks/${encodeURIComponent(taskId)}`,
      headers: { 'x-elastic-internal-origin': 'kibana' },
      ignoreErrors: [404],
    });
  }
};

const deleteSessionsIndices = async (esClient: EsClient) => {
  // Test clusters refuse wildcard deletes (`action.destructive_requires_name`), so by name.
  const indices = Object.keys(
    await esClient.indices.get({
      index: [SESSIONS_INDEX_PATTERN, MOBILE_SESSIONS_INDEX_PATTERN],
      ignore_unavailable: true,
      allow_no_indices: true,
    })
  );
  if (indices.length > 0) {
    await esClient.indices.delete({ index: indices });
  }
};

const deleteSessionsTemplate = async (esClient: EsClient) => {
  for (const name of [SESSIONS_INDEX_TEMPLATE_NAME, MOBILE_SESSIONS_INDEX_TEMPLATE_NAME]) {
    await esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
  }
};

/** Removes the sessions setup and the mock sessions, leaving the rest of the data streams. */
export const deleteSessionsData = async (esClient: EsClient, kbnClient: KbnClient) => {
  await removeSessionsTask(kbnClient);
  await deleteSessionsIndices(esClient);
  await deleteSessionsTemplate(esClient);
  await esClient.deleteByQuery({
    index: RAW_EVENTS_INDEX,
    query: { ids: { values: RAW_EVENT_IDS } },
    refresh: true,
    ignore_unavailable: true,
  });
};

/** Mock sessions a suite owns: their own ids and environment, so it reads and deletes only them. */
export interface OwnedSessions {
  idPrefix: string;
  environment: string;
  count: number;
}

const ownedSessionIds = ({ idPrefix, count }: OwnedSessions): string[] => {
  return Array.from({ length: count }, (_, index) => {
    return `${idPrefix}-${index}`;
  });
};

/** What `setUpOwnedSessions` created, so `deleteOwnedSessions` removes only that. */
export interface OwnedSessionsSetup {
  createdTask: boolean;
  createdIndex: boolean;
  createdTemplate: boolean;
}

/** Sets sessions up when they aren't, resolving to what it created for `deleteOwnedSessions`. */
export const setUpOwnedSessions = async (
  esClient: EsClient,
  kbnClient: KbnClient
): Promise<OwnedSessionsSetup> => {
  const setup: OwnedSessionsSetup = {
    createdTask: !(await areSessionsInstalled(kbnClient)),
    createdIndex: !(await esClient.indices.exists({ index: SESSIONS_INDEX })),
    createdTemplate: !(await esClient.indices.existsIndexTemplate({
      name: SESSIONS_INDEX_TEMPLATE_NAME,
    })),
  };
  if (setup.createdTask) {
    await enableSessions(kbnClient);
  }
  return setup;
};

const indexOwnedSessions = async (
  esClient: EsClient,
  summaries: ReadonlyArray<ReturnType<typeof summaryOf>>
): Promise<void> => {
  const { errors, items } = await esClient.bulk({
    refresh: 'wait_for',
    operations: summaries.flatMap((summary) => {
      return [{ index: { _index: SESSIONS_INDEX, _id: summary.session.id } }, summary];
    }),
  });
  if (errors) {
    const failure = items.find((item) => {
      return item.index?.error;
    });
    throw new Error(`Could not ingest the owned sessions: ${JSON.stringify(failure)}`);
  }
};

/** Writes `sessions` from a day ago, resolving to when the first one starts. */
export const ingestOwnedSessions = async (
  esClient: EsClient,
  sessions: OwnedSessions
): Promise<number> => {
  const sessionsStartMs = Date.now() - DAY_MS;
  await indexOwnedSessions(
    esClient,
    ownedSessionIds(sessions).map((id, index) => {
      return summaryOf(sessionsStartMs, index, { id, environment: sessions.environment });
    })
  );
  return sessionsStartMs;
};

/** Writes one session of `sessions` with a single page load at each of `startTimes`. */
export const ingestOwnedSessionsAt = async (
  esClient: EsClient,
  sessions: OwnedSessions,
  startTimes: readonly number[]
): Promise<void> => {
  const ids = ownedSessionIds(sessions);
  await indexOwnedSessions(
    esClient,
    startTimes.map((startMs, index) => {
      return {
        ...summaryOf(startMs - sessionStartOffsetMs(index), index, {
          id: ids[index],
          environment: sessions.environment,
        }),
        page_load_count: 1,
      };
    })
  );
};

/**
 * Deletes `sessions`, also after a partial ingest, and the parts of the sessions setup that
 * `setUpOwnedSessions` created; without `setup`, as when it failed, only the sessions.
 */
export const deleteOwnedSessions = async (
  esClient: EsClient,
  kbnClient: KbnClient,
  sessions: OwnedSessions,
  setup: OwnedSessionsSetup | undefined
): Promise<void> => {
  await esClient.deleteByQuery({
    index: SESSIONS_INDEX,
    query: { ids: { values: ownedSessionIds(sessions) } },
    refresh: true,
    ignore_unavailable: true,
  });
  if (setup?.createdTask) {
    await removeSessionsTask(kbnClient);
  }
  if (setup?.createdIndex) {
    await deleteSessionsIndices(esClient);
  }
  if (setup?.createdTemplate) {
    await deleteSessionsTemplate(esClient);
  }
};
