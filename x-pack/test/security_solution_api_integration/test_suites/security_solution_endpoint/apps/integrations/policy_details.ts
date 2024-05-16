/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION } from '@kbn/security-solution-plugin/public/management/pages/policy/view/policy_settings_form/protection_notice_supported_endpoint_version';
import { getPolicySettingsFormTestSubjects } from '@kbn/security-solution-plugin/public/management/pages/policy/view/policy_settings_form/mocks';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';
import { targetTags } from '../../target_tags';

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
  const retry = getService('retry');

  describe('When on the Endpoint Policy Details Page', function () {
    targetTags(this, ['@ess', '@serverless']);

    let indexedData: IndexedHostsAndAlertsResponse;
    const formTestSubjects = getPolicySettingsFormTestSubjects();

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
        this.timeout(150_000);
        await retry.waitForWithTimeout('policy title is not empty', 120_000, async () => {
          return (await testSubjects.getVisibleText('header-page-title')) !== '';
        });
        expect(await testSubjects.getVisibleText('header-page-title')).to.equal(
          policyInfo.packagePolicy.name
        );
      });

      describe('side navigation', function () {
        targetTags(this, ['@skipInServerless']);

        it('should not hide the side navigation', async function () {
          await testSubjects.scrollIntoView('solutionSideNavItemLink-get_started');
          // ensure center of button is visible and not hidden by sticky bottom bar
          await testSubjects.click('solutionSideNavItemLink-administration', 1000, 15);
          // test cleanup: go back to policy details page
          await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);
        });
      });

      it('Should show/hide advanced section when button is clicked', async () => {
        await testSubjects.missingOrFail(formTestSubjects.advancedSection.settingsContainer);

        // Expand
        await pageObjects.policy.showAdvancedSettingsSection();
        await testSubjects.existOrFail(formTestSubjects.advancedSection.settingsContainer);

        // Collapse
        await pageObjects.policy.hideAdvancedSettingsSection();
        await testSubjects.missingOrFail(formTestSubjects.advancedSection.settingsContainer);
      });
    });

    ['malware', 'ransomware'].forEach((protection) => {
      describe(`on the ${protection} protections card`, () => {
        let policyInfo: PolicyTestResourceInfo;
        const cardTestSubj:
          | typeof formTestSubjects['ransomware']
          | typeof formTestSubjects['malware'] =
          formTestSubjects[
            protection as keyof Pick<typeof formTestSubjects, 'malware' | 'ransomware'>
          ];

        beforeEach(async () => {
          policyInfo = await policyTestResources.createPolicy();
          await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);
        });

        afterEach(async () => {
          if (policyInfo) {
            await policyInfo.cleanup();

            // @ts-expect-error forcing to undefined
            policyInfo = undefined;
          }
        });

        it('should show the supported Endpoint version for user notification', async () => {
          expect(await testSubjects.getVisibleText(cardTestSubj.notifySupportedVersion)).to.equal(
            'Agent version ' +
              PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION[
                protection as keyof typeof PROTECTION_NOTICE_SUPPORTED_ENDPOINT_VERSION
              ]
          );
        });

        it('should show the custom message text area when the Notify User checkbox is checked', async () => {
          expect(await testSubjects.isChecked(cardTestSubj.notifyUserCheckbox)).to.be(true);
          await testSubjects.existOrFail(cardTestSubj.notifyCustomMessage);
        });

        it('should not show the custom message text area when the Notify User checkbox is unchecked', async () => {
          await pageObjects.endpointPageUtils.clickOnEuiCheckbox(cardTestSubj.notifyUserCheckbox);
          expect(await testSubjects.isChecked(cardTestSubj.notifyUserCheckbox)).to.be(false);
          await testSubjects.missingOrFail(cardTestSubj.notifyCustomMessage);
        });

        it('should show a sample custom message', async () => {
          expect(await testSubjects.getVisibleText(cardTestSubj.notifyCustomMessage)).equal(
            'Elastic Security {action} {filename}'
          );
        });

        it('should show a tooltip on hover', async () => {
          await testSubjects.moveMouseTo(cardTestSubj.notifyCustomMessageTooltipIcon);

          await retry.waitFor(
            'should show a tooltip on hover',
            async () =>
              (await testSubjects.getVisibleText(cardTestSubj.notifyCustomMessageTooltipInfo)) ===
              `Selecting the user notification option will display a notification to the host user when ${protection} is prevented or detected.\nThe user notification can be customized in the text box below. Bracketed tags can be used to dynamically populate the applicable action (such as prevented or detected) and the filename.`
          );
        });

        it('should preserve a custom notification message upon saving', async () => {
          await testSubjects.setValue(cardTestSubj.notifyCustomMessage, '', {
            clearWithKeyboard: true,
          });
          await testSubjects.setValue(
            cardTestSubj.notifyCustomMessage,
            'a custom notification message @$% 123',
            { typeCharByChar: true }
          );

          await pageObjects.policy.confirmAndSave();
          await testSubjects.existOrFail('policyDetailsSuccessMessage');
          expect(await testSubjects.getVisibleText(cardTestSubj.notifyCustomMessage)).to.equal(
            'a custom notification message @$% 123'
          );
        });
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

          // @ts-expect-error forcing to undefined
          policyInfo = undefined;
        }
      });

      it('should display success toast on successful save', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox(
          formTestSubjects.windowsEvents.dnsCheckbox
        );
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        expect(await testSubjects.getVisibleText('policyDetailsSuccessMessage')).to.equal(
          `Success!\nIntegration ${policyInfo.packagePolicy.name} has been updated.`
        );
      });

      it('should persist update on the screen', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox(
          formTestSubjects.windowsEvents.processCheckbox
        );
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        await testSubjects.existOrFail('toastCloseButton');
        await pageObjects.endpoint.navigateToEndpointList();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packagePolicy.id);

        expect(
          await (
            await testSubjects.find(formTestSubjects.windowsEvents.processCheckbox)
          ).isSelected()
        ).to.equal(false);
      });

      it('should have updated policy data in overall Agent Policy', async () => {
        // This test ensures that updates made to the Endpoint Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.

        await Promise.all([
          pageObjects.endpointPageUtils.clickOnEuiCheckbox(
            formTestSubjects.windowsEvents.fileCheckbox
          ),
          pageObjects.endpointPageUtils.clickOnEuiCheckbox(
            formTestSubjects.linuxEvents.fileCheckbox
          ),
          pageObjects.endpointPageUtils.clickOnEuiCheckbox(formTestSubjects.macEvents.fileCheckbox),
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
      });

      afterEach(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should show the endpoint policy form', async () => {
        await testSubjects.existOrFail(formTestSubjects.form);
      });

      it('should allow updates to policy items', async () => {
        const winDnsEventingCheckbox = await testSubjects.find(
          formTestSubjects.windowsEvents.dnsCheckbox
        );
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(
          winDnsEventingCheckbox
        );
        expect(await winDnsEventingCheckbox.isSelected()).to.be(true);
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox(
          formTestSubjects.windowsEvents.dnsCheckbox
        );
        await pageObjects.policy.waitForCheckboxSelectionChange(
          formTestSubjects.windowsEvents.dnsCheckbox,
          false
        );
      });

      it('should include updated endpoint data when saved', async () => {
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(
          await testSubjects.find(formTestSubjects.windowsEvents.dnsCheckbox)
        );
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox(
          formTestSubjects.windowsEvents.dnsCheckbox
        );
        const updatedCheckboxValue = await testSubjects.isSelected(
          formTestSubjects.windowsEvents.dnsCheckbox
        );

        await pageObjects.policy.waitForCheckboxSelectionChange(
          formTestSubjects.windowsEvents.dnsCheckbox,
          false
        );

        await (await pageObjects.ingestManagerCreatePackagePolicy.findSaveButton(true)).click();
        await pageObjects.ingestManagerCreatePackagePolicy.waitForSaveSuccessNotification(true);

        await pageObjects.ingestManagerCreatePackagePolicy.navigateToAgentPolicyEditPackagePolicy(
          policyInfo.agentPolicy.id,
          policyInfo.packagePolicy.id
        );

        await pageObjects.policy.waitForCheckboxSelectionChange(
          formTestSubjects.windowsEvents.dnsCheckbox,
          updatedCheckboxValue
        );
      });

      ['trustedApps', 'eventFilters', 'blocklists', 'hostIsolationExceptions'].forEach(
        (cardName) => {
          it(`should show ${cardName} card and link should go back to policy`, async () => {
            await testSubjects.existOrFail(`${cardName}-fleet-integration-card`);

            const card = await testSubjects.find(`${cardName}-fleet-integration-card`);
            await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(card);
            await (await testSubjects.find(`${cardName}-link-to-exceptions`)).click();

            await testSubjects.existOrFail('policyDetailsPage');

            await (await testSubjects.find('policyDetailsBackLink')).click();
            await testSubjects.existOrFail('endpointIntegrationPolicyForm');
          });
        }
      );
    });
  });
}
