/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { FtrProviderContext } from '../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../security_solution_endpoint/services/endpoint_artifacts';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  describe.only('Endpoint artifacts (via lists plugin)', () => {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    before(async () => {
      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
    });

    describe('and has authorization to manage endpoint security', () => {
      describe('and creating or updating rusted apps', () => {
        let trustedAppData: ArtifactTestData;

        beforeEach(async () => {
          trustedAppData = await endpointArtifactTestResources.createTrustedApp();
        });

        afterEach(async () => {
          if (trustedAppData) {
            await trustedAppData.cleanup();
          }
        });

        const trustedAppApiCalls = [
          {
            method: 'post',
            path: EXCEPTION_LIST_ITEM_URL,
            body: undefined,
          },
          {
            method: 'put',
            path: EXCEPTION_LIST_ITEM_URL,
            body: undefined,
          },
        ];

        it.only('TEST TEST TEST', async () => {
          //
        });

        for (const trustedAppApiCall of trustedAppApiCalls) {
          it('should error if invalid condition entry fields are used', async () => {});

          it('should error if a condition entry field is used more than once', async () => {});

          it('should error if an invalid hash is used', async () => {});

          it('should error if signer is set for a non windows os entry item', async () => {});

          it('should error if more than one OS is set', async () => {});

          it('should error if policy id is invalid', async () => {});
        }

        describe('and elastic license is less than Platinum Plus', () => {
          it('should error if attempting to modify policy id');

          it('should error if attempting to remove policy id');

          it('should allow update to global artifact (from policy specific');
        });
      });
    });

    describe('and user is NOT authorized to manage endpoint security', () => {
      describe('and attempting to access Trusted apps', () => {
        it('should error if on create');

        it('should error update');
      });
    });
  });
}
