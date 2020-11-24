/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'trustedApps']);
  const testSubjects = getService('testSubjects');

  describe('When on the Trusted Apps list', function () {
    this.tags('ciGroup7');

    before(async () => {
      await pageObjects.trustedApps.navigateToTrustedAppsList();
    });

    it('should show page title', async () => {
      expect(await testSubjects.getVisibleText('header-page-title')).to.equal(
        'Trusted Applications'
      );
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
      expect(await testSubjects.getVisibleText('conditionValue')).to.equal(SHA256.toLowerCase());
      await pageObjects.common.closeToast();

      // Remove it
      await testSubjects.click('trustedAppDeleteButton');
      await testSubjects.click('trustedAppDeletionConfirm');
      await testSubjects.waitForDeleted('trustedAppDeletionConfirm');
      expect(await testSubjects.getVisibleText('trustedAppsListViewCountLabel')).to.equal(
        '0 trusted applications'
      );
    });
  });
};
