/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPolicyPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const retryService = getService('retry');

  return {
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
     * Finds and returns the Advanced Policy Show/Hide Button
     */
    async findAdvancedPolicyButton() {
      await this.ensureIsOnDetailsPage();
      return await testSubjects.find('advancedPolicyButton');
    },

    async isAdvancedSettingsExpanded() {
      return await testSubjects.exists('advancedPolicyPanel');
    },

    /**
     * shows the advanced settings section and scrolls it into view
     */
    async showAdvancedSettingsSection() {
      if (!(await this.isAdvancedSettingsExpanded())) {
        const expandButton = await this.findAdvancedPolicyButton();
        await expandButton.click();
      }

      await testSubjects.existOrFail('advancedPolicyPanel');
      await testSubjects.scrollIntoView('advancedPolicyPanel');
    },

    /**
     * Hides the advanced settings section
     */
    async hideAdvancedSettingsSection() {
      if (await this.isAdvancedSettingsExpanded()) {
        const expandButton = await this.findAdvancedPolicyButton();
        await expandButton.click();
      }
      await testSubjects.missingOrFail('advancedPolicyPanel');
    },

    /**
     * Finds and returns the linux connection_delay Advanced Policy field
     */
    async findAdvancedPolicyField() {
      await this.ensureIsOnDetailsPage();
      return await testSubjects.find('linux.advanced.agent.connection_delay');
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

      const saveButton = await this.findSaveButton();

      // Sometimes, data retrieval errors may have been encountered by other security solution processes
      // (ex. index fields search here: `x-pack/plugins/security_solution/public/common/containers/source/index.tsx:181`)
      // which are displayed using one or more Toast messages. This in turn prevents the user from
      // actually clicking the Save button. Because those errors are not associated with Policy details,
      // we'll first check that all toasts are cleared
      await pageObjects.common.clearAllToasts();

      await saveButton.click();
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
     * Used when looking a the Ingest create/edit package policy pages. Finds the endpoint
     * custom configuaration component
     * @param onEditPage
     */
    async findPackagePolicyEndpointCustomConfiguration(onEditPage: boolean = false) {
      return await testSubjects.find(`endpointPackagePolicy_${onEditPage ? 'edit' : 'create'}`);
    },

    /**
     * Waits for a Checkbox/Radiobutton to have its `isSelected()` value match the provided expected value
     * @param selector
     * @param expectedSelectedValue
     */
    async waitForCheckboxSelectionChange(
      selector: string,
      expectedSelectedValue: boolean
    ): Promise<void> {
      await retryService.try(async () => {
        expect(await testSubjects.isSelected(selector)).to.be(expectedSelectedValue);
      });
    },
  };
}
