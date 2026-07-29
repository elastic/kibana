/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout UI tests for the flyout_v2 IOC (Indicator of Compromise) flyout.
 *
 * Entry path: restore the IOC flyout from its persisted URL descriptor.
 *
 * Each test indexes a uniquely-named indicator into the worker's index and restores it by exact
 * document ID and index, keeping assertions deterministic across parallel workers.
 *
 * Tagged `stateful.classic` only, since the Threat Intelligence page is not available in all
 * serverless security configurations.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe('IOC flyout v2', { tag: [...tags.stateful.classic] }, () => {
  let indicatorId: string;
  let indicatorIndex: string;
  let indicatorName: string;

  spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
    ({ indicatorId, indicatorIndex, indicatorName } =
      await apiServices.threatIntelligence.createFileIndicatorFixture(scoutSpace.id));
    await browserAuth.loginAsPlatformEngineer();
  });

  spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
    await apiServices.threatIntelligence.cleanupFileIndicatorFixture(scoutSpace.id);
  });

  spaceTest(
    'restores the indicator from URL state and renders its overview',
    async ({ pageObjects }) => {
      await pageObjects.iocFlyout.openForIndicator({ indicatorId, indicatorIndex });

      await expect(pageObjects.iocFlyout.indicatorName).toContainText(indicatorName);
      await expect(pageObjects.iocFlyout.overviewTable).toBeVisible();
    }
  );
});
