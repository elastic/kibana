/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPolicyPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  return {
    /**
     * Navigates to the Endpoint Policy List
     */
    async navigateToPolicyList() {
      await pageObjects.common.navigateToApp('securitySolution', { hash: '/management/policy' });
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Finds and returns the Policy Details Page Save button
     */
    async findFirstActionsButton() {
      await this.ensureIsOnPolicyPage();
      return (await testSubjects.findAll('policyActionsButton'))[0];
    },

    /**
     * Finds and returns the Policy Details Page Save button
     */
    async launchAndFindDeleteModal() {
      const actionsButton = await this.findFirstActionsButton();
      await actionsButton.click();
      const deleteAction = await testSubjects.find('policyDeleteButton');
      await deleteAction.click();
      return await testSubjects.find('policyListDeleteModal');
    },

    /**
     * ensures that the Policy Page is the currently display view
     */
    async ensureIsOnPolicyPage() {
      await testSubjects.existOrFail('policyTable');
    },

    /**
     * Navigates to the Endpoint Policy Details page
     *
     * @param policyId
     */
    async navigateToPolicyDetails(policyId: string) {
      await pageObjects.common.navigateToApp('securitySolution', {
        hash: `/management/policy/${policyId}`,
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Finds and returns the Policy Details Page Save button
     */
    async findSaveButton() {
      await this.ensureIsOnDetailsPage();
      return await testSubjects.find('policyDetailsSaveButton');
    },

    /**
     * ensures that the Details Page is the currently display view
     */
    async ensureIsOnDetailsPage() {
      await testSubjects.existOrFail('policyDetailsPage');
    },

    /**
     * Clicks Save button and confirms update on the Policy Details page
     */
    async confirmAndSave() {
      await this.ensureIsOnDetailsPage();
      await (await this.findSaveButton()).click();
      await testSubjects.existOrFail('policyDetailsConfirmModal');
      await pageObjects.common.clickConfirmOnModal();
    },
  };
}
