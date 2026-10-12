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
 * `detection_coverage` is a static rule workflow, installed into the global
 * space by AlertZero's `setup()`.
 *
 * `floor_alert_triage` is a dynamic worker: nothing installs it at startup, and
 * installing one uses `workflowIdSuffix: spaceId`, so the stored id is
 * `<worker id>-<space id>`. Querying the bare definition id finds no document.
 */
const DETECTION_COVERAGE_WORKFLOW_ID = 'system-security-detection-coverage';
const FLOOR_ALERT_TRIAGE_WORKER_ID = 'system-security-floor-alert-triage';
const FLOOR_ALERT_TRIAGE_WORKFLOW_ID = `${FLOOR_ALERT_TRIAGE_WORKER_ID}-${DEFAULT_SPACE_ID}`;

/**
 * Boots on the `alertzero` server config set, the set that turns on
 * `xpack.alertzero.enabled` (and `agenticInvestigations`, which AlertZero
 * requires). AlertZero is off by default, so under plain `test/scout/` neither
 * document below is ever installed.
 */
apiTest.describe('AlertZero managed workflows', { tag: [...tags.stateful.classic] }, () => {
  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    // Enabling an uninstalled worker installs its per-space managed document, so
    // this drives the same route the UI drives instead of assuming the document.
    const response = await apiClient.patch(
      `internal/alertzero/workers/${FLOOR_ALERT_TRIAGE_WORKER_ID}`,
      {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        body: { enabled: true },
        responseType: 'json',
      }
    );
    expect(response.statusCode).toBe(200);
  });

  for (const workflowId of [DETECTION_COVERAGE_WORKFLOW_ID, FLOOR_ALERT_TRIAGE_WORKFLOW_ID]) {
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
          { timeout: 20_000, intervals: [1_000] }
        )
        .toBe(true);
    });
  }
});
