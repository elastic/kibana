/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout-security/ui';
import { test, LOCAL_CPS_TAGS, SPACE_PROJECT_ROUTING_ALL } from '../../../fixtures';

// The field-caps call hangs ~60–90s during a brownout before timing out.
// Budget 3 minutes for the full hang plus assertions.
const BROWNOUT_TEST_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Regression test for elastic/kibana#279329.
 *
 * Validates that the Security Alerts page degrades gracefully — showing a warning
 * callout and still rendering the alerts table — when a linked ES project is in a
 * brownout state (sockets reachable but unresponsive, simulated with `docker pause`).
 *
 * Before this fix the page rendered a full-page "Unable to retrieve the data view"
 * danger prompt, hiding all alerts even though the origin cluster was healthy.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet cps_local
 *
 * After adding this spec, regenerate the manifest:
 *   node scripts/scout update-test-config-manifests \
 *     --config x-pack/solutions/security/plugins/security_solution/test/scout_cps_local/ui/playwright.config.ts
 */

test.describe('CPS brownout — alerts page degraded state', { tag: LOCAL_CPS_TAGS }, () => {
  test('alerts page shows a warning callout (not a hard error) when a linked project is unresponsive', async ({
    kbnUrl,
    cpsSpace,
    browserAuth,
    page,
    linkedClusterBrownout,
  }) => {
    // The field-caps call hangs ~60–90s during a brownout. Extend the test timeout
    // beyond the global 60s default so the hang plus assertions can complete.
    test.setTimeout(BROWNOUT_TEST_TIMEOUT_MS);

    // Create a space with _alias:* routing so field-caps fans out to the linked cluster.
    const spaceId = await cpsSpace.create({
      spaceId: `cps-brownout-${randomUUID().slice(0, 8)}`,
      projectRouting: SPACE_PROJECT_ROUTING_ALL,
    });

    await browserAuth.loginAsPlatformEngineer();

    // Pause the linked ES nodes (brownout). The fixture tears down by unpausing them.
    await linkedClusterBrownout.pause();

    // Navigate to the alerts page. The _fields_for_wildcard call fans out to the
    // paused cluster and hangs ~60–90s before the transport layer times out.
    await page.goto(kbnUrl.app('security/alerts', { space: spaceId }));

    // After the timeout, the data view resolves in a degraded state
    // (status=ready, hasMatchedIndices()=false). The page should show a warning
    // callout above the alerts content — not a full-page error.
    const degradedCallout = page.testSubj.locator('alerts-page-data-view-degraded');
    await expect(degradedCallout).toBeVisible({ timeout: 120_000 });

    // The alerts content (and table) must still render below the callout.
    const alertsContent = page.testSubj.locator('alerts-page-content');
    await expect(alertsContent).toBeVisible();

    // Regression guard: the old full-page danger prompt must not appear.
    const hardError = page.testSubj.locator('alerts-page-data-view-error');
    await expect(hardError).not.toBeVisible();
  });
});
