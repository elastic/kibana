/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';
import { IndexedHostsAndAlertsResponse } from '../../../../plugins/security_solution/common/endpoint/index_data';
import { FullAgentPolicyInput } from '../../../../plugins/fleet/common';
import { PolicyConfig } from '../../../../plugins/security_solution/common/endpoint/types';
import { ManifestSchema } from '../../../../plugins/security_solution/common/endpoint/schema/manifest';
import { policyFactory } from '../../../../plugins/security_solution/common/endpoint/models/policy_config';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const retryService = getService('retry');
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

  type FullAgentPolicyEndpointInput = Omit<FullAgentPolicyInput, 'streams'> & {
    policy: PolicyConfig;
    artifact_manifest: ManifestSchema;
  };

  /**
   * Returns the Fleet Agent Policy Input that represents an Endpoint Policy. Use it to
   * validate expecte output when looking at the Fleet Agent policy to validate that updates
   * to the Endpoint Policy are making it through to the overall Fleet Agent Policy
   *
   * @param overrides
   */
  const getExpectedAgentPolicyEndpointInput = (
    overrides: DeepPartial<FullAgentPolicyEndpointInput> = {}
  ): FullAgentPolicyInput => {
    return merge(
      {
        id: '123',
        revision: 2,
        data_stream: { namespace: 'default' },
        name: 'Protect East Coast',
        meta: {
          package: {
            name: 'endpoint',
            version: '1.0',
          },
        },
        artifact_manifest: {
          artifacts: {
            'endpoint-exceptionlist-linux-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-exceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-exceptionlist-macos-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-exceptionlist-windows-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-hostisolationexceptionlist-linux-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-hostisolationexceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-hostisolationexceptionlist-macos-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-hostisolationexceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-hostisolationexceptionlist-windows-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-hostisolationexceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-trustlist-linux-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-trustlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-trustlist-macos-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-trustlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-trustlist-windows-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-trustlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-eventfilterlist-linux-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-eventfilterlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-eventfilterlist-macos-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-eventfilterlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-eventfilterlist-windows-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
          },
          manifest_version: '1',
          schema_version: 'v1',
        },
        policy: merge(policyFactory(), {
          windows: {
            popup: {
              malware: {
                message: 'Elastic Security {action} {filename}',
              },
              ransomware: {
                message: 'Elastic Security {action} {filename}',
              },
              memory_protection: {
                message: 'Elastic Security {action} {rule}',
              },
              behavior_protection: {
                message: 'Elastic Security {action} {rule}',
              },
            },
          },
          mac: {
            popup: {
              malware: {
                message: 'Elastic Security {action} {filename}',
              },
              behavior_protection: {
                message: 'Elastic Security {action} {rule}',
              },
              memory_protection: {
                message: 'Elastic Security {action} {rule}',
              },
            },
          },
          linux: {
            popup: {
              malware: {
                message: 'Elastic Security {action} {filename}',
              },
              behavior_protection: {
                message: 'Elastic Security {action} {rule}',
              },
              memory_protection: {
                message: 'Elastic Security {action} {rule}',
              },
            },
          },
        }),
        type: 'endpoint',
        use_output: 'default',
      },
      overrides
    );
  };

  // Failing: See https://github.com/elastic/kibana/issues/100236
  describe.skip('When on the Endpoint Policy Details Page', function () {
    let indexedData: IndexedHostsAndAlertsResponse;

    before(async () => {
      const endpointPackage = await policyTestResources.getEndpointPackage();
      await endpointTestResources.setMetadataTransformFrequency('1s', endpointPackage.version);
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

    // FLAKY: https://github.com/elastic/kibana/issues/92567
    describe.skip('and the save button is clicked', () => {
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
        await pageObjects.common.closeToast();
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

        const agentFullPolicy = await policyTestResources.getFullAgentPolicy(
          policyInfo.agentPolicy.id
        );

        expect(agentFullPolicy.inputs).to.eql([
          getExpectedAgentPolicyEndpointInput({
            id: policyInfo.packagePolicy.id,
            name: policyInfo.packagePolicy.name,
            meta: {
              package: {
                version: policyInfo.packageInfo.version,
              },
            },
            artifact_manifest: {
              manifest_version: agentFullPolicy.inputs[0].artifact_manifest.manifest_version,
            },
            policy: {
              linux: {
                events: {
                  file: false,
                },
                advanced: {
                  agent: {
                    connection_delay: 'true',
                  },
                },
              },
              mac: {
                events: { file: false },
              },
              windows: { events: { file: false } },
            },
          }),
        ]);
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

        expect(agentFullPolicy.inputs).to.eql([
          getExpectedAgentPolicyEndpointInput({
            id: policyInfo.packagePolicy.id,
            name: policyInfo.packagePolicy.name,
            meta: {
              package: {
                version: policyInfo.packageInfo.version,
              },
            },
            artifact_manifest: {
              manifest_version: agentFullPolicy.inputs[0].artifact_manifest.manifest_version,
            },
            policy: {
              linux: {
                advanced: {
                  agent: {
                    connection_delay: 'true',
                  },
                },
              },
            },
          }),
        ]);

        // Clear the value
        await advancedPolicyField.click();
        await advancedPolicyField.clearValueWithKeyboard();

        // Make sure the toast button closes so the save button on the sticky footer is visible
        await (await testSubjects.find('toastCloseButton')).click();
        await testSubjects.waitForHidden('toastCloseButton');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');

        const agentFullPolicyUpdated = await policyTestResources.getFullAgentPolicy(
          policyInfo.agentPolicy.id
        );

        expect(agentFullPolicyUpdated.inputs).to.eql([
          getExpectedAgentPolicyEndpointInput({
            id: policyInfo.packagePolicy.id,
            name: policyInfo.packagePolicy.name,
            revision: 3,
            meta: {
              package: {
                version: policyInfo.packageInfo.version,
              },
            },
            artifact_manifest: {
              manifest_version: agentFullPolicy.inputs[0].artifact_manifest.manifest_version,
            },
          }),
        ]);
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

      it('should preserve updates done from the Fleet form', async () => {
        // Fleet has its  own form inputs, like description. When those are updated, the changes
        // are also dispatched to the embedded endpoint Policy form. Update to the Endpoint Policy
        // form after that should preserve the changes done on the Fleet form
        // NOTE: A few delays were added below due to sporadic failures of this test case (see #100236)
        const sleep = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

        // Wait for the endpoint form to load and then update the policy description
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
        await sleep(); // Allow forms to sync
        await pageObjects.ingestManagerCreatePackagePolicy.setPackagePolicyDescription(
          'protect everything'
        );
        await sleep(); // Allow forms to sync

        const winDnsEventingCheckbox = await testSubjects.find('policyWindowsEvent_dns');
        await pageObjects.ingestManagerCreatePackagePolicy.scrollToCenterOfWindow(
          winDnsEventingCheckbox
        );
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_dns');

        await retryService.try(async () => {
          expect(
            await pageObjects.ingestManagerCreatePackagePolicy.getPackagePolicyDescriptionValue()
          ).to.be('protect everything');
        });
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

      it('should show trusted apps card and link should go back to policy', async () => {
        await testSubjects.existOrFail('fleetTrustedAppsCard');
        await (await testSubjects.find('linkToTrustedApps')).click();
        await testSubjects.existOrFail('policyDetailsPage');
        await (await testSubjects.find('policyDetailsBackLink')).click();
        await testSubjects.existOrFail('endpointIntegrationPolicyForm');
      });
    });
  });
}
