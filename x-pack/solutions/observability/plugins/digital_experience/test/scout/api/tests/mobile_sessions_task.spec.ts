/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, type ApiClientFixture, type EsClient, type KbnClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  MOBILE_SESSIONS_INDEX,
  MOBILE_SESSIONS_TASK_ID,
  type SessionsStatusResponse,
} from '../../../../common/sessions';
import { deleteSessionsData } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { COMMON_HEADERS, SESSIONS_ENABLE_PATH } = testData;

const STATUS_PATH = 'internal/digital_experience/sessions/status';
const LOGS_INDEX = 'logs-generic.otel-default';
const TRACES_INDEX = 'traces-generic.otel-default';

/** Applications and an environment no other suite uses, so their summaries are exactly these. */
const IOS_APP = 'dx-mobile-contract-ios';
const ANDROID_APP = 'dx-mobile-contract-android';
const BACKEND_APP = 'dx-mobile-contract-backend';
const APPS = [IOS_APP, ANDROID_APP, BACKEND_APP];
const ENVIRONMENT = 'dx-mobile-contract-env';
const IOS_SESSION = 'DX-MOBILE-IOS-SESSION-1';
const ANDROID_SESSION = 'dx-mobile-android-session-1';
const BACKEND_SESSION = 'dx-mobile-backend-session-1';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** The task is run with `run_soon`, so summarizing takes seconds, not minutes. */
const SUMMARIZE_TIMEOUT_MS = 90_000;
const POLL_MS = 2_000;

const iosResource = {
  attributes: {
    'service.name': IOS_APP,
    'service.version': '2.3.0',
    'app.build_id': '230',
    'telemetry.sdk.name': 'iOS',
    'telemetry.sdk.language': 'swift',
    'deployment.environment.name': ENVIRONMENT,
    'device.model.identifier': 'iPhone15,2',
    'device.manufacturer': 'Apple',
    'os.name': 'iOS',
    'os.version': '18.1',
  },
};

const androidResource = {
  attributes: {
    'service.name': ANDROID_APP,
    'service.version': '5.0.1',
    'telemetry.sdk.name': 'android',
    // As any Java backend's: the task tells them apart by the SDK name.
    'telemetry.sdk.language': 'java',
    'deployment.environment.name': ENVIRONMENT,
    'device.model.name': 'Pixel 8',
    'device.manufacturer': 'Google',
    'os.name': 'Android',
    'os.version': '15',
  },
};

const backendResource = {
  attributes: {
    'service.name': BACKEND_APP,
    'telemetry.sdk.name': 'opentelemetry',
    'telemetry.sdk.language': 'java',
    'deployment.environment.name': ENVIRONMENT,
  },
};

/**
 * Two mobile sessions and a backend one. The iOS session has two screen views, a tap, two requests
 * (a success and a 503) and a crash sent five minutes after it happened, as EDOT iOS does on the
 * next launch. The Android one has two taps and a crash sent two days late, which is left out.
 */
const buildEvents = (startMs: number) => {
  const at = (offsetMs: number) => new Date(startMs + offsetMs).toISOString();
  const log = (
    resource: typeof iosResource | typeof androidResource | typeof backendResource,
    sessionId: string,
    offsetMs: number,
    eventName: string,
    attributes: Record<string, unknown> = {},
    observedOffsetMs?: number
  ) => ({
    '@timestamp': at(offsetMs),
    ...(observedOffsetMs === undefined ? {} : { observed_timestamp: at(observedOffsetMs) }),
    event_name: eventName,
    resource,
    attributes: { 'session.id': sessionId, ...attributes },
  });
  let spans = 0;
  const span = (offsetMs: number, fields: Record<string, unknown>) => {
    spans += 1;
    const id = String(spans).padStart(16, '0');
    return {
      '@timestamp': at(offsetMs),
      trace_id: `${id}${id}`,
      span_id: id,
      duration: 10_000_000,
      resource: iosResource,
      ...fields,
      attributes: { 'session.id': IOS_SESSION, ...(fields.attributes as object) },
    };
  };
  const screenView = (offsetMs: number, name: string) =>
    span(offsetMs, { kind: 'Internal', name, scope: { name: 'UIViewController' }, attributes: {} });
  const request = (offsetMs: number, statusCode: number) =>
    span(offsetMs, {
      kind: 'Client',
      name: 'GET',
      attributes: {
        'http.request.method': 'GET',
        'url.full': 'https://api.example.com/cart',
        'http.response.status_code': statusCode,
      },
      status: { code: statusCode >= 500 ? 'Error' : 'Unset' },
    });

  return {
    logs: [
      log(iosResource, IOS_SESSION, 10 * SECOND_MS, 'app.widget.click', {
        'user.email': 'ana@example.com',
        'network.connection.type': 'wifi',
        'client.geo.country_iso_code': 'NL',
        'client.geo.city_name': 'Amsterdam',
      }),
      log(iosResource, IOS_SESSION, 5 * MINUTE_MS, 'app.crash', {}, 40 * SECOND_MS),
      log(androidResource, ANDROID_SESSION, 0, 'app.widget.click', {
        'network.connection.type': 'cell',
      }),
      log(androidResource, ANDROID_SESSION, 15 * SECOND_MS, 'app.widget.click'),
      log(
        androidResource,
        ANDROID_SESSION,
        30 * SECOND_MS,
        'app.crash',
        {},
        30 * SECOND_MS - 2 * DAY_MS
      ),
      log(backendResource, BACKEND_SESSION, 0, 'app.widget.click'),
    ],
    spans: [
      screenView(0, 'CatalogViewController'),
      request(12 * SECOND_MS, 200),
      request(14 * SECOND_MS, 503),
      screenView(20 * SECOND_MS, 'CartViewController'),
    ],
  };
};

const ingestEvents = async (esClient: EsClient, startMs: number) => {
  const { logs, spans } = buildEvents(startMs);
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
    query: { terms: { 'resource.attributes.service.name': APPS } },
    refresh: true,
    ignore_unavailable: true,
  });

/** Runs the mobile summaries task now instead of at its next interval. */
const runMobileSessionsTask = (kbnClient: KbnClient) =>
  kbnClient.request({
    method: 'POST',
    path: `/internal/ftr/task_manager/${encodeURIComponent(MOBILE_SESSIONS_TASK_ID)}/run_soon`,
    headers: { 'x-elastic-internal-origin': 'kibana' },
  });

const getSummary = async (esClient: EsClient, sessionId: string) => {
  const { hits } = await esClient.search({
    index: MOBILE_SESSIONS_INDEX,
    ignore_unavailable: true,
    query: { term: { 'session.id': sessionId } },
  });
  return hits.hits[0]?._source;
};

apiTest.describe(
  'Digital Experience mobile session summaries task',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let adminHeaders: Record<string, string>;

    const getStatus = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.get(STATUS_PATH, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as SessionsStatusResponse;
    };

    apiTest.beforeAll(async ({ apiServices, esClient, kbnClient, samlAuth }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
      await deleteSessionsData(esClient, kbnClient);
      await deleteEvents(esClient);
      adminHeaders = {
        ...COMMON_HEADERS,
        ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
      };
    });

    // Removing the tasks also invalidates their API keys.
    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
      await deleteSessionsData(esClient, kbnClient);
      await deleteEvents(esClient);
    });

    apiTest(
      'summarizes EDOT iOS and EDOT Android sessions, with late crashes at their time',
      async ({ apiClient, esClient, kbnClient }) => {
        apiTest.setTimeout(3 * SUMMARIZE_TIMEOUT_MS);
        // Far enough back that the crash sent five minutes later is past the sync delay too.
        const startMs = Date.now() - 20 * MINUTE_MS;
        const at = (offsetMs: number) => new Date(startMs + offsetMs).toISOString();
        await ingestEvents(esClient, startMs);

        const response = await apiClient.post(SESSIONS_ENABLE_PATH, {
          headers: adminHeaders,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect((response.body as SessionsStatusResponse).mobile).toMatchObject({
          installed: true,
          apiKeyInvalid: false,
        });

        await expect
          .poll(
            async () => {
              await runMobileSessionsTask(kbnClient);
              return (await getSummary(esClient, IOS_SESSION)) !== undefined;
            },
            { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
          )
          .toBe(true);

        expect(await getSummary(esClient, IOS_SESSION)).toStrictEqual({
          session: { id: IOS_SESSION },
          service: { name: IOS_APP },
          start_time: at(0),
          // The crash, at the time it happened rather than when it was sent.
          end_time: at(40 * SECOND_MS),
          duration_ms: 40 * SECOND_MS,
          event_count: 6,
          crash_count: 1,
          screen_view_count: 2,
          tap_count: 1,
          http_request_count: 2,
          http_failed_request_count: 1,
          environment: ENVIRONMENT,
          user: { key: 'ana@example.com' },
          app: { version: '2.3.0', build_id: '230' },
          device: { model: 'iPhone15,2', manufacturer: 'Apple' },
          os: { name: 'iOS', version: '18.1' },
          network: { connection_type: 'wifi' },
          geo: { country_iso: 'NL', region: null, city: 'Amsterdam' },
          search: [
            IOS_SESSION.toLowerCase(),
            'ana@example.com',
            '2.3.0',
            'iphone15,2',
            'ios',
            '18.1',
            'nl',
            'amsterdam',
          ],
        });

        expect(await getSummary(esClient, ANDROID_SESSION)).toMatchObject({
          service: { name: ANDROID_APP },
          start_time: at(0),
          end_time: at(15 * SECOND_MS),
          event_count: 2,
          crash_count: 0,
          tap_count: 2,
          device: { model: 'Pixel 8', manufacturer: 'Google' },
          os: { name: 'Android', version: '15' },
          network: { connection_type: 'cell' },
        });
        expect(await getSummary(esClient, BACKEND_SESSION)).toBeUndefined();

        await expect
          .poll(
            async () => {
              const { health, rebuilding } = (await getStatus(apiClient)).mobile;
              return { health, rebuilding };
            },
            { timeout: SUMMARIZE_TIMEOUT_MS, intervals: [POLL_MS] }
          )
          .toStrictEqual({ health: 'healthy', rebuilding: false });
      }
    );
  }
);
