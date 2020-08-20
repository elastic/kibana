/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'common',
    'endpoint',
    'policy',
    'endpointPageUtils',
    'ingestManagerCreatePackagePolicy',
  ]);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');

  describe('When on the Endpoint Policy Details Page', function () {
    this.tags(['ciGroup7']);

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
        await pageObjects.policy.confirmAndSave();
        await testSubjects.existOrFail('policyDetailsSuccessMessage');

        const agentFullPolicy = await policyTestResources.getFullAgentPolicy(
          policyInfo.agentPolicy.id
        );

        expect(agentFullPolicy).to.eql({
          inputs: [
            {
              id: policyInfo.packagePolicy.id,
              data_stream: { namespace: 'default' },
              name: 'Protect East Coast',
              meta: {
                package: {
                  name: 'endpoint',
                  version: policyInfo.packageInfo.version,
                },
              },
              artifact_manifest: {
                artifacts: {
                  'endpoint-exceptionlist-macos-v1': {
                    compression_algorithm: 'zlib',
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    decoded_size: 14,
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                    encryption_algorithm: 'none',
                    relative_url:
                      '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                  },
                  'endpoint-exceptionlist-windows-v1': {
                    compression_algorithm: 'zlib',
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    decoded_size: 14,
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                    encryption_algorithm: 'none',
                    relative_url:
                      '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                  },
                },
                // The manifest version could have changed when the Policy was updated because the
                // policy details page ensures that a save action applies the udpated policy on top
                // of the latest Package Policy. So we just ignore the check against this value by
                // forcing it to be the same as the value returned in the full agent policy.
                manifest_version: agentFullPolicy.inputs[0].artifact_manifest.manifest_version,
                schema_version: 'v1',
              },
              policy: {
                linux: {
                  events: { file: false, network: true, process: true },
                  logging: { file: 'info' },
                },
                mac: {
                  events: { file: false, network: true, process: true },
                  logging: { file: 'info' },
                  malware: { mode: 'prevent' },
                },
                windows: {
                  events: {
                    dll_and_driver_load: true,
                    dns: true,
                    file: false,
                    network: true,
                    process: true,
                    registry: true,
                    security: true,
                  },
                  logging: { file: 'info' },
                  malware: { mode: 'prevent' },
                },
              },
              streams: [],
              type: 'endpoint',
              use_output: 'default',
            },
          ],
          id: policyInfo.agentPolicy.id,
          outputs: {
            default: {
              hosts: ['http://localhost:9200'],
              type: 'elasticsearch',
            },
          },
          revision: 3,
          agent: {
            monitoring: {
              enabled: false,
              logs: false,
              metrics: false,
            },
          },
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
      it('should show a link to Policy Details', async () => {
        await testSubjects.existOrFail('editLinkToPolicyDetails');
      });
      it('should navigate to Policy Details when the link is clicked', async () => {
        const linkToPolicy = await testSubjects.find('editLinkToPolicyDetails');
        await linkToPolicy.click();
        await pageObjects.policy.ensureIsOnDetailsPage();
      });
      it('should allow the user to navigate, edit, save Policy Details and be redirected back to ingest', async () => {
        await (await testSubjects.find('editLinkToPolicyDetails')).click();
        await pageObjects.policy.ensureIsOnDetailsPage();
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_dns');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        await pageObjects.ingestManagerCreatePackagePolicy.ensureOnEditPageOrFail();
      });
      it('should navigate back to Ingest Policy Edit package page on click of cancel button', async () => {
        await (await testSubjects.find('editLinkToPolicyDetails')).click();
        await (await pageObjects.policy.findCancelButton()).click();
        await pageObjects.ingestManagerCreatePackagePolicy.ensureOnEditPageOrFail();
      });
    });
  });
}
