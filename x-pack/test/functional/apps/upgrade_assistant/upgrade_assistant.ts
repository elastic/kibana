/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const security = getService('security');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  // Updated for the hiding of the UA UI.
  describe('Upgrade Checkup', function () {
    this.tags('skipFirefox');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await security.testUser.setRoles(['global_upgrade_assistant_role']);
    });

    after(async () => {
      await PageObjects.upgradeAssistant.waitForTelemetryHidden();
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await security.testUser.restoreDefaults();
    });

    it('Overview page', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await retry.waitFor('Upgrade Assistant overview page to be visible', async () => {
        return testSubjects.exists('comingSoonPrompt');
      });
    });

    it.skip('allows user to navigate to upgrade checkup', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
    });

    it.skip('allows user to toggle deprecation logging', async () => {
      log.debug('expect initial state to be ON');
      expect(await PageObjects.upgradeAssistant.deprecationLoggingEnabledLabel()).to.be('On');
      expect(await PageObjects.upgradeAssistant.isDeprecationLoggingEnabled()).to.be(true);

      await retry.try(async () => {
        log.debug('Now toggle to off');
        await PageObjects.upgradeAssistant.toggleDeprecationLogging();

        log.debug('expect state to be OFF after toggle');
        expect(await PageObjects.upgradeAssistant.isDeprecationLoggingEnabled()).to.be(false);
        expect(await PageObjects.upgradeAssistant.deprecationLoggingEnabledLabel()).to.be('Off');
      });

      log.debug('Now toggle back on.');
      await retry.try(async () => {
        await PageObjects.upgradeAssistant.toggleDeprecationLogging();
        log.debug('expect state to be ON after toggle');
        expect(await PageObjects.upgradeAssistant.isDeprecationLoggingEnabled()).to.be(true);
        expect(await PageObjects.upgradeAssistant.deprecationLoggingEnabledLabel()).to.be('On');
      });
    });

    it.skip('allows user to open cluster tab', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickTab('cluster');
      expect(await PageObjects.upgradeAssistant.issueSummaryText()).to.be(
        'You have no cluster issues.'
      );
    });

    it.skip('allows user to open indices tab', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickTab('indices');
      expect(await PageObjects.upgradeAssistant.issueSummaryText()).to.be(
        'You have no index issues.'
      );
    });
  });
}
