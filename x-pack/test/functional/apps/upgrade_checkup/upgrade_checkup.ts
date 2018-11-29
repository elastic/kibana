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

    it('allows user to navigate without authentication', async () => {
      await PageObjects.upgradeCheckup.navigateToPage();
      await PageObjects.upgradeCheckup.expectUpgradeCheckup();
    });
  });
}
