/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function IngestManagerCreatePackagePolicy({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const pageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  return {
    /**
     * Validates that the page shown is the Package Policy Create Page
     */
    async ensureOnCreatePageOrFail() {
      await testSubjects.existOrFail('createPackagePolicy_header');
    },

    /**
     * Finds and returns the Cancel button on the sticky bottom bar
     */
    async findCancelButton() {
      return await testSubjects.find('createPackagePolicyCancelButton');
    },

    /**
     * Finds and returns the Cancel back link at the top of the create page
     */
    async findBackLink() {
      return await testSubjects.find('createPackagePolicy_cancelBackLink');
    },

    /**
     * Finds and returns the save button on the sticky bottom bar
     */
    async findDSaveButton() {
      return await testSubjects.find('createPackagePolicySaveButton');
    },

    /**
     * Selects an agent policy on the form
     * @param name
     * Visual name of the policy. if one is not provided, the first agent
     * policy on the list will be chosen
     */
    async selectAgentPolicy(name?: string) {
      // if we have a name, then find the button with that `title` set.
      if (name) {
        await find.clickByCssSelector(`[data-test-subj="agentPolicyItem"][title="${name}"]`);
      }
      // Else, just select the first agent policy that is present
      else {
        await testSubjects.click('agentPolicyItem');
      }
    },

    /**
     * Returns the package Policy name currently populated on the input field
     */
    async getPackagePolicyName() {
      return testSubjects.getAttribute('packagePolicyNameInput', 'value');
    },

    /**
     * Set the name of the package Policy on the input field
     * @param name
     */
    async setPackagePolicyName(name: string) {
      // Because of the bottom sticky bar, we need to scroll section 2 into view
      // so that `setValue()` enters the data on the input field.
      await testSubjects.scrollIntoView('dataCollectionSetupStep');
      await testSubjects.setValue('packagePolicyNameInput', name);
    },

    /**
     * Waits for the save Notification toast to be visible
     */
    async waitForSaveSuccessNotification() {
      await testSubjects.existOrFail('packagePolicyCreateSuccessToast');
    },

    /**
     * Validates that the page shown is the Package Policy Edit Page
     */
    async ensureOnEditPageOrFail() {
      await testSubjects.existOrFail('editPackagePolicy_header');
    },

    /**
     * Navigates to the Ingest Agent configuration Edit Package Policy page
     */
    async navigateToAgentPolicyEditPackagePolicy(agentPolicyId: string, packagePolicyId: string) {
      await pageObjects.common.navigateToApp('ingestManager', {
        hash: `/policies/${agentPolicyId}/edit-integration/${packagePolicyId}`,
      });
      await this.ensureOnEditPageOrFail();
    },

    /**
     * Returns the Endpoint Callout that is displayed on the Integration Policy create/edit pages
     */
    async findEndpointActionsButton() {
      const button = await testSubjects.find('endpointActions');
      await this.scrollToCenterOfWindow(button);
      return button;
    },

    /**
     * Center a given Element on the Window viewport
     * @param element
     */
    async scrollToCenterOfWindow(element: WebElementWrapper) {
      const [elementPosition, windowSize] = await Promise.all([
        element.getPosition(),
        browser.getWindowSize(),
      ]);
      await browser.execute(
        `document.scrollingElement.scrollTop = ${elementPosition.y - windowSize.height / 2}`
      );
    },

    /**
     * Will click on the given Endpoint Action (from the Actions dropdown)
     * @param action
     */
    async selectEndpointAction(action: 'policy' | 'trustedApps') {
      await (await this.findEndpointActionsButton()).click();
      const testSubjId = action === 'policy' ? 'securityPolicy' : 'trustedAppsAction';
      await (await testSubjects.find(testSubjId)).click();
    },
  };
}
