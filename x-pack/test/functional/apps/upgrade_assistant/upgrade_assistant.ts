/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  describe('Upgrade Checkup', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load('empty_kibana');
      await security.testUser.setRoles(['global_upgrade_assistant_role']);
    });

    after(async () => {
      await PageObjects.upgradeAssistant.waitForTelemetryHidden();
      await esArchiver.unload('empty_kibana');
      await security.testUser.restoreDefaults();
    });

    it('allows user to navigate to upgrade checkup', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
    });

    it('allows user to toggle deprecation logging', async () => {
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

    it('allows user to open cluster tab', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickTab('cluster');
      expect(await PageObjects.upgradeAssistant.issueSummaryText()).to.be(
        'You have no cluster issues.'
      );
    });

    it('allows user to open indices tab', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickTab('indices');
      expect(await PageObjects.upgradeAssistant.issueSummaryText()).to.be(
        'You have no index issues.'
      );
    });
  });
}
