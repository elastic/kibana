/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0. You may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';

// Inline IDs to avoid pulling in @kbn/workflows, which imports YAML files that
// Playwright's esbuild transform cannot load. These are stable managed workflow
// identifiers defined in @kbn/workflows managed/definitions/alertzero.
// detection_coverage and floor_alert_triage are LLM-bearing alertzero workflows
// with no prior executing coverage; this spec proves they install and validate.
const MANAGED_ALERTZERO_WORKFLOW_IDS = [
  'system-security-detection-coverage',
  'system-security-floor-alert-triage',
] as const;

/**
 * Verifies that the alertzero managed workflows are installed and marked valid.
 * Installation is asynchronous (reactive observable in plugin start), so each
 * check polls until the workflow appears and reports valid.
 */
apiTest.describe('AlertZero managed workflows', { tag: [...tags.stateful.classic] }, () => {
  for (const workflowId of MANAGED_ALERTZERO_WORKFLOW_IDS) {
    apiTest(`${workflowId}: is installed and valid`, async ({ apiClient, samlAuth }) => {
      const editorCredentials = await samlAuth.asInteractiveUser('editor');
      const headers = { ...PUBLIC_API_HEADERS, ...editorCredentials.cookieHeader };

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
