/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export async function FleetPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  return {
    async clickAgentsTab() {
      await testSubjects.find('fleet-agents-tab');
      await retry.waitFor('add a fleet server header to be visible', async () => {
        return await testSubjects.isDisplayed('getStartedFleetServerHeading');
      });
    },
    async clickAdvanceOption() {
      await testSubjects.click('fleetServerFlyoutTab-advanced');
      await retry.waitFor('create a policy header', async () => {
        return await testSubjects.isDisplayed('addFleetServerHeader');
      });
    },
    async clickQuickStartOption() {
      await testSubjects.click('fleetServerFlyoutTab-quickStart');
      await retry.waitFor('get started with fleet server', async () => {
        return await testSubjects.isDisplayed('getStartedFleetServerHeading');
      });
    },
    async createNewFleetServer(fleetHost: string) {
      await comboBox.setCustom('comboBoxInput', fleetHost);
      await testSubjects.click('generateFleetServerPolicyButton');
      await retry.waitFor('linux platform button', async () => {
        return await testSubjects.isDisplayed('platformTypeLinux');
      });
    },
    async addFleetServerInAdvanced() {
      await testSubjects.click('fleetServerAddHostBtn');
      await retry.waitFor('added fleet server host callout', async () => {
        return await testSubjects.isDisplayed('addedFleetServerConfirmationCallout');
      });
    },
    async addGeneratedServiceToken() {
      await testSubjects.click('fleetServerGenerateServiceTokenBtn');
      await retry.waitFor('for platform button to show up', async () => {
        return await testSubjects.isDisplayed('platformTypeLinux');
      });
    },
    async clickAgentPoliciesTab() {
      await testSubjects.click('fleet-agent-policies-tab');
      await retry.waitFor('kql bar to be visible', async () => {
        return await testSubjects.isDisplayed('queryInput');
      });
    },
    async clickFleetServerPolicyInTable() {
      await testSubjects.click('agentPolicyNameLink');
    },
    async clickEnrollmentTokensTab() {
      await testSubjects.click('fleet-enrollment-tokens-tab');
      await retry.waitFor('kql bar to be visible', async () => {
        return await testSubjects.isDisplayed('queryInput');
      });
    },
  };
}
