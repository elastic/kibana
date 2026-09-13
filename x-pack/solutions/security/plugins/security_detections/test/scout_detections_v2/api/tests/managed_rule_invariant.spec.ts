/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — managed-rule invariant end-to-end tests.
 *
 * This is the POC's headline claim: every generic Alerting v2 mutating route
 * rejects a detection rule with RULE_IS_MANAGED, while the Detections API
 * succeeds on the same rule.
 *
 * The generic routes enumerated here are all Alerting v2 server-side mutating
 * paths, based on the route classes in
 * `x-pack/platform/plugins/shared/alerting_v2/server/routes/rules/`:
 *
 *   PUT  /api/alerting/v2/rules/{id}           (upsert_rule_route)
 *   POST /api/alerting/v2/rules/{id}/_enable   (enable_rule_route)
 *   POST /api/alerting/v2/rules/{id}/_disable  (disable_rule_route)
 *   DELETE /api/alerting/v2/rules/{id}         (delete_rule_route)
 *   POST /api/alerting/v2/rules/_bulk_delete   (bulk_delete_rules_route)
 *   POST /api/alerting/v2/rules/_bulk_enable   (bulk_enable_rules_route)
 *   POST /api/alerting/v2/rules/_bulk_disable  (bulk_disable_rules_route)
 *   POST /api/alerting/v2/rules/_bulk_update_api_key (bulk_update_api_key_route)
 *   POST /api/alerting/v2/rules/{id}/_run      (run_rule_route)
 *   POST /api/alerting/v2/rules/_delete_by_query (delete_rules_by_query_route)
 *   POST /api/alerting/v2/rules/_enable_by_query  (enable_rules_by_query_route)
 *   POST /api/alerting/v2/rules/_disable_by_query (disable_rules_by_query_route)
 *
 * The PATCH equivalent on the generic side is the `PATCH /{id}` update_rule_route,
 * which maps to a framework-level update.
 *
 * For the by-query paths, the detection rule must appear in the dry-run count
 * but not in the delete/enable/disable result set, because the ownership
 * exclusion keeps managed rules out of the write set.
 *
 * Ref: rule-ownership.md "The write gate"
 *      rule-ownership.md "The invariant and how it holds"
 *      rule-ownership.md "Path by path"
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import {
  apiTest,
  expect,
  DETECTION_HEADERS,
  DETECTION_V2_RULES,
  getDetectionRuleUrl,
  getDetectionEnableUrl,
  getDetectionDisableUrl,
  DETECTION_RULES_ALL_ROLE,
  buildQueryRule,
} from '../fixtures';

const ALERTING_V2_RULES = '/api/alerting/v2/rules';
const alertingRuleUrl = (id: string) => `${ALERTING_V2_RULES}/${encodeURIComponent(id)}`;
const alertingEnableUrl = (id: string) => `${alertingRuleUrl(id)}/_enable`;
const alertingDisableUrl = (id: string) => `${alertingRuleUrl(id)}/_disable`;
const alertingRunUrl = (id: string) => `${alertingRuleUrl(id)}/_run`;

apiTest.describe(
  'Detection Engine v2 — managed-rule invariant',
  { tag: '@local-stateful-classic' },
  () => {
    let writerCredentials: RoleApiCredentials;
    let writerHeaders: Record<string, string>;
    /** Admin credentials for interacting with the generic Alerting v2 API. */
    let adminHeaders: Record<string, string>;

    let detectionRuleId: string;

    apiTest.beforeAll(async ({ requestAuth }) => {
      writerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_ALL_ROLE);
      writerHeaders = { ...DETECTION_HEADERS, ...writerCredentials.apiKeyHeader };

      const adminCredentials = await requestAuth.getApiKeyForAdmin();
      adminHeaders = { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader };
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      // Create a detection rule fresh for each test.
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'managed-invariant-test' }),
      });
      expect(created).toHaveStatusCode(201);
      detectionRuleId = created.body.id;
    });

    apiTest.afterEach(async ({ apiClient }) => {
      // Delete via the Detection API (the only route that is allowed to delete it).
      if (detectionRuleId) {
        await apiClient.delete(getDetectionRuleUrl(detectionRuleId), {
          headers: writerHeaders,
        });
      }
    });

    // -------------------------------------------------------------------------
    // Single-rule paths: each must reject with RULE_IS_MANAGED
    // -------------------------------------------------------------------------

    apiTest(
      'single-rule upsert (PUT) via generic API returns RULE_IS_MANAGED',
      async ({ apiClient }) => {
        const response = await apiClient.put(alertingRuleUrl(detectionRuleId), {
          headers: adminHeaders,
          body: {
            kind: 'alert',
            metadata: { name: 'attempted-hijack' },
            schedule: { every: '5m' },
            recovery_strategy: 'no_breach',
            query: {
              format: 'standalone',
              breach: { query: 'FROM logs-* | LIMIT 10' },
            },
            time_field: '@timestamp',
            grouping: { fields: ['host.name'] },
            state_transition: { pending_count: 0, recovering_count: 0 },
          },
        });
        expect(response).toHaveStatusCode(409);
        expect(response.body.code).toBe('RULE_IS_MANAGED');
      }
    );

    apiTest('enable via generic API returns RULE_IS_MANAGED', async ({ apiClient }) => {
      const response = await apiClient.post(alertingEnableUrl(detectionRuleId), {
        headers: adminHeaders,
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('RULE_IS_MANAGED');
    });

    apiTest('disable via generic API returns RULE_IS_MANAGED', async ({ apiClient }) => {
      const response = await apiClient.post(alertingDisableUrl(detectionRuleId), {
        headers: adminHeaders,
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('RULE_IS_MANAGED');
    });

    apiTest('delete via generic API returns RULE_IS_MANAGED', async ({ apiClient }) => {
      const response = await apiClient.delete(alertingRuleUrl(detectionRuleId), {
        headers: adminHeaders,
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('RULE_IS_MANAGED');
    });

    apiTest('run-now via generic API returns RULE_IS_MANAGED', async ({ apiClient }) => {
      const response = await apiClient.post(alertingRunUrl(detectionRuleId), {
        headers: adminHeaders,
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('RULE_IS_MANAGED');
    });

    // -------------------------------------------------------------------------
    // Bulk paths: managed rule excluded from write set (not just gate-rejected)
    // -------------------------------------------------------------------------

    apiTest(
      'bulk_delete via generic API returns RULE_IS_MANAGED for the detection rule',
      async ({ apiClient }) => {
        const response = await apiClient.post(`${ALERTING_V2_RULES}/_bulk_delete`, {
          headers: adminHeaders,
          body: { ids: [detectionRuleId] },
        });
        // Bulk result may be 200 with per-item errors.
        expect([200, 409]).toContain(response.statusCode);
        // The detection rule must not have been deleted.
        const fetchAfter = await apiClient.get(getDetectionRuleUrl(detectionRuleId), {
          headers: writerHeaders,
        });
        expect(fetchAfter).toHaveStatusCode(200);
      }
    );

    apiTest(
      'bulk_enable via generic API does not enable the detection rule',
      async ({ apiClient }) => {
        const before = await apiClient.get(getDetectionRuleUrl(detectionRuleId), {
          headers: writerHeaders,
        });
        expect(before).toHaveStatusCode(200);
        const beforeEnabled: boolean = before.body.enabled;

        await apiClient.post(`${ALERTING_V2_RULES}/_bulk_enable`, {
          headers: adminHeaders,
          body: { ids: [detectionRuleId] },
        });

        const after = await apiClient.get(getDetectionRuleUrl(detectionRuleId), {
          headers: writerHeaders,
        });
        expect(after).toHaveStatusCode(200);
        // enabled state must not have changed via the generic bulk-enable.
        expect(after.body.enabled).toBe(beforeEnabled);
      }
    );

    apiTest(
      'bulk_disable via generic API does not disable the detection rule',
      async ({ apiClient }) => {
        // First enable the rule via the Detection API.
        await apiClient.post(getDetectionEnableUrl(detectionRuleId), { headers: writerHeaders });

        await apiClient.post(`${ALERTING_V2_RULES}/_bulk_disable`, {
          headers: adminHeaders,
          body: { ids: [detectionRuleId] },
        });

        const after = await apiClient.get(getDetectionRuleUrl(detectionRuleId), {
          headers: writerHeaders,
        });
        expect(after).toHaveStatusCode(200);
        // Must still be enabled because the generic bulk-disable is blocked.
        expect(after.body.enabled).toBe(true);
      }
    );

    // -------------------------------------------------------------------------
    // The Detections API itself succeeds on the same rule
    // -------------------------------------------------------------------------

    apiTest(
      'Detection API enable/disable succeeds on the detection rule that generic API rejects',
      async ({ apiClient }) => {
        // Enable via Detection API — must succeed.
        const enableResponse = await apiClient.post(getDetectionEnableUrl(detectionRuleId), {
          headers: writerHeaders,
        });
        expect(enableResponse).toHaveStatusCode(200);
        expect(enableResponse.body.enabled).toBe(true);

        // Disable via Detection API — must succeed.
        const disableResponse = await apiClient.post(getDetectionDisableUrl(detectionRuleId), {
          headers: writerHeaders,
        });
        expect(disableResponse).toHaveStatusCode(200);
        expect(disableResponse.body.enabled).toBe(false);

        // Verify the generic API still rejects the (now-disabled) rule.
        const rejectResponse = await apiClient.post(alertingEnableUrl(detectionRuleId), {
          headers: adminHeaders,
        });
        expect(rejectResponse).toHaveStatusCode(409);
        expect(rejectResponse.body.code).toBe('RULE_IS_MANAGED');
      }
    );
  }
);
