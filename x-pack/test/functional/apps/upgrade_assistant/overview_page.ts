/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantOverviewPageFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  describe.skip('Overview Page', function () {
    this.tags('skipFirefox');

    before(async () => {
      await security.testUser.setRoles(['superuser']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    beforeEach(async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
    });

    it('shows coming soon prompt', async () => {
      await retry.waitFor('Upgrade Assistant overview page to be visible', async () => {
        return testSubjects.exists('comingSoonPrompt');
      });
    });

    it('Should render all steps', async () => {
      testSubjects.exists('backupStep-incomplete');
      testSubjects.exists('fixIssuesStep-incomplete');
      testSubjects.exists('fixLogsStep-incomplete');
      testSubjects.exists('upgradeStep');
    });

    describe('fixLogsStep', () => {
      before(async () => {
        await PageObjects.upgradeAssistant.navigateToPage();
        // Access to system indices will be deprecated and should generate a deprecation log
        await es.indices.get({ index: '.kibana' });
        // Only click deprecation logging toggle if its not already enabled
        if (!(await testSubjects.isDisplayed('externalLinksTitle'))) {
          await PageObjects.upgradeAssistant.clickDeprecationLoggingToggle();
        }

        await retry.waitFor('UA external links title to be present', async () => {
          return testSubjects.isDisplayed('externalLinksTitle');
        });
      });

      beforeEach(async () => {
        await PageObjects.upgradeAssistant.navigateToPage();
      });

      it('Shows warnings callout if there are deprecations', async () => {
        testSubjects.exists('hasWarningsCallout');
      });

      it('Shows no warnings callout if there are no deprecations', async () => {
        await PageObjects.upgradeAssistant.clickResetLastCheckpointButton();
        testSubjects.exists('noWarningsCallout');
      });
    });
  });
}
