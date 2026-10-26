/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { apiTest, INTERNAL_API_HEADERS, PUBLIC_API_HEADERS, tags } from '@kbn/scout-security';
import type { ApiClientFixture } from '@kbn/scout-security';
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

const KIBANA_SETTINGS_PATH = 'internal/kibana/settings';
/** Settings route of a space; the default space serves it without the `/s/<id>` prefix. */
const settingsPath = (spaceId: string) =>
  spaceId === DEFAULT_SPACE_ID ? KIBANA_SETTINGS_PATH : `s/${spaceId}/${KIBANA_SETTINGS_PATH}`;
const WORKFLOW_EXECUTIONS_PATH = (workflowId: string) =>
  `api/workflows/workflow/${encodeURIComponent(workflowId)}/executions` +
  `?size=100&sortField=createdAt&sortOrder=desc&omitStepRuns=true`;
const TERMINAL_EXECUTION_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];
/** Ceiling for draining the triage run the enable started (cancel + poll to terminal). */
const DRAIN_TIMEOUT_MS = 60_000;

/** Reads the per-space AlertZero gate; `undefined` while it still holds the default value. */
const readAlertZeroEnabled = async ({
  apiClient,
  headers,
  spaceId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}): Promise<boolean | undefined> => {
  const response = await apiClient.get(settingsPath(spaceId), {
    headers,
    responseType: 'json',
  });
  expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
  const userValue = ((response.body as { settings?: Record<string, { userValue?: unknown }> })
    .settings ?? {})[ALERTZERO_ENABLED_SETTING_ID]?.userValue;
  return typeof userValue === 'boolean' ? userValue : undefined;
};

/** Sets the per-space AlertZero gate; `undefined` clears the user value back to the default. */
const setAlertZeroEnabled = async ({
  apiClient,
  headers,
  spaceId,
  enabled,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
  enabled: boolean | undefined;
}): Promise<void> => {
  const response = await apiClient.post(settingsPath(spaceId), {
    headers: { ...headers, 'kbn-xsrf': 'scout' },
    responseType: 'json',
    body: { changes: { [ALERTZERO_ENABLED_SETTING_ID]: enabled ?? null } },
  });
  expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
};

/** Execution ids of one workflow; the teardown drain cancels what is NOT in this list. */
const listExecutionIds = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  workflowId: string
): Promise<string[]> => {
  const response = await apiClient.get(WORKFLOW_EXECUTIONS_PATH(workflowId), {
    headers,
    responseType: 'json',
  });
  expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
  return ((response.body as { results?: Array<{ id: string }> }).results ?? []).map(
    (run) => run.id
  );
};

/**
 * Cancels the executions of `workflowId` that are in flight and absent from `knownIds` — the
 * ones the enable below started — then polls until none is left. Disabling a worker stops new
 * dispatches, not the run its enable started: without this drain the triage run is still
 * executing when the service account below is deleted, fails against it, and can raise a
 * proposal after the suite has gone.
 */
const cancelNewExecutions = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  workflowId: string,
  knownIds: readonly string[]
): Promise<void> => {
  const inFlightNew = async () => {
    const response = await apiClient.get(WORKFLOW_EXECUTIONS_PATH(workflowId), {
      headers,
      responseType: 'json',
    });
    return ((response.body as { results?: Array<{ id: string; status: string }> }).results ?? [])
      .filter((run) => !knownIds.includes(run.id))
      .filter((run) => !TERMINAL_EXECUTION_STATUSES.includes(run.status));
  };
  for (const run of await inFlightNew()) {
    const cancel = await apiClient.post(
      `api/workflows/executions/${encodeURIComponent(run.id)}/cancel`,
      {
        // The XSRF gate wants kbn-version/kbn-xsrf; PUBLIC_API_HEADERS carries
        // neither, so an unadorned cancel 400s before reaching the route.
        headers: { ...headers, 'kbn-xsrf': 'scout' },
        responseType: 'json',
      }
    );
    // The run may reach a terminal state between the list and the cancel; the
    // cancel then 404s and the poll below confirms nothing is left in flight.
    expect([200, 404], JSON.stringify(cancel.body)).toContain(cancel.statusCode);
  }
  await expect
    .poll(async () => (await inFlightNew()).length, {
      timeout: DRAIN_TIMEOUT_MS,
      intervals: [2_000],
    })
    .toBe(0);
};

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
  // The per-space AlertZero gate baseline, restored in teardown. The server config deliberately
  // does not pin this setting (an override would make it read-only and break other suites'
  // settings writes), so this suite enables it itself — every route it drives is behind it.
  let alertZeroBaseline: { enabled: boolean | undefined } | undefined;
  // Execution ids of the triage workflow that existed before this suite's enable; teardown
  // cancels and drains the rest (see `cancelNewExecutions`).
  let knownExecutionIds: string[] = [];

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const internalHeaders = { ...INTERNAL_API_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader };

    alertZeroBaseline = {
      enabled: await readAlertZeroEnabled({
        apiClient,
        headers: internalHeaders,
        spaceId: DEFAULT_SPACE_ID,
      }),
    };
    if (alertZeroBaseline.enabled !== true) {
      await setAlertZeroEnabled({
        apiClient,
        headers: internalHeaders,
        spaceId: DEFAULT_SPACE_ID,
        enabled: true,
      });
    }

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
    const account = await apiClient.post('internal/security/service_account', {
      headers: internalHeaders,
      body: { name: `alertzero-managed-workflows-${Date.now()}`, roles: ['superuser'] },
      responseType: 'json',
    });
    expect(account.statusCode, JSON.stringify(account.body)).toBe(200);
    serviceAccountId = (account.body as { id: string }).id;

    const workerUrl = `internal/alertzero/workers/${FLOOR_ALERT_TRIAGE_WORKER_ID}`;
    const catalog = await apiClient.get('internal/alertzero/workers', {
      headers: internalHeaders,
      responseType: 'json',
    });
    expect(catalog.statusCode, JSON.stringify(catalog.body)).toBe(200);
    const worker = (
      catalog.body as { workers: Array<{ id: string; settingsRevision?: string | null }> }
    ).workers.find((candidate) => candidate.id === FLOOR_ALERT_TRIAGE_WORKER_ID);
    expect(worker, `${FLOOR_ALERT_TRIAGE_WORKER_ID} is in the worker catalog`).toBeDefined();

    // Snapshot the workflow's executions BEFORE the enable: the enable installs the workflow
    // and starts its scheduled run, and teardown drains exactly the runs this suite started.
    knownExecutionIds = await listExecutionIds(
      apiClient,
      { ...PUBLIC_API_HEADERS, ...cookieHeader },
      FLOOR_ALERT_TRIAGE_WORKFLOW_ID
    );

    // Enabling an uninstalled worker installs its per-space managed document, so
    // this drives the same route the UI drives instead of assuming the document.
    const bind = await apiClient.patch(workerUrl, {
      headers: internalHeaders,
      body: {
        settingsRevision: worker?.settingsRevision ?? null,
        settings: { serviceAccountId },
      },
      responseType: 'json',
    });
    expect(bind.statusCode, JSON.stringify(bind.body)).toBe(200);
    const enable = await apiClient.patch(workerUrl, {
      headers: internalHeaders,
      body: { enabled: true },
      responseType: 'json',
    });
    expect(enable.statusCode, JSON.stringify(enable.body)).toBe(200);
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const errors: unknown[] = [];
    const attempt = async (step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    };
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const headers = { ...INTERNAL_API_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader };
    const workerUrl = `internal/alertzero/workers/${FLOOR_ALERT_TRIAGE_WORKER_ID}`;

    if (serviceAccountId) {
      // Disable first (an enabled worker needs an account), then drain the run the enable
      // started BEFORE deleting that account: the run executes as it, and a run still mid-model-
      // call when the account disappears fails against the deleted account and can raise a
      // proposal after this suite has gone.
      await attempt(async () => {
        const disable = await apiClient.patch(workerUrl, {
          headers,
          body: { enabled: false },
          responseType: 'json',
        });
        expect(disable.statusCode, JSON.stringify(disable.body)).toBe(200);
      });
      await attempt(async () => {
        await cancelNewExecutions(
          apiClient,
          { ...PUBLIC_API_HEADERS, ...cookieHeader },
          FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
          knownExecutionIds
        );
      });
      // Unbind before deleting the account: a worker left pointing at a deleted account leaks
      // into whatever spec runs next.
      await attempt(async () => {
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
      });
      await attempt(async () => {
        const accountId = serviceAccountId;
        if (!accountId) {
          return;
        }
        const removed = await apiClient.delete(
          `internal/security/service_account/${encodeURIComponent(accountId)}`,
          { headers, responseType: 'json' }
        );
        expect([200, 404], JSON.stringify(removed.body)).toContain(removed.statusCode);
      });
    }
    // Restore the per-space AlertZero gate this suite enabled (see beforeAll). Last and
    // best-effort: every gated-route user above has settled by now.
    await attempt(async () => {
      if (alertZeroBaseline) {
        await setAlertZeroEnabled({
          apiClient,
          headers,
          spaceId: DEFAULT_SPACE_ID,
          enabled: alertZeroBaseline.enabled,
        });
      }
    });
    if (errors.length > 0) {
      throw new Error(
        `AlertZero managed workflows teardown failed: ${errors
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .join('; ')}`
      );
    }
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
