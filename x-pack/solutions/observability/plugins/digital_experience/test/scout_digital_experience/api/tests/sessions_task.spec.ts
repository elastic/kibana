/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, type ApiClientFixture, type EsClient, type KbnClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { BROWSER_SDK_LANGUAGE } from '../../../../common/otel_data';
import {
  SESSIONS_INDEX,
  SESSIONS_TASK_ID,
  SESSIONS_TASK_TYPE,
  type SessionsStatus,
} from '../../../../common/sessions';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, SESSIONS_ENABLE_PATH } = testData;

const STATUS_PATH = 'internal/digital_experience/sessions/status';
const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';

/** An application and environment no other suite uses, so its summaries are exactly these. */
const APP = 'dx-sessions-contract';
const ENVIRONMENT = 'dx-sessions-contract-env';
// Uppercase, as EDOT iOS writes them: the hash ranges take any id.
const SESSION = 'DX-CONTRACT-SESSION-1';
const SESSION_AFTER_NEW_KEY = 'DX-CONTRACT-SESSION-2';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
/** The task is run with `run_soon`, so summarizing takes seconds, not minutes. */
const SUMMARIZE_TIMEOUT_MS = 90_000;
const POLL_MS = 2_000;
const TEST_TIMEOUT_MS = 4 * SUMMARIZE_TIMEOUT_MS;

/** Task Manager names the key it grants after the task type and the user. */
const TASK_API_KEY_NAME_PREFIX = `TaskManager: ${SESSIONS_TASK_TYPE}`;

const resource = {
  attributes: {
    'service.name': APP,
    'telemetry.sdk.language': BROWSER_SDK_LANGUAGE,
    'deployment.environment.name': ENVIRONMENT,
    'browser.name': 'Chrome',
    'browser.version': '130',
    'os.name': 'macOS',
  },
};

const url = (path: string) => `https://${APP}.example.com${path}`;

/**
 * One session's OTel events, with something for every field of the summary: three page views of
 * two pages (one by its hash route), a page load, two web vitals, a click, a JS error with the
 * user and location, and three requests: a success, a 503 and one with no response.
 */
const buildEvents = (sessionId: string, startMs: number) => {
  const at = (offsetMs: number) => new Date(startMs + offsetMs).toISOString();
  const log = (offsetMs: number, eventName: string, attributes: Record<string, unknown> = {}) => ({
    '@timestamp': at(offsetMs),
    event_name: eventName,
    resource,
    attributes: { 'session.id': sessionId, ...attributes },
  });
  let spans = 0;
  const request = (offsetMs: number, method: string, statusCode?: number) => {
    spans += 1;
    const id = `${sessionId.length}${String(spans).padStart(15, '0')}`;
    return {
      '@timestamp': at(offsetMs),
      trace_id: `${id}${id}`,
      span_id: id,
      kind: 'Client',
      name: `fetch ${method} /api`,
      duration: 10_000_000,
      resource,
      attributes: {
        'session.id': sessionId,
        'http.request.method': method,
        'url.full': url('/api'),
        ...(statusCode ? { 'http.response.status_code': statusCode } : {}),
      },
      status: { code: statusCode === undefined || statusCode >= 500 ? 'Error' : 'Unset' },
    };
  };
  return {
    logs: [
      log(0, 'browser.navigation_timing', { 'url.full': url('/home?ref=ad') }),
      log(0, 'browser.navigation', { 'url.full': url('/home?ref=ad') }),
      log(2 * SECOND_MS, 'browser.web_vital', {
        'browser.web_vital.name': 'LCP',
        'browser.web_vital.value': 2000,
      }),
      log(3 * SECOND_MS, 'browser.web_vital', {
        'browser.web_vital.name': 'cls',
        'browser.web_vital.value': 0.1,
      }),
      log(10 * SECOND_MS, 'browser.user_action.click', { 'browser.css_selector': 'a#cart' }),
      log(20 * SECOND_MS, 'browser.navigation', { 'url.full': url('/#/cart') }),
      log(25 * SECOND_MS, 'exception', {
        'exception.type': 'TypeError',
        'exception.message': 'cart is undefined',
        'user.email': 'jane@example.com',
        'client.geo.country_iso_code': 'NL',
        'client.geo.city_name': 'Amsterdam',
        // A geo_point, which the summary reads back from ES|QL's WKT.
        'client.geo.location': { lat: 52.3676, lon: 4.9041 },
      }),
      log(30 * SECOND_MS, 'browser.navigation', { 'url.full': url('/home') }),
    ],
    spans: [
      request(12 * SECOND_MS, 'GET', 200),
      request(14 * SECOND_MS, 'POST', 503),
      request(16 * SECOND_MS, 'GET'),
    ],
  };
};

const ingestEvents = async (esClient: EsClient, sessionId: string, startMs: number) => {
  const { logs, spans } = buildEvents(sessionId, startMs);
  const { errors, items } = await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      ...logs.flatMap((document) => [{ create: { _index: LOGS_INDEX } }, document]),
      ...spans.flatMap((document) => [{ create: { _index: TRACES_INDEX } }, document]),
    ],
  });
  if (errors) {
    throw new Error(`Could not ingest the events: ${JSON.stringify(items)}`);
  }
};

const deleteEvents = (esClient: EsClient) =>
  esClient.deleteByQuery({
    index: [LOGS_INDEX, TRACES_INDEX],
    query: { term: { 'resource.attributes.service.name': APP } },
    refresh: true,
    ignore_unavailable: true,
  });

/** Runs the summaries task now instead of at its next interval. */
const runSessionsTask = (kbnClient: KbnClient) =>
  kbnClient.request({
    method: 'POST',
    path: `/internal/ftr/task_manager/${encodeURIComponent(SESSIONS_TASK_ID)}/run_soon`,
    headers: { 'x-elastic-internal-origin': 'kibana' },
  });

const getSummary = async (esClient: EsClient, sessionId: string) => {
  const { hits } = await esClient.search({
    index: SESSIONS_INDEX,
    ignore_unavailable: true,
    query: { term: { 'session.id': sessionId } },
  });
  return hits.hits[0]?._source;
};

/** The task's API keys that still work. */
const activeTaskApiKeyIds = async (esClient: EsClient): Promise<string[]> => {
  const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
    size: 100,
    query: {
      bool: {
        filter: [{ prefix: { name: TASK_API_KEY_NAME_PREFIX } }, { term: { invalidated: false } }],
      },
    },
  });
  return apiKeys.map(({ id }) => id);
};

apiTest.describe(
  'Digital Experience session summaries task',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let adminHeaders: Record<string, string>;

    const getStatus = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.get(STATUS_PATH, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as SessionsStatus;
    };

    const enable = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.post(SESSIONS_ENABLE_PATH, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as SessionsStatus;
    };

    apiTest.beforeAll(async ({ esClient, kbnClient, samlAuth }) => {
      await deleteSessionsData(esClient, kbnClient);
      await deleteEvents(esClient);
      adminHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
      };
    });

    // Removing the task also invalidates its API key.
    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      await deleteSessionsData(esClient, kbnClient);
      await deleteEvents(esClient);
    });

    // One test, as the stages build on each other: a retry in a fresh worker runs `beforeAll` again.
    apiTest(
      'summarizes the OTel events of a session, and recovers from an invalidated key',
      async ({ apiClient, esClient, kbnClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        // Far enough back for the task's sync delay.
        const startMs = Date.now() - 20 * MINUTE_MS;

        await apiTest.step('builds the expected summary from the events', async () => {
          await ingestEvents(esClient, SESSION, startMs);
          const status = await enable(apiClient);
          expect(status).toMatchObject({ installed: true, apiKeyInvalid: false });

          await expect
            .poll(
              async () => {
                await runSessionsTask(kbnClient);
                return (await getSummary(esClient, SESSION)) !== undefined;
              },
              { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
            )
            .toBe(true);

          const at = (offsetMs: number) => new Date(startMs + offsetMs).toISOString();
          const noSamples = { count: 0, good: 0, needs_improvement: 0, poor: 0 };
          expect(await getSummary(esClient, SESSION)).toStrictEqual({
            session: { id: SESSION },
            service: { name: APP },
            start_time: at(0),
            end_time: at(30 * SECOND_MS),
            duration_ms: 30 * SECOND_MS,
            event_count: 11,
            page_view_count: 3,
            page_load_count: 1,
            click_count: 1,
            js_error_count: 1,
            http_request_count: 3,
            http_failed_request_count: 2,
            bounced: false,
            // Pages in first-view order, once each, without their query string.
            journey: ['/home', '/cart'],
            entry_page: '/home',
            exit_page: '/home',
            environment: ENVIRONMENT,
            user: { key: 'jane@example.com' },
            user_agent: { browser: 'Chrome', browser_version: '130', os: 'macOS', device: null },
            geo: {
              country_iso: 'NL',
              region: null,
              city: 'Amsterdam',
              location: { lat: 52.3676, lon: 4.9041 },
            },
            // A float field stores 0.1 as its nearest float.
            web_vitals: { lcp: 2000, inp: null, cls: Math.fround(0.1), fcp: null, ttfb: null },
            web_vital_samples: {
              lcp: { count: 1, good: 1, needs_improvement: 0, poor: 0 },
              inp: noSamples,
              cls: { count: 1, good: 1, needs_improvement: 0, poor: 0 },
              fcp: noSamples,
              ttfb: noSamples,
            },
            search: [
              SESSION.toLowerCase(),
              'jane@example.com',
              'chrome',
              'macos',
              'nl',
              'amsterdam',
              '/home',
              '/cart',
            ],
          });

          await expect
            .poll(
              async () => {
                const { health, rebuilding, enabledBy } = await getStatus(apiClient);
                return { health, rebuilding, hasEnabledBy: enabledBy !== null };
              },
              { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
            )
            .toStrictEqual({ health: 'healthy', rebuilding: false, hasEnabledBy: true });
        });

        await apiTest.step('reports an invalidated key, and stops summarizing', async () => {
          const keyIds = await activeTaskApiKeyIds(esClient);
          expect(keyIds.length).toBeGreaterThan(0);
          await esClient.security.invalidateApiKey({ ids: keyIds });

          await expect
            .poll(
              async () => {
                await runSessionsTask(kbnClient);
                const { apiKeyInvalid, health } = await getStatus(apiClient);
                return { apiKeyInvalid, health };
              },
              { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
            )
            .toStrictEqual({ apiKeyInvalid: true, health: 'degraded' });
        });

        await apiTest.step('summarizes again once sessions are enabled again', async () => {
          const status = await enable(apiClient);
          expect(status.apiKeyInvalid).toBe(false);
          // After the checkpoint, which is a minute before the last successful run: the task leaves
          // out events older than it, as it already summarized that time.
          await ingestEvents(esClient, SESSION_AFTER_NEW_KEY, Date.now() - 30 * SECOND_MS);

          await expect
            .poll(
              async () => {
                await runSessionsTask(kbnClient);
                return (await getSummary(esClient, SESSION_AFTER_NEW_KEY)) !== undefined;
              },
              { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
            )
            .toBe(true);
          // The summaries of the first key are kept.
          expect(await getSummary(esClient, SESSION)).toBeDefined();
          expect((await getStatus(apiClient)).health).toBe('healthy');
        });
      }
    );
  }
);
