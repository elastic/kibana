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
    'ingestManagerCreatePackageConfig',
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
          'Saved object [ingest-package-configs/invalid-id] not found'
        );
      });
    });

    describe('with a valid policy id', () => {
      let policyInfo: PolicyTestResourceInfo;

      before(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packageConfig.id);
      });

      after(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should display policy view', async () => {
        expect(await testSubjects.getVisibleText('pageViewHeaderLeftTitle')).to.equal(
          policyInfo.packageConfig.name
        );
      });
    });

    describe('and the save button is clicked', () => {
      let policyInfo: PolicyTestResourceInfo;

      beforeEach(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packageConfig.id);
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
          `Policy ${policyInfo.packageConfig.name} has been updated.`
        );
      });
      it('should persist update on the screen', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_process');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        await pageObjects.policy.navigateToPolicyList();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.packageConfig.id);

        expect(await (await testSubjects.find('policyWindowsEvent_process')).isSelected()).to.equal(
          false
        );
      });
      it('should have updated policy data in overall agent configuration', async () => {
        // This test ensures that updates made to the Endpoint Policy are carried all the way through
        // to the generated Agent Configuration that is dispatch down to the Elastic Agent.

        await Promise.all([
          pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_file'),
          pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyLinuxEvent_file'),
          pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyMacEvent_file'),
        ]);
        await pageObjects.policy.confirmAndSave();
        await testSubjects.existOrFail('policyDetailsSuccessMessage');

        const agentFullConfig = await policyTestResources.getFullAgentConfig(
          policyInfo.agentConfig.id
        );

        expect(agentFullConfig).to.eql({
          inputs: [
            {
              id: policyInfo.packageConfig.id,
              dataset: { namespace: 'default' },
              name: 'Protect East Coast',
              meta: {
                package: {
                  name: 'endpoint',
                  version: policyInfo.packageInfo.version,
                },
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
          id: policyInfo.agentConfig.id,
          outputs: {
            default: {
              hosts: ['http://localhost:9200'],
              type: 'elasticsearch',
            },
          },
          revision: 3,
          settings: {
            monitoring: {
              enabled: false,
              logs: false,
              metrics: false,
            },
          },
        });
      });
    });
    describe('when on Ingest Configurations Edit Package Config page', async () => {
      let policyInfo: PolicyTestResourceInfo;
      beforeEach(async () => {
        // Create a policy and navigate to Ingest app
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.ingestManagerCreatePackageConfig.navigateToAgentConfigEditPackageConfig(
          policyInfo.agentConfig.id,
          policyInfo.packageConfig.id
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
        await pageObjects.ingestManagerCreatePackageConfig.ensureOnEditPageOrFail();
      });
      it('should navigate back to Ingest Configuration Edit package page on click of cancel button', async () => {
        await (await testSubjects.find('editLinkToPolicyDetails')).click();
        await (await pageObjects.policy.findCancelButton()).click();
        await pageObjects.ingestManagerCreatePackageConfig.ensureOnEditPageOrFail();
      });
    });
  });
}
