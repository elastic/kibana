/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable:no-default-export
export default function upgradeCheckupFunctionalTests({
  getService,
  getPageObjects,
}: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['upgradeCheckup']);

  describe('Upgrade Checkup', () => {
    before(async () => await esArchiver.load('empty_kibana'));
    after(async () => await esArchiver.unload('empty_kibana'));

    it('allows user to navigate to upgrade checkup', async () => {
      await PageObjects.upgradeCheckup.navigateToPage();
      await PageObjects.upgradeCheckup.expectUpgradeCheckup();
    });

    it('allows user to toggle deprecation logging', async () => {
      await PageObjects.upgradeCheckup.navigateToPage();
      await PageObjects.upgradeCheckup.expectDeprecationLoggingLabel('On');
      await PageObjects.upgradeCheckup.toggleDeprecationLogging();
      await PageObjects.upgradeCheckup.expectDeprecationLoggingLabel('Off');
    });

    it('allows user to open cluster tab', async () => {
      await PageObjects.upgradeCheckup.navigateToPage();
      await PageObjects.upgradeCheckup.clickTab('cluster');
      await PageObjects.upgradeCheckup.expectIssueSummary('You have no cluster issues.');
    });

    it('allows user to open indices tab', async () => {
      await PageObjects.upgradeCheckup.navigateToPage();
      await PageObjects.upgradeCheckup.clickTab('indices');
      await PageObjects.upgradeCheckup.expectIssueSummary('You have no indices issues.');
    });
  });
}
