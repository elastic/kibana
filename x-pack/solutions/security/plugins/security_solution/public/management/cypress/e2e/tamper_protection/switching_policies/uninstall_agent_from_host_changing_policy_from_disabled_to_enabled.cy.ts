/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointListPageToBeLoaded } from '../../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  getEndpointIntegrationVersion,
  createAgentPolicyTask,
  enableAgentTamperProtectionFeatureFlagInPolicy,
  getUninstallToken,
  reAssignFleetAgentToPolicy,
  isAgentAndEndpointUninstalledFromHost,
  uninstallAgentFromHost,
} from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { enableAllPolicyProtections } from '../../../tasks/endpoint_policy';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

describe(
  'Uninstall agent from host changing agent policy when agent tamper protection is disabled but then is switched to a policy with it enabled',
  { tags: ['@ess'] },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    let policy: PolicyData;
    let indexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
    let policyWithAgentTamperProtectionEnabled: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
          policy = indexedPolicy.integrationPolicies[0];
          return enableAllPolicyProtections(policy.id);
        });
        createAgentPolicyTask(version).then((dataForProtectedPolicy) => {
          indexedPolicyWithAgentTamperEnabled = dataForProtectedPolicy;
          policyWithAgentTamperProtectionEnabled =
            indexedPolicyWithAgentTamperEnabled.integrationPolicies[0];

          return enableAgentTamperProtectionFeatureFlagInPolicy(
            indexedPolicyWithAgentTamperEnabled.agentPolicies[0].id
          );
        });
      });
    });

    beforeEach(() => {
      login();
      // Create and enroll a new Endpoint host
      return createEndpointHost(policy.policy_ids[0]).then((host) => {
        createdHost = host as CreateAndEnrollEndpointHostResponse;
      });
    });

    after(() => {
      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicyWithAgentTamperEnabled);
      }
    });

    afterEach(() => {
      if (createdHost) {
        cy.task('destroyEndpointHost', createdHost);
      }

      if (createdHost) {
        deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
      }
    });

    it('should uninstall from host without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);

      // Change agent policy and wait for action to be completed
      reAssignFleetAgentToPolicy(
        createdHost.agentId,
        policyWithAgentTamperProtectionEnabled.policy_ids[0]
      ).then((hasChanged) => {
        expect(hasChanged).to.eql(true);

        // Try to uninstall agent from host without the uninstall token
        uninstallAgentFromHost(createdHost.hostname).then((responseWithoutToken) => {
          expect(responseWithoutToken).to.match(/(.*)Invalid uninstall token(.*)/);
          expect(responseWithoutToken).to.not.match(/(.*)Elastic Agent has been uninstalled(.*)/);
          isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
            (isUninstalledWithoutToken) => {
              expect(isUninstalledWithoutToken).to.eql(false);

              // Get the uninstall token from that agent policy
              getUninstallToken(policyWithAgentTamperProtectionEnabled.policy_ids[0]).then(
                (uninstallToken) => {
                  // Try to uninstall agent from host using the retrieved uninstall token
                  uninstallAgentFromHost(createdHost.hostname, uninstallToken.body.item.token).then(
                    (responseWithToken) => {
                      expect(responseWithToken).to.not.match(/(.*)Invalid uninstall token(.*)/);
                      expect(responseWithToken).to.match(
                        /(.*)Elastic Agent has been uninstalled(.*)/
                      );

                      isAgentAndEndpointUninstalledFromHost(createdHost.hostname).then(
                        (isUninstalledWithToken) => {
                          expect(isUninstalledWithToken).to.eql(true);
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        });
      });
    });
  }
);
