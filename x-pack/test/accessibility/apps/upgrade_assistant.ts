/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Upgrade Assistant Home', () => {
    before(async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
    });

    it('Overview Tab', async () => {
      await retry.waitFor('Upgrade Assistant overview tab to be visible', async () => {
        return testSubjects.exists('upgradeAssistantOverviewTabDetail');
      });
      await a11y.testAppSnapshot();
    });

    it('Cluster Tab', async () => {
      await testSubjects.click('upgradeAssistantClusterTab');
      await retry.waitFor('Upgrade Assistant Cluster tab to be visible', async () => {
        return testSubjects.exists('upgradeAssistantClusterTabDetail');
      });
      await a11y.testAppSnapshot();
    });

    it('Indices Tab', async () => {
      await testSubjects.click('upgradeAssistantIndicesTab');
      await retry.waitFor('Upgrade Assistant Cluster tab to be visible', async () => {
        return testSubjects.exists('upgradeAssistantIndexTabDetail');
      });
      await a11y.testAppSnapshot();
    });
  });
}
