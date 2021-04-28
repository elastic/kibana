/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SyntheticsIntegrationPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  return {
    /**
     * Navigates to the Synthetics Integration page
     *
     */
    async navigateToPackagePage() {
      await pageObjects.common.navigateToUrl(
        'synthetics_integration',
        '/integrations/synthetics-0.0.3/add-integration?_t=1619201168120',
        {
          shouldUseHashForSubUrl: true,
          useActualUrl: true,
        }
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
     * Finds and returns the Policy Details Page Save button
     */
    async findSaveButton() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('createPackagePolicySaveButton');
    },

    /**
     * Finds and returns the Policy Details Page Cancel Button
     */
    async findCancelButton() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('policyDetailsCancelButton');
    },

    /**
     * Finds and returns the HTTP advanced options accordion trigger
     */
    async findHTTPAdvancedOptionsAccordion() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('httpAdvancedOptionsSectionAccordion');
    },

    /**
     * Finds the policy name field
     */
    async findPolicyNameField() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('packagePolicyNameInput');
    },

    /**
     * Finds the policy name field
     */
    async findPolicyUrlField() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('syntheticsUrlField');
    },

    /**
     * Finds the policy tcp host field
     */
    async findPolicyTCPHostField() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('syntheticsTCPHostField');
    },

    /**
     * Finds the policy icmp host field
     */
    async findPolicyICMPHostField() {
      await this.ensureIsOnPackagePage();
      return await testSubjects.find('syntheticsICMPHostField');
    },

    /**
     * ensures that the package page is the currently display view
     */
    async ensureIsOnPackagePage() {
      await testSubjects.existOrFail('monitorSettingsSection');
    },

    /**
     * Clicks Save button and confirms update on the Policy Details page
     */
    async confirmAndSave() {
      await this.ensureIsOnPackagePage();
      await testSubjects.clickWhenNotDisabled('createPackagePolicySaveButton');
    },

    /**
     * Fills in the fields to create a basic HTTP monitor
     * @params name {string} the name of the monitor
     * @params url {string} the url of the monitor
     *
     */
    async createMonitorName(name: string) {
      const policyNameField = await this.findPolicyNameField();
      await policyNameField.clearValue();
      await policyNameField.click();
      await policyNameField.type(name);
    },

    /**
     * Fills in the fields to create a basic HTTP monitor
     * @params name {string} the name of the monitor
     * @params url {string} the url of the monitor
     *
     */
    async createBasicHTTPMonitorDetails(name: string, url: string) {
      await this.createMonitorName(name);
      const policyUrlField = await this.findPolicyUrlField();
      await policyUrlField.clearValue();
      await policyUrlField.click();
      await policyUrlField.type(url);
    },

    /**
     * Fills in the fields to create a basic TCP monitor
     * @params name {string} the name of the monitor
     * @params host {string} the host (and port) of the monitor
     *
     */
    async createBasicTCPMonitorDetails(name: string, host: string) {
      await testSubjects.selectValue('syntheticsMontiorTypeField', 'TCP');
      await this.createMonitorName(name);

      const policyTCPHostField = await this.findPolicyTCPHostField();
      await policyTCPHostField.clearValue();
      await policyTCPHostField.click();
      await policyTCPHostField.type(host);
    },

    /**
     * Creates a basic ICMP monitor
     */
    async createBasicICMPMonitorDetails(name: string, host: string) {
      await this.createMonitorName(name);
      const policyTCPHostField = await this.findPolicyTCPHostField();
      await policyTCPHostField.clearValue();
      await policyTCPHostField.click();
      await policyTCPHostField.type(host);
    },

    /**
     * Used when looking a the Ingest create/edit package policy pages. Finds the endpoint
     * custom configuaration component
     * @param onEditPage
     */
    async findPackagePolicyEndpointCustomConfiguration(onEditPage: boolean = false) {
      return await testSubjects.find(`endpointPackagePolicy_${onEditPage ? 'edit' : 'create'}`);
    },
  };
}
