/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPolicyPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);

  return {
    /**
     * Navigates to the Endpoint Policy Details page
     *
     * @param policyId
     */
    async navigateToPolicyDetails(policyId: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', `/policy/${policyId}`);
    },

    /**
     * Navigate to the Endpoint Policy List page
     */
    async navigateToPolicyList() {
      await pageObjects.common.navigateToUrlWithBrowserHistory('endpoint', `/policy`);
    },

    /**
     * Finds and returns the Policy Page Save button
     */
    async findSaveButton() {
      return await testSubjects.find('policyDetailsSaveButton');
    },

    /**
     * ensures that the Details Page is the currently display view
     */
    async ensureIsOnDetailsPage() {
      await testSubjects.existOrFail('policyDetailsPage');
    },

    /**
     * Clicks Save button and confirms update
     */
    async confirmAndSave() {
      await this.ensureIsOnDetailsPage();
      await (await this.findSaveButton()).click();
      await testSubjects.existOrFail('policyDetailsConfirmModal');
      await pageObjects.common.clickConfirmOnModal();
    },
  };
}
