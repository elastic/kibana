/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — off-state tests.
 *
 * Two off-states, tested in order of their severity:
 *
 *   1. alerting:v2:enabled = false (503 ALERTING_DISABLED)
 *      With the feature flag on but the umbrella kill-switch off, every
 *      Detection route answers 503 ALERTING_DISABLED.  This suite flips the
 *      `alerting:v2:enabled` uiSettings at runtime, issues requests, then
 *      restores the setting.
 *
 *      The umbrella setting is a regular uiSettings entry
 *      (`requiresPageReload: true` in the registration, not a plugin boot arg),
 *      so it can be flipped without restarting Kibana.
 *
 *   2. enableDetectionsOnV2 = false (404 from Kibana's router)
 *      When the boot-time plugin config flag is false, no Detection routes are
 *      registered.  Every request lands on Kibana's "route not found" handler
 *      and returns 404.  This state CANNOT be verified in this suite, because
 *      the suite runs against a Kibana started with the flag enabled.
 *
 *      The 404 posture is covered by the sibling suite in
 *      test/scout_detections_v2_flag_off/api/tests/routes_404.spec.ts, run via
 *      its own playwright.config.ts against a server started with the
 *      `detections_v2_flag_off` config set (no `enableDetectionsOnV2` arg).
 *      That set is the template; the flag-off spec hits each Detection path and
 *      asserts 404 to prove both that the router has no record of the paths and
 *      that the response code is 404 rather than 401/403/503.
 *
 * Ref: rule-crud-api.md "Conventions every endpoint shares" (503 gate)
 *      plugin.ts setup() (flag gate on route registration)
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import {
  apiTest,
  expect,
  DETECTION_HEADERS,
  DETECTION_V2_RULES,
  DETECTION_V2_TAGS,
  getDetectionRuleUrl,
  getDetectionEnableUrl,
  getDetectionDisableUrl,
  DETECTION_RULES_ALL_ROLE,
  buildQueryRule,
} from '../fixtures';

/** The alerting:v2:enabled uiSettings key. */
const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';
/** Kibana global settings API path (used to DELETE the key override). */
const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';

apiTest.describe(
  'Detection Engine v2 — off-state: 503 when alerting:v2:enabled is off',
  { tag: '@local-stateful-classic' },
  () => {
    let writerCredentials: RoleApiCredentials;
    let writerHeaders: Record<string, string>;
    let adminCredentials: RoleApiCredentials;
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
      writerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_ALL_ROLE);
      writerHeaders = { ...DETECTION_HEADERS, ...writerCredentials.apiKeyHeader };

      adminCredentials = await requestAuth.getApiKeyForAdmin();
      adminHeaders = { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader };

      // Enable alerting:v2:enabled via the API so tests start with the flag on.
      // The server config no longer uses a globalOverride (which would lock the
      // setting and prevent tests from flipping it), so we must write it here.
      await apiClient.post(GLOBAL_SETTINGS_API, {
        headers: adminHeaders,
        body: { changes: { [ALERTING_V2_ENABLED_SETTING]: true } },
      });
    });

    apiTest.afterEach(async ({ apiClient }) => {
      // Always restore the uiSettings flag by writing true again.  We POST
      // rather than DELETE because DELETE removes a user-set value but cannot
      // revert to a global-override (the server config no longer sets one).
      await apiClient.post(GLOBAL_SETTINGS_API, {
        headers: adminHeaders,
        body: { changes: { [ALERTING_V2_ENABLED_SETTING]: true } },
      });
    });

    /**
     * Turn the `alerting:v2:enabled` uiSettings off by writing `false` via
     * the global-settings API.  The per-suite `afterEach` restores it.
     */
    const disableAlertingV2 = async (apiClient: { post: Function }) => {
      await apiClient.post(`${GLOBAL_SETTINGS_API}`, {
        headers: adminHeaders,
        body: {
          changes: { [ALERTING_V2_ENABLED_SETTING]: false },
        },
      });
    };

    // -------------------------------------------------------------------------
    // 503 off-state: every Detections endpoint
    // -------------------------------------------------------------------------

    apiTest(
      '503: POST /rules returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.post(DETECTION_V2_RULES, {
          headers: writerHeaders,
          body: buildQueryRule({ name: '503-create' }),
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: GET /rules/{id} returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.get(getDetectionRuleUrl('any-id'), {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: GET /rules returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.get(DETECTION_V2_RULES, {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: GET /tags returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.get(DETECTION_V2_TAGS, {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: PUT /rules/{id} returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.put(getDetectionRuleUrl('any-id'), {
          headers: writerHeaders,
          body: buildQueryRule(),
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: PATCH /rules/{id} returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.patch(getDetectionRuleUrl('any-id'), {
          headers: writerHeaders,
          body: { severity: 'high' },
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: DELETE /rules/{id} returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.delete(getDetectionRuleUrl('any-id'), {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: POST /rules/{id}/_enable returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.post(getDetectionEnableUrl('any-id'), {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );

    apiTest(
      '503: POST /rules/{id}/_disable returns ALERTING_DISABLED when alerting:v2:enabled is false',
      async ({ apiClient }) => {
        await disableAlertingV2(apiClient);

        const response = await apiClient.post(getDetectionDisableUrl('any-id'), {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(503);
        expect(response.body.code).toBe('ALERTING_DISABLED');
      }
    );
  }
);
