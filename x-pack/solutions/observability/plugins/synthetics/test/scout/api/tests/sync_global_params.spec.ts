/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { apiTest } from '../fixtures';

/**
 * Ported from FTR `apis/synthetics/sync_global_params.ts`, which was itself
 * `describe.skip` (tagged `skipCloud`).
 *
 * Kept skipped: the suite asserts the *full* generated Fleet package-policy via
 * the FTR `comparePolicies` / `getTestSyntheticsPolicy` sample-data helpers and
 * relies on the legacy `${monitorId}-${locationId}-${spaceId}` package-policy id
 * format. Un-skip once that sample-data comparison is ported to Scout and the
 * legacy policy-id assertions are updated to the new spaceless format.
 *
 * Original `it` titles (preserved for inventory):
 *   - adds a test fleet policy
 *   - add a test private location
 *   - adds a monitor in private location
 *   - added an integration for previously added monitor
 *   - adds a test param
 *   - get list of params
 *   - added params to for previously added integration
 *   - add a http monitor using param
 *   - parsed params for previously added http monitors
 *   - delete all params and sync again
 */
apiTest.describe.skip(
  'SyncGlobalParams',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    apiTest(
      'pending Scout port (comparePolicies sample data) — see file header',
      async ({ apiClient }) => {
        expect(Boolean(apiClient)).toBe(true);
      }
    );
  }
);
