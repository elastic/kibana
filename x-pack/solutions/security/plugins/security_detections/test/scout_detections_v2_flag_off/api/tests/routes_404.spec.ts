/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — feature-flag-off 404 tests.
 *
 * When `xpack.securityDetections.enableDetectionsOnV2` is false at boot time,
 * the plugin's `setup` never calls `registerCrudRoutes`, `registerFetchRoutes`,
 * or `registerActionRoutes`.  Kibana's router has no record of the
 * `/api/detection_engine/v2/...` paths, so every request lands on the "route
 * not found" handler and returns 404 with Kibana's generic error body
 * `{ statusCode: 404, error: "Not Found", message: "Not Found" }`.
 *
 * This distinguishes the flag-off state from the two 404-producing states when
 * the flag is on:
 *   - Flag off  → router 404 (`{ statusCode, error, message }`, no `code`)
 *   - Flag on, alerting on, unknown id → RULE_NOT_FOUND app error (has `code`)
 *   - Flag on, alerting off → 503 ALERTING_DISABLED
 *
 * The collection routes (POST /rules, GET /rules, GET /tags) are the strongest
 * discriminators: with the flag on they return 2xx, never 404.  The by-id
 * routes (GET/PUT/PATCH/DELETE /rules/{id}, POST /rules/{id}/_enable|_disable)
 * also return 404 with the flag on when the id is unknown, but with a different
 * body shape (RULE_NOT_FOUND carries `code`; the router 404 does not).  This
 * suite asserts the router-404 body; the RULE_NOT_FOUND envelope is asserted
 * by the flag-on suite (fetch/actions/crud specs), so together the two suites
 * make the distinction explicit.
 *
 * Run this suite against a server started with the `detections_v2_flag_off`
 * config set (no `enableDetectionsOnV2` arg).  See playwright.config.ts in this
 * directory (test/scout_detections_v2_flag_off/api/).
 *
 * Ref: rule-crud-api.md "Conventions every endpoint shares" (flag gate)
 *      plugin.ts setup() (route registration gated by flag)
 */

import {
  apiTest,
  expect,
  DETECTION_HEADERS,
  DETECTION_V2_RULES,
  DETECTION_V2_TAGS,
} from '../../../scout_detections_v2/api/fixtures';

/** A plausible but non-existent rule id used in path-parameter tests. */
const FAKE_ID = '00000000-0000-0000-0000-000000000001';

apiTest.describe(
  'Detection Engine v2 — feature-flag-off routes return 404',
  { tag: '@local-stateful-classic' },
  () => {
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const adminCredentials = await requestAuth.getApiKeyForAdmin();
      adminHeaders = { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader };
    });

    apiTest('POST /rules returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.post(DETECTION_V2_RULES, {
        headers: adminHeaders,
        body: {
          type: 'query',
          name: 'test',
          description: 'test',
          severity: 'low',
          risk_score: 1,
          index: ['logs-*'],
          query: '*',
        },
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('GET /rules returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.get(DETECTION_V2_RULES, { headers: adminHeaders });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('GET /rules/{id} returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.get(`${DETECTION_V2_RULES}/${FAKE_ID}`, {
        headers: adminHeaders,
      });
      expect(response).toHaveStatusCode(404);
      // Router-level 404 (no route registered) produces this generic shape with
      // no `code` field, unlike the RULE_NOT_FOUND app error (which has `code`).
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(response.body.code).toBeUndefined();
    });

    apiTest('PUT /rules/{id} returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.put(`${DETECTION_V2_RULES}/${FAKE_ID}`, {
        headers: adminHeaders,
        body: {
          type: 'query',
          name: 'test',
          description: 'test',
          severity: 'low',
          risk_score: 1,
          index: ['logs-*'],
          query: '*',
        },
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(response.body.code).toBeUndefined();
    });

    apiTest('PATCH /rules/{id} returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.patch(`${DETECTION_V2_RULES}/${FAKE_ID}`, {
        headers: adminHeaders,
        body: { name: 'patched' },
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(response.body.code).toBeUndefined();
    });

    apiTest('DELETE /rules/{id} returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.delete(`${DETECTION_V2_RULES}/${FAKE_ID}`, {
        headers: adminHeaders,
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(response.body.code).toBeUndefined();
    });

    apiTest('GET /tags returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.get(DETECTION_V2_TAGS, { headers: adminHeaders });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('POST /rules/{id}/_enable returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.post(`${DETECTION_V2_RULES}/${FAKE_ID}/_enable`, {
        headers: adminHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(response.body.code).toBeUndefined();
    });

    apiTest('POST /rules/{id}/_disable returns 404 when flag is off', async ({ apiClient }) => {
      const response = await apiClient.post(`${DETECTION_V2_RULES}/${FAKE_ID}/_disable`, {
        headers: adminHeaders,
        body: {},
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
      expect(response.body.code).toBeUndefined();
    });
  }
);
