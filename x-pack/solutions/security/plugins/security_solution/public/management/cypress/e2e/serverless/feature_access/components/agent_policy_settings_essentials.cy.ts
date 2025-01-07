/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../../../tasks/fleet';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../../../../common/endpoint/types';
import {
  checkForAgentTamperProtectionAvailability,
  navigateToFleetAgentPolicySettings,
} from '../../../../screens/fleet/agent_settings';

describe(
  'Agent Policy Settings - Essentials',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    describe('Agent Tamper Protection is unavailable with upselling component present', () => {
      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;

      beforeEach(() => {
        getEndpointIntegrationVersion().then((version) =>
          createAgentPolicyTask(version).then((data) => {
            indexedPolicy = data;
            policy = indexedPolicy.integrationPolicies[0];
          })
        );
        login();
      });

      afterEach(() => {
        if (indexedPolicy) {
          cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
        }
      });

      it('should display upselling section for protections', () => {
        navigateToFleetAgentPolicySettings(policy.policy_ids[0]);
        checkForAgentTamperProtectionAvailability(false);
      });
    });
  }
);
