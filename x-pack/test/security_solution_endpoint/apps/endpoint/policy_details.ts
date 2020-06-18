/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../services/endpoint_policy';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'endpoint', 'policy', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');
  const policyTestResources = getService('policyTestResources');

  describe('When on the Endpoint Policy Details Page', function () {
    this.tags(['ciGroup7']);

    describe('with an invalid policy id', () => {
      it('should display an error', async () => {
        await pageObjects.policy.navigateToPolicyDetails('invalid-id');
        await testSubjects.existOrFail('policyDetailsIdNotFoundMessage');
        expect(await testSubjects.getVisibleText('policyDetailsIdNotFoundMessage')).to.equal(
          'Saved object [ingest-datasources/invalid-id] not found'
        );
      });
    });

    describe('with a valid policy id', () => {
      let policyInfo: PolicyTestResourceInfo;

      before(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.datasource.id);
      });

      after(async () => {
        if (policyInfo) {
          await policyInfo.cleanup();
        }
      });

      it('should display policy view', async () => {
        expect(await testSubjects.getVisibleText('pageViewHeaderLeftTitle')).to.equal(
          policyInfo.datasource.name
        );
      });
    });

    describe('and the save button is clicked', () => {
      let policyInfo: PolicyTestResourceInfo;

      beforeEach(async () => {
        policyInfo = await policyTestResources.createPolicy();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.datasource.id);
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
          `Policy ${policyInfo.datasource.name} has been updated.`
        );
      });
      it('should persist update on the screen', async () => {
        await pageObjects.endpointPageUtils.clickOnEuiCheckbox('policyWindowsEvent_process');
        await pageObjects.policy.confirmAndSave();

        await testSubjects.existOrFail('policyDetailsSuccessMessage');
        await pageObjects.policy.navigateToPolicyList();
        await pageObjects.policy.navigateToPolicyDetails(policyInfo.datasource.id);

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
              id: policyInfo.datasource.id,
              dataset: { namespace: 'default' },
              name: 'Protect East Coast',
              package: {
                name: 'endpoint',
                version: policyInfo.packageInfo.version,
              },
              policy: {
                linux: {
                  advanced: {
                    elasticsearch: {
                      indices: {
                        control: 'control-index',
                        event: 'event-index',
                        logging: 'logging-index',
                      },
                      kernel: { connect: true, process: true },
                    },
                  },
                  events: { file: false, network: true, process: true },
                  logging: { file: 'info', stdout: 'debug' },
                },
                mac: {
                  advanced: {
                    elasticsearch: {
                      indices: {
                        control: 'control-index',
                        event: 'event-index',
                        logging: 'logging-index',
                      },
                      kernel: { connect: true, process: true },
                    },
                  },
                  events: { file: false, network: true, process: true },
                  logging: { file: 'info', stdout: 'debug' },
                  malware: { mode: 'detect' },
                },
                windows: {
                  advanced: {
                    elasticsearch: {
                      indices: {
                        control: 'control-index',
                        event: 'event-index',
                        logging: 'logging-index',
                      },
                      kernel: { connect: true, process: true },
                    },
                  },
                  events: {
                    dll_and_driver_load: true,
                    dns: true,
                    file: false,
                    network: true,
                    process: true,
                    registry: true,
                    security: true,
                  },
                  logging: { file: 'info', stdout: 'debug' },
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
  });
}
