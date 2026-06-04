/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { apiTest } from '../fixtures';

/**
 * Ported from FTR `apis/synthetics/create_monitor_private_location.ts`, which
 * was itself `describe.skip` — failing per
 * https://github.com/elastic/kibana/issues/258046.
 *
 * Kept skipped: most cases assert the *full* generated Fleet package-policy via
 * the FTR `comparePolicies` / `getTestSyntheticsPolicy` sample-data helpers
 * (legacy `${monitorId}-${locationId}-${spaceId}` policy-id format). Un-skip
 * once #258046 is resolved and that sample-data comparison is ported to Scout.
 *
 * Original `it` titles (preserved for inventory):
 *   - adds a test fleet policy
 *   - add a test private location
 *   - does not add a monitor if there is an error in creating integration
 *   - adds a monitor in private location
 *   - added an integration for previously added monitor
 *   - edits a monitor with additional private location
 *   - added an integration for second location in edit monitor
 *   - deletes integration for a removed location from monitor
 *   - deletes integration for a deleted monitor
 *   - handles spaces
 *   - handles is_tls_enabled true
 *   - handles is_tls_enabled false
 *   - handles auto upgrading policies
 *   - returns bad request if payload is invalid for HTTP monitor
 *   - returns bad request if monitor type is invalid
 *   - can create valid monitors without all defaults
 *   - can disable retries
 *   - can enable retries with max attempts
 *   - can enable retries
 *   - cannot create a invalid monitor without a monitor type
 *   - omits unknown keys
 *   - preserves the passed namespace when preserve_namespace is passed
 *   - sets namespace to custom namespace when set
 */
apiTest.describe.skip(
  'PrivateLocationCreateMonitor',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    apiTest('pending Scout port (blocked by #258046) — see file header', async ({ apiClient }) => {
      expect(Boolean(apiClient)).toBe(true);
    });
  }
);
