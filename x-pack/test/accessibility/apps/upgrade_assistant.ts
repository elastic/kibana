/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

    it('Overview', async () => {
      await retry.waitFor('Upgrade Assistant overview tab to be visible', async () => {
        return testSubjects.exists('upgradeAssistantOverviewTabDetail') ? true : false;
      });
      await a11y.testAppSnapshot();
    });

    it('List View', async () => {
      await testSubjects.click('upgradeAssistantClusterTab');
      await retry.waitFor('Upgrade Assistant Cluster tab to be visible', async () => {
        return testSubjects.exists('upgradeAssistantOverviewTab') ? true : false;
      });
      return testSubjects.isDisplayed('pipelineDetails') ? true : false;
      await a11y.testAppSnapshot();
    });
  });
}
