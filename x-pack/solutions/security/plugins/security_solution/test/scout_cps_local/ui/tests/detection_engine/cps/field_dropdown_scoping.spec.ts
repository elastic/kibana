/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  test,
  CPS_TAGS,
  SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
  SPACE_PROJECT_ROUTING_ALL,
} from '../../../fixtures';

/**
 * CPS field dropdown scoping POC.
 *
 * Validates that field autocomplete dropdowns (e.g. threat match mapping fields)
 * respect the CPS project routing of the Kibana space. In an origin-only space
 * (`_alias:_origin`), dropdowns should list fields from the origin cluster only.
 * In an all-projects space (`_alias:*`), fields from both clusters should appear.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet cps_local
 */

test.describe('CPS field dropdown scoping - threat match mapping fields', { tag: CPS_TAGS }, () => {
  test('origin-only space: threat field dropdown shows origin fields but not linked fields', async ({
    kbnUrl,
    cpsTestData,
    cpsSpace,
    browserAuth,
    pageObjects,
  }) => {
    const { testIndex, runId, originMarkerField, linkedMarkerField } = cpsTestData;

    const spaceId = await cpsSpace.create({
      spaceId: `cps-ui-tm-orig-${runId}`,
      projectRouting: SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
    });

    await browserAuth.loginAsPlatformEngineer();
    await pageObjects.threatMatchRuleCreatePage.navigateToThreatMatchForm({
      kbnUrl,
      spaceId,
      testIndex,
    });

    await test.step('origin_marker field is available', async () => {
      const option = await pageObjects.threatMatchRuleCreatePage.openThreatFieldDropdownOption(
        originMarkerField
      );
      await expect(option).toBeVisible({ timeout: 15_000 });
    });

    await test.step('linked_marker field is NOT available', async () => {
      const option = await pageObjects.threatMatchRuleCreatePage.openThreatFieldDropdownOption(
        linkedMarkerField
      );
      await expect(option).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('all-projects space: threat field dropdown shows fields from both origin and linked clusters', async ({
    kbnUrl,
    cpsTestData,
    cpsSpace,
    browserAuth,
    pageObjects,
  }) => {
    const { testIndex, runId, originMarkerField, linkedMarkerField } = cpsTestData;

    const spaceId = await cpsSpace.create({
      spaceId: `cps-ui-tm-all-${runId}`,
      projectRouting: SPACE_PROJECT_ROUTING_ALL,
    });

    await browserAuth.loginAsPlatformEngineer();
    await pageObjects.threatMatchRuleCreatePage.navigateToThreatMatchForm({
      kbnUrl,
      spaceId,
      testIndex,
    });

    await test.step('origin_marker field is available', async () => {
      const option = await pageObjects.threatMatchRuleCreatePage.openThreatFieldDropdownOption(
        originMarkerField
      );
      await expect(option).toBeVisible({ timeout: 15_000 });
    });

    await test.step('linked_marker field is also available', async () => {
      const option = await pageObjects.threatMatchRuleCreatePage.openThreatFieldDropdownOption(
        linkedMarkerField
      );
      await expect(option).toBeVisible({ timeout: 15_000 });
    });
  });
});
