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

  describe('Overview Page', function () {
    this.tags('skipFirefox');

    before(async () => {
      await security.testUser.setRoles(['superuser', 'global_upgrade_assistant_role']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    beforeEach(async () => {
      await PageObjects.upgradeAssistant.navigateToPage();

      await retry.waitFor('Upgrade Assistant overview page to be visible', async () => {
        return testSubjects.exists('overview');
      });
    });

    it('Should render all steps', async () => {
      testSubjects.exists('backupStep');
      testSubjects.exists('fixIssuesStep');
      testSubjects.exists('fixLogsStep');
      testSubjects.exists('backupStep');
    });

    describe('fixLogsStep', () => {
      beforeEach(async () => {
        // Access to system indices will be deprecated and should generate a deprecation log
        await es.transport.request({
          method: 'GET',
          path: '/.apm-agent-configuration',
        });

        await PageObjects.upgradeAssistant.navigateToPage();
        await PageObjects.upgradeAssistant.clickDeprecationLoggingToggle();

        await retry.waitFor('UA external links title to be present', async () => {
          return testSubjects.isDisplayed('externalLinksTitle');
        });
      });

      it('Shows warnings callout if there are deprecations', async () => {
        testSubjects.exists('hasWarningsCallout');
      });

      it('Shows shows no warnings callout if there are no deprecations', async () => {
        await PageObjects.upgradeAssistant.clickResetLastCheckpointButton();
        testSubjects.exists('noWarningsCallout');
      });
    });
  });
}
