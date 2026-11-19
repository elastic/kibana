/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { apiTest, type ApiClientFixture, type EsClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { BROWSER_SDK_LANGUAGE } from '../../../../common/otel_data';
import {
  SESSIONS_INDEX,
  SESSIONS_SOURCE_INDICES,
  type SessionsStatus,
} from '../../../../common/sessions';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import { deleteSessionsData, runSessionsTask } from '../../common/fixtures/sessions_data';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { APPLICATIONS_PATH, COMMON_HEADERS, SESSIONS_ENABLE_PATH, SESSIONS_STATUS_PATH } = testData;

const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';

/** An application no other suite uses, so its numbers are exactly the events below. */
const APP = 'dx-sessions-applications';
// Environments no other suite uses, so the trends of the sessions below are exactly this suite's.
const PRODUCTION = 'dx-sessions-production';
const STAGING = 'dx-sessions-staging';
const NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';

const MINUTE_MS = 60_000;
/** The summaries task is run with `run_soon`, so summarizing takes seconds, not minutes. */
const SUMMARIZE_TIMEOUT_MS = 90_000;
const POLL_MS = 2_000;
const TEST_TIMEOUT_MS = 3 * SUMMARIZE_TIMEOUT_MS;

/** Everything the raw events need, but no read on the sessions index the list reads. */
const NO_SESSIONS_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [...SESSIONS_SOURCE_INDICES], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature: { digital_experience: ['read'], apm: ['read'] }, spaces: ['*'] }],
};

const [ONE, TWO, THREE] = ['dx-sessions-app-1', 'dx-sessions-app-2', 'dx-sessions-app-3'];

/**
 * Three sessions of one EDOT Browser application, with every metric of the list:
 *
 * - `production`: two page loads that took 1,200 ms to load, an LCP of 2,000 ms (good), an INP of
 *   300 ms (needs improvement), a CLS of 0.3 (poor), a JS error, and three requests: a success,
 *   a 500 and one with no response.
 * - `staging`: a page load that took 2,400 ms, an LCP of 5,000 ms (poor), and two requests:
 *   a success and a 404.
 * - no environment: a page load without a load event.
 */
const buildEvents = (baseMs: number) => {
  const at = (offsetMs: number) => new Date(baseMs + offsetMs).toISOString();
  const resource = (environment?: string) => ({
    attributes: {
      'service.name': APP,
      'telemetry.sdk.language': BROWSER_SDK_LANGUAGE,
      ...(environment ? { 'deployment.environment.name': environment } : {}),
    },
  });
  const url = (path: string) => `https://${APP}.example.com${path}`;

  const log = (
    offsetMs: number,
    sessionId: string,
    environment: string | undefined,
    eventName: string,
    attributes: Record<string, unknown> = {}
  ) => ({
    '@timestamp': at(offsetMs),
    event_name: eventName,
    resource: resource(environment),
    attributes: { 'session.id': sessionId, ...attributes },
  });
  const pageLoad = (
    offsetMs: number,
    sessionId: string,
    environment: string | undefined,
    loadTimeMs?: number
  ) =>
    log(offsetMs, sessionId, environment, 'browser.navigation_timing', {
      'url.full': url('/'),
      ...(loadTimeMs === undefined
        ? {}
        : { 'browser.navigation_timing.load_event_end': loadTimeMs }),
    });
  const vital = (
    offsetMs: number,
    sessionId: string,
    environment: string,
    name: string,
    value: number
  ) =>
    log(offsetMs, sessionId, environment, 'browser.web_vital', {
      'browser.web_vital.name': name,
      'browser.web_vital.value': value,
    });

  let spanCount = 0;
  const request = (
    offsetMs: number,
    sessionId: string,
    environment: string,
    statusCode?: number
  ) => {
    spanCount += 1;
    const id = String(spanCount).padStart(16, '0');
    return {
      '@timestamp': at(offsetMs),
      trace_id: `${id}${id}`,
      span_id: id,
      kind: 'Client',
      name: 'fetch GET /api',
      duration: 10_000_000,
      resource: resource(environment),
      attributes: {
        'session.id': sessionId,
        'http.request.method': 'GET',
        'url.full': url('/api'),
        ...(statusCode ? { 'http.response.status_code': statusCode } : {}),
      },
      // A request with no response failed; a 404 is a failure by its status only.
      status: { code: statusCode === undefined || statusCode >= 500 ? 'Error' : 'Unset' },
    };
  };

  return {
    logs: [
      pageLoad(0, ONE, PRODUCTION, 1200),
      pageLoad(MINUTE_MS, ONE, PRODUCTION, 1200),
      vital(5_000, ONE, PRODUCTION, 'lcp', 2000),
      vital(5_000, ONE, PRODUCTION, 'inp', 300),
      vital(5_000, ONE, PRODUCTION, 'cls', 0.3),
      log(30_000, ONE, PRODUCTION, 'exception', {
        'exception.type': 'TypeError',
        'exception.message': 'x is undefined',
      }),
      pageLoad(2 * MINUTE_MS, TWO, STAGING, 2400),
      vital(2 * MINUTE_MS, TWO, STAGING, 'lcp', 5000),
      pageLoad(4 * MINUTE_MS, THREE, undefined),
    ],
    spans: [
      request(10_000, ONE, PRODUCTION, 200),
      request(20_000, ONE, PRODUCTION, 500),
      request(40_000, ONE, PRODUCTION),
      request(2 * MINUTE_MS, TWO, STAGING, 200),
      request(2 * MINUTE_MS + 10_000, TWO, STAGING, 404),
    ],
  };
};

const deleteEvents = (esClient: EsClient) =>
  esClient.deleteByQuery({
    index: [LOGS_INDEX, TRACES_INDEX],
    query: { term: { 'resource.attributes.service.name': APP } },
    refresh: true,
    ignore_unavailable: true,
  });

/** The sessions of a trend, all its buckets together. */
const totalOf = (trend: ApplicationsResponse['sessionsOverTime']) =>
  trend?.reduce((total, { count }) => total + count, 0);

apiTest.describe(
  'Digital Experience applications API from the sessions index',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let eventsStartMs: number;
    let viewerHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;

    const getApplications = async (
      apiClient: ApiClientFixture,
      headers: Record<string, string>,
      environment?: string
    ) => {
      const query = new URLSearchParams({
        start: new Date(eventsStartMs - 10 * MINUTE_MS).toISOString(),
        end: new Date().toISOString(),
        ...(environment ? { environment } : {}),
      });
      const response = await apiClient.get(`${APPLICATIONS_PATH}?${query}`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as ApplicationsResponse;
    };

    const getStatus = async (apiClient: ApiClientFixture, headers: Record<string, string>) => {
      const response = await apiClient.get(SESSIONS_STATUS_PATH, { headers, responseType: 'json' });
      expect(response).toHaveStatusCode(200);
      return response.body as SessionsStatus;
    };

    apiTest.beforeAll(async ({ apiServices, esClient, kbnClient, samlAuth }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
      await deleteSessionsData(esClient, kbnClient);
      await deleteEvents(esClient);
      viewerHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
      };
      adminHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
      };

      // Far enough back for the summaries task's sync delay.
      eventsStartMs = Date.now() - 30 * MINUTE_MS;
      const { logs, spans } = buildEvents(eventsStartMs);
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
    });

    // Removing the task also invalidates the API key enabling sessions granted.
    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
      await deleteSessionsData(esClient, kbnClient);
      await deleteEvents(esClient);
    });

    // One test, as the stages build on each other: a retry in a fresh worker runs `beforeAll` again,
    // which starts before sessions are set up, so it can't be left half-way through the lifecycle.
    apiTest(
      'lists the EDOT Browser applications from the sessions index only',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);

        await apiTest.step(
          'lists no EDOT Browser application before sessions are set up',
          async () => {
            const { applications } = await getApplications(apiClient, viewerHeaders);
            expect(findApplication(applications, APP, 'otel')).toBeUndefined();
          }
        );

        await apiTest.step(
          'has the app set sessions up only for a user who can set them up',
          async () => {
            expect(await getStatus(apiClient, adminHeaders)).toMatchObject({
              installed: false,
              autoEnable: true,
            });
            expect(await getStatus(apiClient, viewerHeaders)).toMatchObject({
              installed: false,
              autoEnable: false,
            });
          }
        );

        await apiTest.step(
          'sets sessions up and waits for the summaries task to summarize the events',
          async () => {
            const enable = await apiClient.post(SESSIONS_ENABLE_PATH, {
              headers: adminHeaders,
              responseType: 'json',
            });
            expect(enable).toHaveStatusCode(200);

            await expect
              .poll(
                async () => {
                  await runSessionsTask(kbnClient);
                  const { count } = await esClient.count({
                    index: SESSIONS_INDEX,
                    query: { term: { 'service.name': APP } },
                    ignore_unavailable: true,
                  });
                  return count;
                },
                { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
              )
              .toBe(3);

            const status = await getStatus(apiClient, adminHeaders);
            expect(status).toMatchObject({ installed: true, autoEnable: false });
          }
        );

        await apiTest.step('lists the application with the metrics of its sessions', async () => {
          const { applications, environments, sessionsOverTime } = await getApplications(
            apiClient,
            viewerHeaders
          );

          const application = findApplication(applications, APP, 'otel');
          expect(application).toMatchObject({
            pageLoads: { count: 4 },
            sessions: { count: 3 },
            jsErrors: { count: 1, perPageLoad: 0.25 },
            httpRequests: { count: 5, failedCount: 3, failedRatio: 0.6 },
            webVitals: {
              lcp: { sampleCount: 2, ratings: { good: 0.5, needsImprovement: 0, poor: 0.5 } },
              inp: { sampleCount: 1, ratings: { good: 0, needsImprovement: 1, poor: 0 } },
              cls: { sampleCount: 1, ratings: { good: 0, needsImprovement: 0, poor: 1 } },
              fcp: { sampleCount: 0 },
              ttfb: { sampleCount: 0 },
            },
          });
          expect([...(application?.environments ?? [])].sort()).toStrictEqual([
            PRODUCTION,
            STAGING,
          ]);
          // All three sessions started within the range; the trend covers every application, so
          // other suites' sessions may add to it.
          expect(totalOf(sessionsOverTime)).toBeGreaterThanOrEqual(3);
          expect(environments).toStrictEqual(
            expect.arrayContaining([PRODUCTION, STAGING, NOT_DEFINED])
          );
        });

        await apiTest.step('keeps the load time of each session', async () => {
          const { hits } = await esClient.search<{
            session: { id: string };
            load_time: { p75: number | null; count: number };
          }>({
            index: SESSIONS_INDEX,
            query: { term: { 'service.name': APP } },
            _source: ['session.id', 'load_time'],
          });
          const loadTimes = Object.fromEntries(
            hits.hits.map(({ _source }) => [_source?.session.id, _source?.load_time])
          );

          expect(loadTimes).toStrictEqual({
            [ONE]: { p75: 1200, count: 2 },
            [TWO]: { p75: 2400, count: 1 },
            [THREE]: { p75: null, count: 0 },
          });
        });

        await apiTest.step(
          'reports EDOT Browser as partially available to a user who can not read the sessions',
          async () => {
            const { cookieHeader } = await samlAuth.asInteractiveUser(NO_SESSIONS_READ_ROLE);

            const { applications, partiallyAvailableSources } = await getApplications(apiClient, {
              ...COMMON_HEADERS,
              ...cookieHeader,
            });

            // Elasticsearch skips the sessions index this user can't read instead of failing.
            expect(findApplication(applications, APP, 'otel')).toBeUndefined();
            expect(partiallyAvailableSources).toContain('otel');
          }
        );

        await apiTest.step('narrows the sessions to an environment', async () => {
          const staging = await getApplications(apiClient, viewerHeaders, STAGING);
          expect(findApplication(staging.applications, APP, 'otel')).toMatchObject({
            environments: [STAGING],
            pageLoads: { count: 1 },
            sessions: { count: 1 },
            jsErrors: { count: 0, perPageLoad: 0 },
            httpRequests: { count: 2, failedCount: 1, failedRatio: 0.5 },
            webVitals: {
              lcp: { sampleCount: 1, ratings: { good: 0, needsImprovement: 0, poor: 1 } },
            },
          });
          // Only this suite has sessions in its environments, so the trend is its one.
          expect(totalOf(staging.sessionsOverTime)).toBe(1);
          // The picker keeps every environment, whatever the selected one.
          expect(staging.environments).toStrictEqual(
            expect.arrayContaining([PRODUCTION, STAGING, NOT_DEFINED])
          );

          const notDefined = await getApplications(apiClient, viewerHeaders, NOT_DEFINED);
          expect(findApplication(notDefined.applications, APP, 'otel')).toMatchObject({
            environments: [],
            pageLoads: { count: 1 },
            sessions: { count: 1 },
            httpRequests: { count: 0, failedCount: 0, failedRatio: null },
          });
        });
      }
    );
  }
);
