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
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        '/policy'
      );
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
      await testSubjects.existOrFail('policyListPage');
    },

    /**
     * Navigates to the Endpoint Policy Details page
     *
     * @param policyId
     */
    async navigateToPolicyDetails(policyId: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/policy/${policyId}`
      );
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
     * Finds and returns the Policy Details Page Cancel Button
     */
    async findCancelButton() {
      await this.ensureIsOnDetailsPage();
      return await testSubjects.find('policyDetailsCancelButton');
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

    /**
     * Finds and returns the Create New policy Policy button displayed on the List page
     */
    async findHeaderCreateNewButton() {
      // The Create button is initially disabled because we need to first make a call to Ingest
      // to retrieve the package version, so that the redirect works as expected. So, we wait
      // for that to occur here a well.
      await testSubjects.waitForEnabled('headerCreateNewPolicyButton');
      return await testSubjects.find('headerCreateNewPolicyButton');
    },

    /**
     * Used when looking a the Ingest create/edit package config pages. Finds the endpoint
     * custom configuaration component
     * @param onEditPage
     */
    async findPackageConfigEndpointCustomConfiguration(onEditPage: boolean = false) {
      return await testSubjects.find(`endpointPackageConfig_${onEditPage ? 'edit' : 'create'}`);
    },

    /**
     * Finds and returns the onboarding button displayed in empty List pages
     */
    async findOnboardingStartButton() {
      await testSubjects.waitForEnabled('onboardingStartButton');
      return await testSubjects.find('onboardingStartButton');
    },
  };
}
