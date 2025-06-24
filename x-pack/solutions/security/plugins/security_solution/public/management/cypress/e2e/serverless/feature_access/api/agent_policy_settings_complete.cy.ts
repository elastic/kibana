/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createAgentPolicyTask,
  createAgentPolicyWithAgentTamperProtectionsEnabled,
  enableAgentTamperProtectionFeatureFlagInPolicy,
  getEndpointIntegrationVersion,
} from '../../../../tasks/fleet';
import { login } from '../../../../tasks/login';

describe(
  'Agent policy settings API operations on Complete',
  {
    tags: ['@serverless', '@serverlessQA'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    // let policy: PolicyData;

    beforeEach(() => {
      getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
        })
      );
      login();
    });

    afterEach(() => {
      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      }
    });

    describe('Agent tamper protections', () => {
      it('allow enabling the feature', () => {
        enableAgentTamperProtectionFeatureFlagInPolicy(indexedPolicy.agentPolicies[0].id).then(
          (response) => {
            expect(response.status).to.equal(200);
            expect(response.body.item.is_protected).to.equal(true);
          }
        );
      });
      it('throw error when trying to create agent policy', () => {
        createAgentPolicyWithAgentTamperProtectionsEnabled().then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.item.is_protected).to.equal(false); // We don't allow creating a policy with the feature enabled
        });
      });
    });
  }
);
