/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — persistent-mode workaround tests.
 *
 * Detection rules are configured as `kind: 'alert'` with both lifecycle
 * strategies off and zero pending count so that every detection opens an alert
 * immediately and no alert ever recovers automatically.  These tests pin that
 * configuration and the framework trap that prevents adding `recovering_count`.
 *
 * The stored fields are verified through the generic Alerting v2 GET route
 * (`GET /api/alerting/v2/rules/{id}`) because the public Detection API does
 * not surface framework-internal fields (`kind`, `recovery_strategy`, etc.).
 *
 * Ref: implementation-plan.md "Phase A: the persistent-mode workaround"
 *      alert-modes.md "The configuration on main"
 *      rule-domain-model.md "How public fields map onto the stored rule"
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import {
  apiTest,
  expect,
  DETECTION_HEADERS,
  DETECTION_V2_RULES,
  getDetectionRuleUrl,
  DETECTION_RULES_ALL_ROLE,
  buildQueryRule,
  buildThresholdRule,
} from '../fixtures';

const ALERTING_V2_RULES = '/api/alerting/v2/rules';
const alertingRuleUrl = (id: string) => `${ALERTING_V2_RULES}/${encodeURIComponent(id)}`;

const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';
const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';

apiTest.describe(
  'Detection Engine v2 — persistent-mode workaround',
  { tag: '@local-stateful-classic' },
  () => {
    let writerCredentials: RoleApiCredentials;
    let writerHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
      writerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_ALL_ROLE);
      writerHeaders = { ...DETECTION_HEADERS, ...writerCredentials.apiKeyHeader };

      const adminCredentials = await requestAuth.getApiKeyForAdmin();
      adminHeaders = { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader };

      await apiClient.post(GLOBAL_SETTINGS_API, {
        headers: adminHeaders,
        body: { changes: { [ALERTING_V2_ENABLED_SETTING]: true } },
      });
    });

    apiTest.afterEach(async ({ apiClient }) => {
      // Best-effort cleanup: list all detection rules and delete them.
      const listResponse = await apiClient.get(`${DETECTION_V2_RULES}?per_page=100`, {
        headers: writerHeaders,
      });
      if (listResponse.statusCode === 200) {
        for (const rule of listResponse.body.data ?? []) {
          await apiClient.delete(getDetectionRuleUrl(rule.id), { headers: writerHeaders });
        }
      }
    });

    // -------------------------------------------------------------------------
    // Create: both types persist the workaround configuration
    // -------------------------------------------------------------------------

    apiTest(
      'create: query rule persists kind=alert, both strategies none, pending_count=0, no grouping',
      async ({ apiClient }) => {
        const created = await apiClient.post(DETECTION_V2_RULES, {
          headers: writerHeaders,
          body: buildQueryRule({ name: 'workaround-query' }),
        });
        expect(created).toHaveStatusCode(201);

        // Read back via the generic Alerting v2 route to see the stored framework fields.
        const frameworkResponse = await apiClient.get(alertingRuleUrl(created.body.id), {
          headers: adminHeaders,
        });
        expect(frameworkResponse).toHaveStatusCode(200);
        const framework = frameworkResponse.body;

        expect(framework.kind).toBe('alert');
        expect(framework.recovery_strategy).toBe('none');
        expect(framework.no_data_strategy).toBe('none');
        // pending_count: 0 so the first match opens an active alert immediately.
        expect(framework.state_transition).toMatchObject({ pending_count: 0 });
        // No grouping: each result row is its own episode, so a later crossing of
        // the same bucket is a new alert instead of joining the first one. Not v1
        // parity — v1 alerts once per accumulation of threshold.value new events,
        // where this alerts once per qualifying bucket per run.
        expect(framework.grouping).toBeUndefined();
      }
    );

    apiTest(
      'create: threshold rule persists kind=alert, both strategies none, pending_count=0, no grouping',
      async ({ apiClient }) => {
        const created = await apiClient.post(DETECTION_V2_RULES, {
          headers: writerHeaders,
          body: buildThresholdRule({ name: 'workaround-threshold' }),
        });
        expect(created).toHaveStatusCode(201);

        const frameworkResponse = await apiClient.get(alertingRuleUrl(created.body.id), {
          headers: adminHeaders,
        });
        expect(frameworkResponse).toHaveStatusCode(200);
        const framework = frameworkResponse.body;

        expect(framework.kind).toBe('alert');
        expect(framework.recovery_strategy).toBe('none');
        expect(framework.no_data_strategy).toBe('none');
        expect(framework.state_transition).toMatchObject({ pending_count: 0 });
        // grouping must be absent: threshold's deriveRuleFields no longer derives it.
        expect(framework.grouping).toBeUndefined();
      }
    );

    // -------------------------------------------------------------------------
    // PATCH: unrelated field change leaves workaround fields intact
    // -------------------------------------------------------------------------

    apiTest(
      'patch: patching severity leaves the workaround fields intact',
      async ({ apiClient }) => {
        const created = await apiClient.post(DETECTION_V2_RULES, {
          headers: writerHeaders,
          body: buildQueryRule({ name: 'patch-invariant', severity: 'low' }),
        });
        expect(created).toHaveStatusCode(201);

        // Patch an unrelated field (severity) — should leave workaround fields untouched.
        const patched = await apiClient.patch(getDetectionRuleUrl(created.body.id), {
          headers: writerHeaders,
          body: { severity: 'high' },
        });
        expect(patched).toHaveStatusCode(200);
        expect(patched.body.severity).toBe('high');

        const frameworkResponse = await apiClient.get(alertingRuleUrl(created.body.id), {
          headers: adminHeaders,
        });
        expect(frameworkResponse).toHaveStatusCode(200);
        const framework = frameworkResponse.body;

        expect(framework.kind).toBe('alert');
        expect(framework.recovery_strategy).toBe('none');
        expect(framework.no_data_strategy).toBe('none');
        expect(framework.state_transition).toMatchObject({ pending_count: 0 });
        expect(framework.grouping).toBeUndefined();
      }
    );

    // -------------------------------------------------------------------------
    // PUT: full replace restates the workaround fields
    // -------------------------------------------------------------------------

    apiTest(
      'replace: PUT leaves the workaround fields correct after a full replace',
      async ({ apiClient }) => {
        const created = await apiClient.post(DETECTION_V2_RULES, {
          headers: writerHeaders,
          body: buildQueryRule({ name: 'put-invariant' }),
        });
        expect(created).toHaveStatusCode(201);

        // Full replace via the Detection API — toFrameworkReplace explicitly restates
        // all three workaround fields (recovery_strategy, no_data_strategy, state_transition)
        // so none of them depend on the merge's omitted-means-keep behaviour.
        const replaced = await apiClient.put(getDetectionRuleUrl(created.body.id), {
          headers: writerHeaders,
          body: {
            type: 'query',
            name: 'put-invariant-updated',
            description: 'updated description',
            severity: 'critical',
            risk_score: 99,
            index: ['logs-*'],
            query: 'host.name: *',
          },
        });
        expect(replaced).toHaveStatusCode(200);

        const frameworkResponse = await apiClient.get(alertingRuleUrl(created.body.id), {
          headers: adminHeaders,
        });
        expect(frameworkResponse).toHaveStatusCode(200);
        const framework = frameworkResponse.body;

        expect(framework.kind).toBe('alert');
        expect(framework.recovery_strategy).toBe('none');
        expect(framework.no_data_strategy).toBe('none');
        expect(framework.state_transition).toMatchObject({ pending_count: 0 });
        expect(framework.grouping).toBeUndefined();
      }
    );

    // -------------------------------------------------------------------------
    // Trap: recovering_count is rejected when recovery is off
    //
    // Detection rules carry recovery_strategy: 'none'. This test pins the
    // framework refinement (isRecoveryTransitionConsistentWithStrategy) that
    // rejects recovering_count while recovery is disabled.  Adding
    // recovering_count: 0 to toFrameworkCreate would break every detection rule
    // create with this error.
    // -------------------------------------------------------------------------

    apiTest(
      'trap: creating a rule with recovering_count while recovery_strategy is none is rejected',
      async ({ apiClient }) => {
        const response = await apiClient.post(ALERTING_V2_RULES, {
          headers: adminHeaders,
          body: {
            kind: 'alert',
            metadata: { name: 'trap-recovering-count' },
            schedule: { every: '5m' },
            recovery_strategy: 'none',
            no_data_strategy: 'none',
            state_transition: { pending_count: 0, recovering_count: 0 },
            query: {
              format: 'standalone',
              breach: { query: 'FROM logs-* | LIMIT 1' },
            },
          },
        });
        // isRecoveryTransitionConsistentWithStrategy rejects recovering_count when
        // recovery is disabled (recovery_strategy is 'none' or absent).
        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
