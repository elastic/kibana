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
  SESSIONS_TRANSFORM_ID,
  type SessionsStatus,
} from '../../../../common/sessions';
import type {
  ApplicationSummary,
  ApplicationsResponse,
} from '../../../../common/types/applications';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { APPLICATIONS_PATH, COMMON_HEADERS, SESSIONS_ENABLE_PATH } = testData;

const SESSIONS_STATUS_PATH = 'internal/digital_experience/sessions/status';

const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';

/** An application no other suite uses, so its numbers are exactly the events below. */
const APP = 'dx-sessions-applications';
const PRODUCTION = 'production';
const STAGING = 'staging';
const NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';

const MINUTE_MS = 60_000;
/** Checkpoints are triggered with `_schedule_now`, so summarizing takes seconds, not minutes. */
const SUMMARIZE_TIMEOUT_MS = 90_000;
const POLL_MS = 2_000;
const TEST_TIMEOUT_MS = 3 * SUMMARIZE_TIMEOUT_MS;

/** Everything the list needs from the raw events, but no read on the sessions index. */
const NO_SESSIONS_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [...SESSIONS_SOURCE_INDICES], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature: { digital_experience: ['read'], apm: ['read'] }, spaces: ['*'] }],
};

/**
 * Three sessions of one EDOT Browser application, with every metric of the list:
 *
 * - `production`: two page loads, an LCP of 2,000 ms (good), an INP of 300 ms (needs improvement),
 *   a CLS of 0.3 (poor), a JS error, and three requests: a success, a 500 and one with no response.
 * - `staging`: a page load, an LCP of 5,000 ms (poor), and two requests: a success and a 404.
 * - no environment: a page load.
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
  const pageLoad = (offsetMs: number, sessionId: string, environment: string | undefined) =>
    log(offsetMs, sessionId, environment, 'browser.navigation_timing', { 'url.full': url('/') });
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

  const [one, two, three] = ['dx-sessions-app-1', 'dx-sessions-app-2', 'dx-sessions-app-3'];
  return {
    logs: [
      pageLoad(0, one, PRODUCTION),
      pageLoad(MINUTE_MS, one, PRODUCTION),
      vital(5_000, one, PRODUCTION, 'lcp', 2000),
      vital(5_000, one, PRODUCTION, 'inp', 300),
      vital(5_000, one, PRODUCTION, 'cls', 0.3),
      log(30_000, one, PRODUCTION, 'exception', {
        'exception.type': 'TypeError',
        'exception.message': 'x is undefined',
      }),
      pageLoad(2 * MINUTE_MS, two, STAGING),
      vital(2 * MINUTE_MS, two, STAGING, 'lcp', 5000),
      pageLoad(4 * MINUTE_MS, three, undefined),
    ],
    spans: [
      request(10_000, one, PRODUCTION, 200),
      request(20_000, one, PRODUCTION, 500),
      request(40_000, one, PRODUCTION),
      request(2 * MINUTE_MS, two, STAGING, 200),
      request(2 * MINUTE_MS + 10_000, two, STAGING, 404),
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

/** The row without the order of its environments, which the sources list by their own counts. */
const comparable = (application?: ApplicationSummary) =>
  application && { ...application, environments: [...application.environments].sort() };

apiTest.describe(
  'Digital Experience applications API from the sessions index',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let eventsStartMs: number;
    let viewerHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;
    /** What the raw events give, before sessions are set up: the numbers the sessions must match. */
    let rawApplication: ApplicationSummary | undefined;

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

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      await deleteSessionsData(esClient);
      await deleteEvents(esClient);
      viewerHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
      };
      adminHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
      };

      // Far enough back for the transform's sync delay.
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

    apiTest.afterAll(async ({ esClient }) => {
      await deleteSessionsData(esClient);
      await deleteEvents(esClient);
    });

    apiTest('reads the raw events while sessions are not set up', async ({ apiClient }) => {
      const { applications, environments } = await getApplications(apiClient, viewerHeaders);

      rawApplication = findApplication(applications, APP, 'otel');
      expect(rawApplication).toMatchObject({
        pageLoads: { count: 4 },
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
      expect([...(rawApplication?.environments ?? [])].sort()).toStrictEqual([PRODUCTION, STAGING]);
      expect(environments).toStrictEqual(
        expect.arrayContaining([PRODUCTION, STAGING, NOT_DEFINED])
      );
    });

    apiTest(
      'sets sessions up and waits for the transform to summarize the events',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const enable = await apiClient.post(SESSIONS_ENABLE_PATH, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(enable).toHaveStatusCode(200);

        await expect
          .poll(
            async () => {
              await esClient.transform.scheduleNowTransform({
                transform_id: SESSIONS_TRANSFORM_ID,
              });
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

        // The list reads the sessions only once their transforms are healthy and past their first
        // checkpoint, so a build in progress is never shown as lower numbers.
        await expect
          .poll(
            async () => {
              const response = await apiClient.get(SESSIONS_STATUS_PATH, {
                headers: viewerHeaders,
                responseType: 'json',
              });
              const { health, rebuilding } = response.body as SessionsStatus;
              return `${health}${rebuilding ? ' (rebuilding)' : ''}`;
            },
            { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
          )
          .toBe('healthy');
      }
    );

    apiTest(
      'still reads the raw events for a user who can not read the sessions index',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_SESSIONS_READ_ROLE);

        const { applications } = await getApplications(apiClient, {
          ...COMMON_HEADERS,
          ...cookieHeader,
        });

        expect(comparable(findApplication(applications, APP, 'otel'))).toStrictEqual(
          comparable(rawApplication)
        );
      }
    );

    apiTest(
      'reads the sessions index, with the numbers of the raw events, once they are gone',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        // The sessions keep their summaries when the events they summarize are deleted, so an
        // application that stays in the list is read from them.
        await deleteEvents(esClient);

        await expect
          .poll(
            async () =>
              comparable(
                findApplication(
                  (
                    await getApplications(apiClient, viewerHeaders)
                  ).applications,
                  APP,
                  'otel'
                )
              ),
            { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
          )
          .toStrictEqual(comparable(rawApplication));

        const { environments } = await getApplications(apiClient, viewerHeaders);
        expect(environments).toStrictEqual(
          expect.arrayContaining([PRODUCTION, STAGING, NOT_DEFINED])
        );
      }
    );

    apiTest('narrows the sessions to an environment', async ({ apiClient }) => {
      const staging = await getApplications(apiClient, viewerHeaders, STAGING);
      expect(findApplication(staging.applications, APP, 'otel')).toMatchObject({
        environments: [STAGING],
        pageLoads: { count: 1 },
        jsErrors: { count: 0, perPageLoad: 0 },
        httpRequests: { count: 2, failedCount: 1, failedRatio: 0.5 },
        webVitals: { lcp: { sampleCount: 1, ratings: { good: 0, needsImprovement: 0, poor: 1 } } },
      });
      // The picker keeps every environment, whatever the selected one.
      expect(staging.environments).toStrictEqual(
        expect.arrayContaining([PRODUCTION, STAGING, NOT_DEFINED])
      );

      const notDefined = await getApplications(apiClient, viewerHeaders, NOT_DEFINED);
      expect(findApplication(notDefined.applications, APP, 'otel')).toMatchObject({
        environments: [],
        pageLoads: { count: 1 },
        httpRequests: { count: 0, failedCount: 0, failedRatio: null },
      });
    });
  }
);
