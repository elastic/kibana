/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const security = getService('security');
  const log = getService('log');

  describe('Upgrade Checkup', function () {
    this.tags('includeFirefox');

    before(async () => {
      await esArchiver.load('empty_kibana');
      await security.testUser.setRoles(['global_upgrade_assistant_role']);
    });

    after(async () => {
      await PageObjects.upgradeAssistant.expectTelemetryHasFinish();
      await esArchiver.unload('empty_kibana');
      await security.testUser.restoreDefaults();
    });

    it('allows user to navigate to upgrade checkup', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.expectUpgradeAssistant();
    });

    it('allows user to toggle deprecation logging', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      log.debug('expect initial state to be ON');
      await PageObjects.upgradeAssistant.expectDeprecationLoggingLabel('On');
      log.debug('Now toggle to off');
      await PageObjects.upgradeAssistant.toggleDeprecationLogging();
      await PageObjects.common.sleep(2000);
      log.debug('expect state to be OFF after toggle');
      await PageObjects.upgradeAssistant.expectDeprecationLoggingLabel('Off');
      await PageObjects.upgradeAssistant.toggleDeprecationLogging();
      await PageObjects.common.sleep(2000);
      log.debug('expect state to be ON after toggle');
      await PageObjects.upgradeAssistant.expectDeprecationLoggingLabel('On');
    });

    it('allows user to open cluster tab', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickTab('cluster');
      await PageObjects.upgradeAssistant.expectIssueSummary('You have no cluster issues.');
    });

    it('allows user to open indices tab', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.clickTab('indices');
      await PageObjects.upgradeAssistant.expectIssueSummary('You have no index issues.');
    });
  });
}
