/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { apiTest, INTERNAL_API_HEADERS, PUBLIC_API_HEADERS, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';

/**
 * Inlined rather than imported from `@kbn/workflows/managed/definitions/alertzero`:
 * that entry point pulls in YAML files, which Playwright's esbuild transform
 * cannot load.
 *
 * `coverage_review` and `coverage_worker` are static rule-coverage workflows, installed into
 * the global space by AlertZero's `setup()`.
 *
 * `floor_alert_triage` is a dynamic worker: nothing installs it at startup, and
 * installing one uses `workflowIdSuffix: spaceId`, so the stored id is
 * `<worker id>-<space id>`. Querying the bare definition id finds no document.
 */
const COVERAGE_REVIEW_WORKFLOW_ID = 'system-security-coverage-review';
const COVERAGE_WORKER_WORKFLOW_ID = 'system-security-coverage-worker';
const FLOOR_ALERT_TRIAGE_WORKER_ID = 'system-security-floor-alert-triage';
const FLOOR_ALERT_TRIAGE_WORKFLOW_ID = `${FLOOR_ALERT_TRIAGE_WORKER_ID}-${DEFAULT_SPACE_ID}`;

/**
 * Boots on the `alertzero` server config set, the set that turns on
 * `xpack.alertzero.enabled` (and `agenticInvestigations`, which AlertZero
 * requires). AlertZero is off by default, so under plain `test/scout/` neither
 * document below is ever installed.
 *
 * Enabling a worker requires an AI model in the space (Kibana answers 400
 * otherwise), so the dynamic-worker half of this suite skips with an explicit
 * reason on a stack booted without a preconfigured inference connector. The
 * static coverage workflows need no model and always run.
 */
apiTest.describe('AlertZero managed workflows', { tag: [...tags.stateful.classic] }, () => {
  let hasChatCompletionConnector = false;
  let serviceAccountId: string | undefined;

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const connectors = await apiClient.get('api/actions/connectors', {
      headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(connectors.statusCode, JSON.stringify(connectors.body)).toBe(200);
    hasChatCompletionConnector = (
      connectors.body as Array<{ connector_type_id: string; config?: { taskType?: string } }>
    ).some(
      (connector) =>
        connector.connector_type_id === '.inference' &&
        connector.config?.taskType === 'chat_completion'
    );
    if (!hasChatCompletionConnector) {
      return;
    }

    // Enabling a worker needs a service account to run as, and a save that enables a worker
    // without one is rejected. Create one, bind it, then enable, as the UI does.
    const headers = { ...INTERNAL_API_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader };
    const account = await apiClient.post('internal/security/service_account', {
      headers,
      body: { name: `alertzero-managed-workflows-${Date.now()}`, roles: ['superuser'] },
      responseType: 'json',
    });
    expect(account.statusCode, JSON.stringify(account.body)).toBe(200);
    serviceAccountId = (account.body as { id: string }).id;

    const workerUrl = `internal/alertzero/workers/${FLOOR_ALERT_TRIAGE_WORKER_ID}`;
    const catalog = await apiClient.get('internal/alertzero/workers', {
      headers,
      responseType: 'json',
    });
    expect(catalog.statusCode, JSON.stringify(catalog.body)).toBe(200);
    const worker = (
      catalog.body as { workers: Array<{ id: string; settingsRevision?: string | null }> }
    ).workers.find((candidate) => candidate.id === FLOOR_ALERT_TRIAGE_WORKER_ID);
    expect(worker, `${FLOOR_ALERT_TRIAGE_WORKER_ID} is in the worker catalog`).toBeDefined();

    // Enabling an uninstalled worker installs its per-space managed document, so
    // this drives the same route the UI drives instead of assuming the document.
    const bind = await apiClient.patch(workerUrl, {
      headers,
      body: {
        settingsRevision: worker?.settingsRevision ?? null,
        settings: { serviceAccountId },
      },
      responseType: 'json',
    });
    expect(bind.statusCode, JSON.stringify(bind.body)).toBe(200);
    const enable = await apiClient.patch(workerUrl, {
      headers,
      body: { enabled: true },
      responseType: 'json',
    });
    expect(enable.statusCode, JSON.stringify(enable.body)).toBe(200);
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    if (!serviceAccountId) {
      return;
    }
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const headers = { ...INTERNAL_API_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader };
    const workerUrl = `internal/alertzero/workers/${FLOOR_ALERT_TRIAGE_WORKER_ID}`;

    // Unbind before deleting the account: a worker left pointing at a deleted account leaks
    // into whatever spec runs next. Disable first, since an enabled worker needs an account.
    const disable = await apiClient.patch(workerUrl, {
      headers,
      body: { enabled: false },
      responseType: 'json',
    });
    expect(disable.statusCode, JSON.stringify(disable.body)).toBe(200);
    const catalog = await apiClient.get('internal/alertzero/workers', {
      headers,
      responseType: 'json',
    });
    const worker = (
      catalog.body as { workers: Array<{ id: string; settingsRevision?: string | null }> }
    ).workers.find((candidate) => candidate.id === FLOOR_ALERT_TRIAGE_WORKER_ID);
    const unbind = await apiClient.patch(workerUrl, {
      headers,
      body: {
        settingsRevision: worker?.settingsRevision ?? null,
        settings: { serviceAccountId: null },
      },
      responseType: 'json',
    });
    expect(unbind.statusCode, JSON.stringify(unbind.body)).toBe(200);
    const removed = await apiClient.delete(
      `internal/security/service_account/${encodeURIComponent(serviceAccountId)}`,
      { headers, responseType: 'json' }
    );
    expect([200, 404], JSON.stringify(removed.body)).toContain(removed.statusCode);
  });

  for (const workflowId of [
    COVERAGE_REVIEW_WORKFLOW_ID,
    COVERAGE_WORKER_WORKFLOW_ID,
    FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ]) {
    apiTest(`${workflowId}: is installed and valid`, async ({ apiClient, samlAuth }) => {
      apiTest.skip(
        workflowId === FLOOR_ALERT_TRIAGE_WORKFLOW_ID && !hasChatCompletionConnector,
        'no preconfigured chat-completion inference connector on this stack; enabling the floor alert triage worker requires an AI model'
      );
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...PUBLIC_API_HEADERS, ...cookieHeader };

      // Installation is asynchronous (reactive observable in plugin start), so
      // poll until the workflow appears and reports valid.
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(`api/workflows/workflow/${workflowId}`, {
              headers,
              responseType: 'json',
            });
            return response.statusCode === 200 ? response.body.valid : false;
          },
          { timeout: 20_000, intervals: [1_000] }
        )
        .toBe(true);
    });
  }
});
