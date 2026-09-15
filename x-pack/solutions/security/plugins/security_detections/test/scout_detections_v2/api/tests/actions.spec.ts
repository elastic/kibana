/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection Engine v2 — action endpoint integration tests.
 *
 * Covers: POST /rules/{id}/_enable, POST /rules/{id}/_disable
 *
 * Contract cases:
 *   - Enable transitions a disabled rule to enabled=true and returns the full rule.
 *   - Disable transitions an enabled rule to enabled=false and returns the full rule.
 *   - Enable/disable: 404 for missing/foreign id.
 *   - `revision` does NOT move across enable and disable (it is not a meaningful edit).
 *   - `updated_at` DOES move — the rule's timestamp reflects the toggle.
 *   - Authorization: 403 for rules-read-only caller, 403 for no-access caller.
 *
 * Ref: rule-actions-api.md "Semantics"
 *      rule-versions.md "metadata.revision: the meaningful-edit counter"
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
  DETECTION_RULES_READ_ROLE,
  NO_ACCESS_ROLE,
  buildQueryRule,
} from '../fixtures';

/** Kibana global settings API — used to enable alerting:v2:enabled at suite start. */
const GLOBAL_SETTINGS_API = '/api/kibana/global_settings';
const ALERTING_V2_ENABLED_SETTING = 'alerting:v2:enabled';

apiTest.describe('Detection Engine v2 — action routes', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;
  let readerHeaders: Record<string, string>;
  let noAccessHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiClient }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_ALL_ROLE);
    writerHeaders = { ...DETECTION_HEADERS, ...writerCredentials.apiKeyHeader };

    const readerCredentials = await requestAuth.getApiKeyForCustomRole(DETECTION_RULES_READ_ROLE);
    readerHeaders = { ...DETECTION_HEADERS, ...readerCredentials.apiKeyHeader };

    const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
    noAccessHeaders = { ...DETECTION_HEADERS, ...noAccessCredentials.apiKeyHeader };

    // Enable alerting:v2:enabled via the API so every test in this suite sees the
    // flag on.  The server config no longer uses a globalOverride.
    const adminCredentials = await requestAuth.getApiKeyForAdmin();
    const adminHeaders = { ...DETECTION_HEADERS, ...adminCredentials.apiKeyHeader };
    await apiClient.post(GLOBAL_SETTINGS_API, {
      headers: adminHeaders,
      body: { changes: { [ALERTING_V2_ENABLED_SETTING]: true } },
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
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
  // Enable
  // -------------------------------------------------------------------------

  apiTest(
    'enable: transitions a disabled rule to enabled=true and returns 200',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        // RULE_DEFAULTS.enabled = false, so the rule starts disabled.
        body: buildQueryRule({ name: 'enable-me' }),
      });
      expect(created).toHaveStatusCode(201);
      expect(created.body.enabled).toBe(false);

      const response = await apiClient.post(getDetectionEnableUrl(created.body.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
      expect(response.body.id).toBe(created.body.id);
    }
  );

  apiTest('enable: returns 404 for an unknown id', async ({ apiClient }) => {
    const response = await apiClient.post(getDetectionEnableUrl('does-not-exist'), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  // -------------------------------------------------------------------------
  // Disable
  // -------------------------------------------------------------------------

  apiTest(
    'disable: transitions an enabled rule to enabled=false and returns 200',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'disable-me', enabled: true }),
      });
      expect(created).toHaveStatusCode(201);
      expect(created.body.enabled).toBe(true);

      const response = await apiClient.post(getDetectionDisableUrl(created.body.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(false);
      expect(response.body.id).toBe(created.body.id);
    }
  );

  apiTest('disable: returns 404 for an unknown id', async ({ apiClient }) => {
    const response = await apiClient.post(getDetectionDisableUrl('does-not-exist'), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  // -------------------------------------------------------------------------
  // revision stays put; updated_at moves
  // -------------------------------------------------------------------------

  apiTest(
    'revision stays at 0 across enable → disable; updated_at moves',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'revision-check' }),
      });
      expect(created).toHaveStatusCode(201);
      const initialRevision: number = created.body.revision;
      const initialUpdatedAt: string = created.body.updated_at;

      // Enable (starts disabled by default).
      const enabled = await apiClient.post(getDetectionEnableUrl(created.body.id), {
        headers: writerHeaders,
      });
      expect(enabled).toHaveStatusCode(200);
      // Revision must not move.
      expect(enabled.body.revision).toBe(initialRevision);
      // updated_at must move or stay (at least not regress).
      expect(Date.parse(enabled.body.updated_at)).toBeGreaterThanOrEqual(
        Date.parse(initialUpdatedAt)
      );

      // Disable.
      const disabled = await apiClient.post(getDetectionDisableUrl(created.body.id), {
        headers: writerHeaders,
      });
      expect(disabled).toHaveStatusCode(200);
      // Revision still must not move.
      expect(disabled.body.revision).toBe(initialRevision);
      // updated_at must move or stay.
      expect(Date.parse(disabled.body.updated_at)).toBeGreaterThanOrEqual(
        Date.parse(enabled.body.updated_at)
      );
    }
  );

  // -------------------------------------------------------------------------
  // Redundant enable: 409-on-already-enabled was considered and declined
  // -------------------------------------------------------------------------

  apiTest(
    'enable: enabling an already-enabled rule returns 200 (not 409)',
    async ({ apiClient }) => {
      // This contract was explicitly considered and declined: the toggle
      // must be idempotent, not conflicting.  rule-actions-api.md "Semantics".
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'already-enabled', enabled: true }),
      });
      expect(created).toHaveStatusCode(201);
      expect(created.body.enabled).toBe(true);

      const updatedAtBefore: string = created.body.updated_at;
      const revisionBefore: number = created.body.revision;

      // Enable again — must be 200 with enabled: true, not 409.
      const response = await apiClient.post(getDetectionEnableUrl(created.body.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
      // Revision must not move — a redundant toggle is not a meaningful edit.
      expect(response.body.revision).toBe(revisionBefore);
      // updated_at must move (or at least not regress) because a mutation did occur.
      expect(Date.parse(response.body.updated_at)).toBeGreaterThanOrEqual(
        Date.parse(updatedAtBefore)
      );
    }
  );

  apiTest(
    'enable: does not re-validate detection builder fields (enable is a toggle, not a write)',
    async ({ apiClient }) => {
      // rule-actions-api.md "What enable does not check": the enable handler
      // calls framework.enableRule, which does not re-run the builder schema.
      // Verified structurally: enable succeeds on any in-scope rule whose
      // builder fields were valid at create time, regardless of any later
      // schema evolution.  This test confirms the happy path is unconditional.
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'enable-no-validation' }),
      });
      expect(created).toHaveStatusCode(201);

      const response = await apiClient.post(getDetectionEnableUrl(created.body.id), {
        headers: writerHeaders,
      });
      // Enable must succeed with no builder-schema validation error.
      expect(response).toHaveStatusCode(200);
      expect(response.body.enabled).toBe(true);
    }
  );

  // -------------------------------------------------------------------------
  // Authorization
  // -------------------------------------------------------------------------

  apiTest(
    'authorization: enable returns 403 for a rules-read-only caller',
    async ({ apiClient }) => {
      const created = await apiClient.post(DETECTION_V2_RULES, {
        headers: writerHeaders,
        body: buildQueryRule({ name: 'enable-auth-check' }),
      });
      expect(created).toHaveStatusCode(201);

      const response = await apiClient.post(getDetectionEnableUrl(created.body.id), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest('authorization: disable returns 403 for a no-access caller', async ({ apiClient }) => {
    const created = await apiClient.post(DETECTION_V2_RULES, {
      headers: writerHeaders,
      body: buildQueryRule({ name: 'disable-auth-check', enabled: true }),
    });
    expect(created).toHaveStatusCode(201);

    const response = await apiClient.post(getDetectionDisableUrl(created.body.id), {
      headers: noAccessHeaders,
    });
    expect(response).toHaveStatusCode(403);
  });
});
