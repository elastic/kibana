/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getPolicySettingsFormTestSubjects } from '@kbn/security-solution-plugin/public/management/pages/policy/view/policy_settings_form/mocks';
import { FtrProviderContext } from '../configs/ftr_provider_context';

export function EndpointPolicyPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const retryService = getService('retry');
  const toasts = getService('toasts');
  const formTestSubj = getPolicySettingsFormTestSubjects();

  return {
    /**
     * Navigates to the Endpoint Policy List page
     */
    async navigateToPolicyList() {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/policy`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
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
     * Ensures the current page is the policy list page
     */
    async ensureIsOnListPage() {
      await testSubjects.existOrFail('policyListPage');
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

    async isAdvancedSettingsExpanded() {
      return await testSubjects.exists(formTestSubj.advancedSection.settingsContainer);
    },

    /**
     * shows the advanced settings section and scrolls it into view
     */
    async showAdvancedSettingsSection() {
      if (!(await this.isAdvancedSettingsExpanded())) {
        await testSubjects.click(formTestSubj.advancedSection.showHideButton);
      }
      await testSubjects.scrollIntoView(formTestSubj.advancedSection.settingsContainer);
    },

    /**
     * Hides the advanced settings section
     */
    async hideAdvancedSettingsSection() {
      if (await this.isAdvancedSettingsExpanded()) {
        await testSubjects.click(formTestSubj.advancedSection.showHideButton);
      }
      await testSubjects.missingOrFail(formTestSubj.advancedSection.settingsContainer);
    },

    /**
     * Finds and returns the linux connection_delay Advanced Policy field
     */
    async findAdvancedPolicyField() {
      await this.ensureIsOnDetailsPage();
      return await testSubjects.find('linux.advanced.agent.connection_delay');
    },

    /**
     * ensures that the Details Page is currently displayed
     */
    async ensureIsOnDetailsPage() {
      await testSubjects.existOrFail('policyDetailsPage');
    },

    /**
     * Clicks Save button and confirms update on the Policy Details page
     */
    async confirmAndSave() {
      await this.ensureIsOnDetailsPage();

      // Sometimes, data retrieval errors may have been encountered by other security solution processes
      // (ex. index fields search here: `x-pack/plugins/security_solution/public/common/containers/source/index.tsx:181`)
      // which are displayed using one or more Toast messages. This in turn prevents the user from
      // actually clicking the Save button. Because those errors are not associated with Policy details,
      // we'll first check that all toasts are cleared
      await toasts.dismissAll();

      await testSubjects.click('policyDetailsSaveButton');
      await testSubjects.existOrFail('policyDetailsConfirmModal');
      await pageObjects.common.clickConfirmOnModal();
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
