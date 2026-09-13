/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — CRUD endpoint integration tests.
 *
 * Covers: POST /rules, PUT /rules/{id}, PATCH /rules/{id}, DELETE /rules/{id}
 *
 * Contract cases:
 *   - POST creates a rule and returns 201 with both type aliases.
 *   - POST returns 409 on duplicate rule_id.
 *   - PUT returns 200 on success, 404 for foreign/missing id, 409 on type change.
 *   - PATCH returns 200, applies partial update, returns 400 on foreign field
 *     (merged-validation: a `threshold` field on a `query` rule is foreign).
 *   - DELETE returns 200 with last state, 404 for missing/foreign id.
 *   - Every mutating route: 403 for rules-read-only caller, 403 for no-access caller.
 *   - Scoping: a rule created through the generic Alerting v2 API is foreign to the
 *     Detection API — 404 on GET, and the generic rule never appears in list results.
 *
 * Ref: rule-crud-api.md "The endpoints"
 *      rule-domain-model.md "The public rule object"
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import {
  apiTest,
  expect,
  DETECTION_HEADERS,
  DETECTION_V2_RULES,
  getDetectionRuleUrl,
  DETECTION_RULES_ALL_ROLE,
  DETECTION_RULES_READ_ROLE,
  NO_ACCESS_ROLE,
  buildQueryRule,
  buildThresholdRule,
} from '../fixtures';

// The alerting_v2 generic rules API path — used to create a foreign (out-of-scope) rule.
const ALERTING_V2_RULES = '/api/alerting/v2/rules';

apiTest.describe('Detection Engine v2 — CRUD routes', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;
  let readerHeaders: Record<string, string>;
  let noAccessHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_ALL_ROLE);
    writerHeaders = { ...DETECTION_HEADERS, ...writerCredentials.apiKeyHeader };

    const readerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_READ_ROLE);
    readerHeaders = { ...DETECTION_HEADERS, ...readerCredentials.apiKeyHeader };

    const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
    noAccessHeaders = { ...DETECTION_HEADERS, ...noAccessCredentials.apiKeyHeader };
  });

  apiTest.afterEach(async ({ apiClient }) => {
    // Best-effort cleanup via admin credentials: list all detection rules and delete them.
    // Uses the writer role we established in beforeAll.
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
  // POST — create
  // -------------------------------------------------------------------------

  apiTest('create: POST returns 201 and the created query rule', async ({ apiClient }) => {
    const body = buildQueryRule({ name: 'my-query-rule', severity: 'medium', risk_score: 42 });
    const response = await apiClient.post(DETECTION_V2_RULES, { headers: writerHeaders, body });

    expect(response).toHaveStatusCode(201);
    expect(response.body.type).toBe('query');
    expect(response.body.name).toBe('my-query-rule');
    expect(response.body.severity).toBe('medium');
    expect(response.body.risk_score).toBe(42);
    // Server-set fields.
    expect(typeof response.body.id).toBe('string');
    expect(typeof response.body.rule_id).toBe('string');
    expect(response.body.revision).toBe(0);
    expect(response.body.source).toStrictEqual({ type: 'internal' });
    expect(response.body.enabled).toBe(false); // RULE_DEFAULTS.enabled
  });

  apiTest('create: POST returns 201 and the created threshold rule', async ({ apiClient }) => {
    const body = buildThresholdRule({
      name: 'my-threshold-rule',
      threshold: { field: ['host.name'], value: 5 },
    });
    const response = await apiClient.post(DETECTION_V2_RULES, { headers: writerHeaders, body });

    expect(response).toHaveStatusCode(201);
    expect(response.body.type).toBe('threshold');
    expect(response.body.name).toBe('my-threshold-rule');
    expect(response.body.threshold).toStrictEqual({ field: ['host.name'], value: 5 });
  });

  apiTest('create: POST returns 409 on duplicate rule_id', async ({ apiClient }) => {
    const body = buildQueryRule({ name: 'dupe-rule', rule_id: 'my-stable-rule-id' });
    const first = await apiClient.post(DETECTION_V2_RULES, { headers: writerHeaders, body });
    expect(first).toHaveStatusCode(201);

    const second = await apiClient.post(DETECTION_V2_RULES, { headers: writerHeaders, body });
    expect(second).toHaveStatusCode(409);
    expect(second.body.code).toBe('RULE_ALREADY_EXISTS');
  });

  apiTest(
    'create: POST returns 400 for missing required fields (no name)',
    async ({ apiClient }) => {
      const response = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: {
          type: 'query',
          description: 'missing name',
          severity: 'low',
          risk_score: 21,
          index: ['logs-*'],
          query: '*',
        },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  // -------------------------------------------------------------------------
  // PUT — replace
  // -------------------------------------------------------------------------

  apiTest('replace: PUT returns 200 with the updated rule', async ({ apiClient }) => {
    const created = await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'original-name' }),
    });
    expect(created).toHaveStatusCode(201);

    const updated = await apiClient.put(getDetectionRuleUrl(created.body.id), {
      headers: writerHeaders,
      body: {
        type: 'query',
        name: 'updated-name',
        description: 'updated description',
        severity: 'high',
        risk_score: 73,
        index: ['logs-*'],
        query: 'host.name: *',
      },
    });
    expect(updated).toHaveStatusCode(200);
    expect(updated.body.name).toBe('updated-name');
    expect(updated.body.severity).toBe('high');
    expect(updated.body.risk_score).toBe(73);
    // Revision moves on meaningful edit.
    expect(updated.body.revision).toBeGreaterThan(created.body.revision);
  });

  apiTest('replace: PUT returns 404 for an unknown id', async ({ apiClient }) => {
    const response = await apiClient.put(getDetectionRuleUrl('does-not-exist'), {
      headers: writerHeaders,
      body: buildQueryRule(),
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  apiTest(
    'replace: PUT returns 409 when the payload type differs from the stored type',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'query-rule-for-type-change' }),
      });
      expect(created).toHaveStatusCode(201);

      // Attempt to change type from 'query' to 'threshold'.
      const response = await apiClient.put(getDetectionRuleUrl(created.body.id), {
        headers: writerHeaders,
        body: buildThresholdRule(),
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.code).toBe('RULE_VERSION_CONFLICT');
    }
  );

  // -------------------------------------------------------------------------
  // PATCH — partial update
  // -------------------------------------------------------------------------

  apiTest(
    'patch: PATCH returns 200 with only the patched fields changed',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'patch-source', severity: 'low' }),
      });
      expect(created).toHaveStatusCode(201);

      const patched = await apiClient.patch(getDetectionRuleUrl(created.body.id), {
        headers: writerHeaders,
        body: { severity: 'critical' },
      });
      expect(patched).toHaveStatusCode(200);
      expect(patched.body.severity).toBe('critical');
      // Unchanged fields stay.
      expect(patched.body.name).toBe('patch-source');
    }
  );

  apiTest(
    'patch: PATCH returns 400 when a foreign field is sent (merged-validation)',
    async ({ apiClient }) => {
      // Create a query rule.
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'query-rule-for-patch-foreign' }),
      });
      expect(created).toHaveStatusCode(201);

      // Sending `threshold` (a threshold-only field) on a query rule should fail
      // merged-validation.
      const response = await apiClient.patch(getDetectionRuleUrl(created.body.id), {
        headers: writerHeaders,
        body: { threshold: { field: ['host.name'], value: 5 } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('patch: PATCH returns 404 for an unknown id', async ({ apiClient }) => {
    const response = await apiClient.patch(getDetectionRuleUrl('does-not-exist'), {
      headers: writerHeaders,
      body: { severity: 'high' },
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  apiTest('delete: DELETE returns 200 with the deleted rule body', async ({ apiClient }) => {
    const created = await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'to-delete' }),
    });
    expect(created).toHaveStatusCode(201);

    const deleted = await apiClient.delete(getDetectionRuleUrl(created.body.id), {
      headers: writerHeaders,
    });
    expect(deleted).toHaveStatusCode(200);
    expect(deleted.body.id).toBe(created.body.id);
    expect(deleted.body.name).toBe('to-delete');

    // Confirm the rule no longer exists.
    const fetchAfter = await apiClient.get(getDetectionRuleUrl(created.body.id), {
      headers: writerHeaders,
    });
    expect(fetchAfter).toHaveStatusCode(404);
  });

  apiTest('delete: DELETE returns 404 for an unknown id', async ({ apiClient }) => {
    const response = await apiClient.delete(getDetectionRuleUrl('does-not-exist'), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  // -------------------------------------------------------------------------
  // Scoping: a rule created through the generic Alerting v2 API is foreign
  // -------------------------------------------------------------------------

  apiTest(
    'scoping: a generic Alerting v2 rule is 404 on the Detections API',
    async ({ apiClient, requestAuth }) => {
      // Create a rule through the generic API using admin credentials.
      const adminCredentials = await requestAuth.getApiKeyForAdmin();
      const genericResponse = await apiClient.post(ALERTING_V2_RULES, {
        headers: { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'generic-v2-rule' },
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
      expect(genericResponse).toHaveStatusCode(201);
      const genericRuleId = genericResponse.body.id;

      try {
        // The Detection API must not reveal this rule — 404 for both GET and DELETE.
        const detectGet = await apiClient.get(getDetectionRuleUrl(genericRuleId), {
          headers: writerHeaders,
        });
        expect(detectGet).toHaveStatusCode(404);
        expect(detectGet.body.code).toBe('RULE_NOT_FOUND');

        const detectDelete = await apiClient.delete(getDetectionRuleUrl(genericRuleId), {
          headers: writerHeaders,
        });
        expect(detectDelete).toHaveStatusCode(404);

        // The generic rule must also not appear in the Detection list.
        const listResponse = await apiClient.get(`${DETECTION_V2_RULES}?per_page=100`, {
          headers: writerHeaders,
        });
        expect(listResponse).toHaveStatusCode(200);
        const ids = (listResponse.body.data ?? []).map((r: { id: string }) => r.id);
        expect(ids).not.toContain(genericRuleId);
      } finally {
        // Clean up the generic rule via the generic API.
        await apiClient.delete(`${ALERTING_V2_RULES}/${encodeURIComponent(genericRuleId)}`, {
          headers: { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // Authorization
  // -------------------------------------------------------------------------

  apiTest('authorization: POST returns 403 for a rules-read-only caller', async ({ apiClient }) => {
    const response = await apiClient.post(DETECTION_V2_RULES, {
      headers: readerHeaders,
      body: buildQueryRule({ name: 'forbidden-create' }),
    });
    expect(response).toHaveStatusCode(403);
  });

  apiTest('authorization: POST returns 403 for a no-access caller', async ({ apiClient }) => {
    const response = await apiClient.post(DETECTION_V2_RULES, {
      headers: noAccessHeaders,
      body: buildQueryRule({ name: 'no-access-create' }),
    });
    expect(response).toHaveStatusCode(403);
  });

  apiTest(
    'authorization: DELETE returns 403 for a rules-read-only caller',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'delete-forbidden' }),
      });
      expect(created).toHaveStatusCode(201);

      const response = await apiClient.delete(getDetectionRuleUrl(created.body.id), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
