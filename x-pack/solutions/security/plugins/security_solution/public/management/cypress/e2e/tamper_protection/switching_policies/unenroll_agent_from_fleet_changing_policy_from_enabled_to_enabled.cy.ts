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
  unenrollAgent,
  reAssignFleetAgentToPolicy,
} from '../../../tasks/fleet';

import { login } from '../../../tasks/login';
import { createEndpointHost } from '../../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../../tasks/delete_all_endpoint_data';

describe(
  'Unenroll agent from fleet changing agent policy when agent tamper protection is enabled but then is switched to a policy with it also enabled',
  { tags: ['@ess'] },
  () => {
    let indexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
    let policyWithAgentTamperProtectionEnabled: PolicyData;
    let secondIndexedPolicyWithAgentTamperEnabled: IndexedFleetEndpointPolicyResponse;
    let secondPolicyWithAgentTamperProtectionEnabled: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((dataForProtectedPolicy) => {
          indexedPolicyWithAgentTamperEnabled = dataForProtectedPolicy;
          policyWithAgentTamperProtectionEnabled =
            indexedPolicyWithAgentTamperEnabled.integrationPolicies[0];

          return enableAgentTamperProtectionFeatureFlagInPolicy(
            indexedPolicyWithAgentTamperEnabled.agentPolicies[0].id
          );
        });
        createAgentPolicyTask(version).then((dataForProtectedPolicy) => {
          secondIndexedPolicyWithAgentTamperEnabled = dataForProtectedPolicy;
          secondPolicyWithAgentTamperProtectionEnabled =
            secondIndexedPolicyWithAgentTamperEnabled.integrationPolicies[0];

          return enableAgentTamperProtectionFeatureFlagInPolicy(
            secondIndexedPolicyWithAgentTamperEnabled.agentPolicies[0].id
          );
        });
      });
    });
    beforeEach(() => {
      login();
      // Create and enroll a new Endpoint host
      return createEndpointHost(policyWithAgentTamperProtectionEnabled.policy_ids[0]).then(
        (host) => {
          createdHost = host as CreateAndEnrollEndpointHostResponse;
        }
      );
    });

    after(() => {
      if (indexedPolicyWithAgentTamperEnabled) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicyWithAgentTamperEnabled);
        cy.task('deleteIndexedFleetEndpointPolicies', secondIndexedPolicyWithAgentTamperEnabled);
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

    it('should unenroll from fleet without issues', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      // Change agent policy and wait for action to be completed
      reAssignFleetAgentToPolicy(
        createdHost.agentId,
        secondPolicyWithAgentTamperProtectionEnabled.policy_ids[0]
      ).then((hasChanged) => {
        expect(hasChanged).to.eql(true);
        unenrollAgent(createdHost.agentId).then((isUnenrolled) => {
          expect(isUnenrolled).to.eql(true);
        });
      });
    });
  }
);
