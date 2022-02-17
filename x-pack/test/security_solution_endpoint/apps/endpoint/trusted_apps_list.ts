/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { IndexedHostsAndAlertsResponse } from '../../../../plugins/security_solution/common/endpoint/index_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'trustedApps']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const endpointTestResources = getService('endpointTestResources');
  const policyTestResources = getService('policyTestResources');

  describe('When on the Trusted Apps list', function () {
    let indexedData: IndexedHostsAndAlertsResponse;
    before(async () => {
      const endpointPackage = await policyTestResources.getEndpointPackage();
      await endpointTestResources.setMetadataTransformFrequency('1s', endpointPackage.version);
      indexedData = await endpointTestResources.loadEndpointData();
      await browser.refresh();
      await pageObjects.trustedApps.navigateToTrustedAppsList();
    });
    after(async () => {
      await endpointTestResources.unloadEndpointData(indexedData);
    });

    it('should not show page title if there is no trusted app', async () => {
      await testSubjects.missingOrFail('header-page-title');
    });

    it('should be able to add a new trusted app and remove it', async () => {
      const SHA256 = 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476';

      // Add it
      await testSubjects.click('trustedAppsListAddButton');
      await testSubjects.setValue(
        'addTrustedAppFlyout-createForm-nameTextField',
        'Windows Defender'
      );
      await testSubjects.setValue(
        'addTrustedAppFlyout-createForm-conditionsBuilder-group1-entry0-value',
        SHA256
      );
      await testSubjects.click('addTrustedAppFlyout-createButton');
      expect(
        await testSubjects.getVisibleText('trustedAppCard-criteriaConditions-condition')
      ).to.equal(
        'AND process.hash.*IS a4370c0cf81686c0b696fa6261c9d3e0d810ae704ab8301839dffd5d5112f476'
      );
      await pageObjects.common.closeToast();

      // Title is shown after adding an item
      expect(await testSubjects.getVisibleText('header-page-title')).to.equal(
        'Trusted applications'
      );

      // Remove it
      await pageObjects.trustedApps.clickCardActionMenu();
      await testSubjects.click('deleteTrustedAppAction');
      await testSubjects.click('trustedAppDeletionConfirm');
      await testSubjects.waitForDeleted('trustedAppDeletionConfirm');
      // We only expect one trusted app to have been visible
      await testSubjects.missingOrFail('trustedAppCard');
      // Header has gone because there is no trusted app
      await testSubjects.missingOrFail('header-page-title');
    });
  });
};
