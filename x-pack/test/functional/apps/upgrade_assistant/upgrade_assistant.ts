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
  const PageObjects = getPageObjects(['upgradeAssistant']);

  describe('Upgrade Checkup', function () {
    this.tags('includeFirefox');
    before(async () => await esArchiver.load('empty_kibana'));
    after(async () => {
      await PageObjects.upgradeAssistant.expectTelemetryHasFinish();
      await esArchiver.unload('empty_kibana');
    });

    it('allows user to navigate to upgrade checkup', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.expectUpgradeAssistant();
    });

    it('allows user to toggle deprecation logging', async () => {
      await PageObjects.upgradeAssistant.navigateToPage();
      await PageObjects.upgradeAssistant.expectDeprecationLoggingLabel('On');
      await PageObjects.upgradeAssistant.toggleDeprecationLogging();
      await PageObjects.upgradeAssistant.expectDeprecationLoggingLabel('Off');
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
