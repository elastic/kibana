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
/** Ceiling for a managed workflow to be installed and report valid after startup or a settings write. */
const INSTALL_TIMEOUT_MS = 20_000;

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

type SpaceSolution = 'security' | 'classic' | 'oblt' | 'es';

/** A space without a solution view is a Classic space. */
const readSpaceSolution = async ({
  apiClient,
  headers,
  spaceId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  spaceId: string;
}): Promise<SpaceSolution> => {
  // Spaces is a public API: it takes the public API version, not the internal one.
  const response = await apiClient.get(`api/spaces/space/${encodeURIComponent(spaceId)}`, {
    headers: { ...headers, ...PUBLIC_API_HEADERS },
    responseType: 'json',
  });
  expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
  return (response.body as { solution?: SpaceSolution }).solution ?? 'classic';
};

/**
 * Boots on the `alertzero` server config set, the set that carries the flags AlertZero's
 * managed workflows need (`serviceAccounts`, the Attack Discovery workflows feature flag).
 * `alertzero` and `agenticInvestigations` are on by default in stateful, so under plain
 * `test/scout/` both documents below are installed there too.
 *
 * The triage worker is installed but never enabled: enabling it would start a real sweep over
 * the default space's alerts. A settings write is what installs a worker's per-space document,
 * and it needs neither an AI model nor a service account while the worker stays disabled.
 */
apiTest.describe('AlertZero managed workflows', { tag: [...tags.stateful.classic] }, () => {
  // The per-space AlertZero gate baseline, restored in teardown. The server config deliberately
  // does not pin this setting (an override would make it read-only and break other suites'
  // settings writes), so this suite enables it itself — every route it drives is behind it.
  let alertZeroBaseline: { enabled: boolean | undefined } | undefined;
  // The default space's solution view before this suite switched it to Security; unset when it
  // already was Security, so teardown leaves it alone.
  let solutionBaseline: SpaceSolution | undefined;

  apiTest.beforeAll(async ({ apiClient, apiServices, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const internalHeaders = { ...INTERNAL_API_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader };

    // AlertZero answers 404 outside a Security solution space even with the gate on, and the
    // default space of a fresh stateful stack is Classic. Recorded before the switch so
    // afterAll (which runs even when this hook throws) restores it.
    const solution = await readSpaceSolution({
      apiClient,
      headers: internalHeaders,
      spaceId: DEFAULT_SPACE_ID,
    });
    if (solution !== 'security') {
      solutionBaseline = solution;
      await apiServices.spaces.setSolutionView({ id: DEFAULT_SPACE_ID, solution: 'security' });
    }

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

    const catalog = await apiClient.get('internal/alertzero/workers', {
      headers: internalHeaders,
      responseType: 'json',
    });
    expect(catalog.statusCode, JSON.stringify(catalog.body)).toBe(200);
    const worker = (
      catalog.body as { workers: Array<{ id: string; settingsRevision?: number | null }> }
    ).workers.find((candidate) => candidate.id === FLOOR_ALERT_TRIAGE_WORKER_ID);
    expect(worker, `${FLOOR_ALERT_TRIAGE_WORKER_ID} is in the worker catalog`).toBeDefined();

    // A null revision means the per-space document is not installed yet. An empty settings
    // write installs it with the defaults and leaves it disabled; an installed worker (and its
    // account, autonomy and enabled state) is left exactly as this suite found it.
    if (worker?.settingsRevision == null) {
      const install = await apiClient.patch(
        `internal/alertzero/workers/${FLOOR_ALERT_TRIAGE_WORKER_ID}`,
        {
          headers: internalHeaders,
          body: { settingsRevision: null, settings: {} },
          responseType: 'json',
        }
      );
      expect(install.statusCode, JSON.stringify(install.body)).toBe(200);
      expect((install.body as { worker: { enabled: boolean } }).worker.enabled).toBe(false);
    }
  });

  apiTest.afterAll(async ({ apiClient, apiServices, samlAuth }) => {
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

    // The installed triage document stays: it is disabled, so it never runs, and the
    // per-space catalog installs the same document on first use anyway.
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
    await attempt(async () => {
      if (solutionBaseline) {
        await apiServices.spaces.setSolutionView({
          id: DEFAULT_SPACE_ID,
          solution: solutionBaseline,
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
          { timeout: INSTALL_TIMEOUT_MS, intervals: [1_000] }
        )
        .toBe(true);
    });
  }
});
