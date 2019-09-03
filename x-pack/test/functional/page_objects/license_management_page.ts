/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function LicenseManagementPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async licenseText() {
      return await testSubjects.getVisibleText('licenseText');
    },
    async revertLicenseButton() {
      return await testSubjects.find('revertToBasicButton');
    },
    async revertLicenseConfirmButton() {
      return await testSubjects.find('confirmModalConfirmButton');
    },

    async revertLicenseToBasic() {
      await (await this.revertLicenseButton()).click();
      await retry.waitFor('Confirm Modal to Be Visible and Show Revert Title', async () => {
        const modalTitle = await testSubjects.find('confirmModalTitleText');
        return (
          (await modalTitle.isDisplayed()) &&
          (await modalTitle.getVisibleText()) === 'Confirm Revert to Basic License'
        );
      });
      await (await this.revertLicenseConfirmButton()).click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },
  };
}
