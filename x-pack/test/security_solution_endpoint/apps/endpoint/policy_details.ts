/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { popupVersionsMap } from '@kbn/security-solution-plugin/public/management/pages/policy/view/policy_forms/protections/popup_options_to_versions';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const pageObjects = getPageObjects([
    'common',
    'endpoint',
    'policy',
    'endpointPageUtils',
    'ingestManagerCreatePackagePolicy',
    'trustedApps',
  ]);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');
  const endpointTestResources = getService('endpointTestResources');

  describe('When on the Endpoint Policy Details Page', function () {
    let indexedData: IndexedHostsAndAlertsResponse;

    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData();
      await browser.refresh();
    });

    after(async () => {
      await endpointTestResources.unloadEndpointData(indexedData);
    });

    describe('with an invalid policy id', () => {
      it('should display an error', async () => {
        await pageObjects.policy.navigateToPolicyDetails('invalid-id');
        await testSubjects.existOrFail('policyDetailsIdNotFoundMessage');
        expect(await testSubjects.getVisibleText('policyDetailsIdNotFoundMessage')).to.equal(
          'Package policy invalid-id not found'
        );
      });
    });

    describe('with a valid policy id', () => {
      let policyInfo: PolicyTestResourceInfo;

      before(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);
      });

      after(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should display policy view', async () => {
        expect(await testSubjects.getVisibleText('header-page-title')).to.equal(
          policyInfo.packagePolicy.name
        );
      });

      it('and the show advanced settings button is clicked', async () => {
        await testSubjects.missingOrFail('advancedPolicyPanel');

        // Expand
        await pageObjects.policy.showAdvancedSettingsSection();
        await testSubjects.existOrFail('advancedPolicyPanel');

        // Collapse
        await pageObjects.policy.hideAdvancedSettingsSection();
        await testSubjects.missingOrFail('advancedPolicyPanel');
      });
    });

    describe('on the Malware protections section', () => {
      let policyInfo: PolicyTestResourceInfo;

      beforeEach(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);
        await testSubjects.existOrFail('malwareProtectionsForm');
      });

      afterEach(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should show the supported Endpoint version', async () => {
        expect(await testSubjects.getVisibleText('policySupportedVersions')).to.equal(
          'Agent version ' + popupVersionsMap.get('malware')
        );
      });

      it('should show the custom message text area when the Notify User checkbox is checked', async () => {
        expect(await testSubjects.isChecked('malwareUserNotificationCheckbox')).to.be(true);
        await testSubjects.existOrFail('malwareUserNotificationCustomMessage');
      });

      it('should not show the custom message text area when the Notify User checkbox is unchecked', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('malwareUserNotificationCheckbox');
        expect(await testSubjects.isChecked('malwareUserNotificationCheckbox')).to.be(false);
        await testSubjects.missingOrFail('malwareUserNotificationCustomMessage');
      });

      it('should preserve a custom notification message upon saving', async () => {
        const customMessage = await testSubjects.find('malwareUserNotificationCustomMessage');
        await customMessage.clearValue();
        await customMessage.type('a custom malware notification message');
        await pageObjects.policy.confirmAndSave();
        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        expect(await testSubjects.getVisibleText('malwareUserNotificationCustomMessage')).to.equal(
          'a custom malware notification message'
        );
      });
    });

    describe('and the save button is clicked', () => {
      let policyInfo: PolicyTestResourceInfo;

      beforeEach(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);
      });

      afterEach(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should display success toast on successful save', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_dns');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        expect(await testSubjects.getVisibleText('policyDetailsSuccessMessage')).to.equal(
          `Integration ${policyInfo.packagePolicy.name} has been updated.`
        );
      });

      it('should persist update on the screen', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_process');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        await testSubjects.waitForHidden('toastCloseButton');
        await pageObjects.endpoint.navigateToEndpointList();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);

        expect(await (await testSubjects.find('policyWindowsEvent_process')).isSelected()).to.equal(
          false
        );
      });

      it('should have updated policy data in overall Agent Policy', async () => {
        // This test ensures that updates made to the Endpoint Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.

        await Promise.all([
          pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_file'),
          pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyLinuxEvent_file'),
          pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyMacEvent_file'),
        ]);

        await pageObjects.policy.showAdvancedSettingsSection();

        const advancedPolicyField = await pageObjects.policy.findAdvancedPolicyField();
        await advancedPolicyField.clearValue();
        await advancedPolicyField.click();
        await advancedPolicyField.type('true');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        await testSubjects.waitForDeleted('toastCloseButton');

        const agentFullPolicy = await policyTestResources.getFullAgentPolicy(
          policyInfo.agentPolicy.id
        );

        expect(agentFullPolicy.inputs[0].id).to.eql(policyInfo.packagePolicy.id);
        expect(agentFullPolicy.inputs[0].policy.linux.advanced.agent.connection_delay).to.eql(
          'true'
        );
        expect(agentFullPolicy.inputs[0].policy.linux.events.file).to.eql(false);
        expect(agentFullPolicy.inputs[0].policy.mac.events.file).to.eql(false);
        expect(agentFullPolicy.inputs[0].policy.windows.events.file).to.eql(false);
      });

      it('should have cleared the advanced section when the user deletes the value', async () => {
        await pageObjects.policy.showAdvancedSettingsSection();

        const advancedPolicyField = await pageObjects.policy.findAdvancedPolicyField();
        await advancedPolicyField.clearValue();
        await advancedPolicyField.click();
        await advancedPolicyField.type('true');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');

        const agentFullPolicy = await policyTestResources.getFullAgentPolicy(
          policyInfo.agentPolicy.id
        );

        expect(agentFullPolicy.inputs[0].policy.linux.advanced.agent.connection_delay).to.eql(
          'true'
        );

        // Clear the value
        await advancedPolicyField.click();
        await advancedPolicyField.clearValueWithKeyboard();

        // Make sure the toast button closes so the save button on the sticky footer is visible
        await testSubjects.waitForDeleted('toastCloseButton');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');

        const agentFullPolicyUpdated = await policyTestResources.getFullAgentPolicy(
          policyInfo.agentPolicy.id
        );

        expect(agentFullPolicyUpdated.inputs[0].policy.linux.advanced).to.eql({
          capture_env_vars: 'LD_PRELOAD,LD_LIBRARY_PATH',
        });
      });
    });

    describe('when on Ingest Policy Edit Package Policy page', async () => {
      let policyInfo: PolicyTestResourceInfo;

      beforeEach(async () => {
        // Create a policy and navigate to Ingest app
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.ingestManagerCreatePackagePolicy.navigateToAgentPolicyEditPackagePolicy(
          policyInfo.agentPolicy.id,
          policyInfo.packagePolicy.id
        );
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
      });

      afterEach(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should show the endpoint policy form', async () => {
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
      });

      it('should allow updates to policy items', async () => {
        const winDnsEventingCheckbox = await testSubjects.find('policyWindowsEvent_dns');
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(
          winDnsEventingCheckbox
        );
        expect(await winDnsEventingCheckbox.isSelected()).to.be(true);
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_dns');
        await pageObjects.policy.waitForCheckboxSelectionChange('policyWindowsEvent_dns', false);
      });

      it('should include updated endpoint data when saved', async () => {
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(
          await testSubjects.find('policyWindowsEvent_dns')
        );
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_dns');
        const updatedCheckboxValue = await testSubjects.isSelected('policyWindowsEvent_dns');

        await pageObjects.policy.waitForCheckboxSelectionChange('policyWindowsEvent_dns', false);

        await (await pageObjects.ingestManagerCreatePackagePolicy.findSaveButton(true)).click();
        await pageObjects.ingestManagerCreatePackagePolicy.waitForSaveSuccessNotification(true);

        await pageObjects.ingestManagerCreatePackagePolicy.navigateToAgentPolicyEditPackagePolicy(
          policyInfo.agentPolicy.id,
          policyInfo.packagePolicy.id
        );

        await pageObjects.policy.waitForCheckboxSelectionChange(
          'policyWindowsEvent_dns',
          updatedCheckboxValue
        );
      });

      // Failing: See https://github.com/elastic/kibana/issues/138776
      it.skip('should show trusted apps card and link should go back to policy', async () => {
        await testSubjects.existOrFail('trustedApps-fleet-integration-card');
        await (await testSubjects.find('trustedApps-link-to-exceptions')).click();
        await (await testSubjects.find('confirmModalConfirmButton')).click(); // Fleet show a confirm modal on unsaved changes
        await testSubjects.existOrFail('policyDetailsPage');
        await (await testSubjects.find('policyDetailsBackLink')).click();
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
      });
      it.skip('should show event filters card and link should go back to policy', async () => {
        await testSubjects.existOrFail('eventFilters-fleet-integration-card');
        const eventFiltersCard = await testSubjects.find('eventFilters-fleet-integration-card');
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(eventFiltersCard);
        await (await testSubjects.find('eventFilters-link-to-exceptions')).click();
        await (await testSubjects.find('confirmModalConfirmButton')).click(); // Fleet show a confirm modal on unsaved changes
        await testSubjects.existOrFail('policyDetailsPage');
        await (await testSubjects.find('policyDetailsBackLink')).click();
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
      });
      it.skip('should show blocklists card and link should go back to policy', async () => {
        await testSubjects.existOrFail('blocklists-fleet-integration-card');
        const blocklistsCard = await testSubjects.find('blocklists-fleet-integration-card');
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(blocklistsCard);
        await (await testSubjects.find('blocklists-link-to-exceptions')).click();
        await (await testSubjects.find('confirmModalConfirmButton')).click(); // Fleet show a confirm modal on unsaved changes
        await testSubjects.existOrFail('policyDetailsPage');
        await (await testSubjects.find('policyDetailsBackLink')).click();
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
      });
      it.skip('should not show host isolation exceptions card because no entries', async () => {
        await testSubjects.missingOrFail('hostIsolationExceptions-fleet-integration-card');
      });
    });
  });
}
