/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { type EnrollmentAPIKey } from '@kbn/fleet-plugin/common/types';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('enrollment api keys', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;
    let defaultSpaceEnrollmentKey1: EnrollmentAPIKey;
    let spaceTest1EnrollmentKey1: EnrollmentAPIKey;

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      // Create agent policies it should create a enrollment key for every keys
      await apiClient.postEnableSpaceAwareness();

      const [_defaultSpacePolicy1, _spaceTest1Policy1, _spaceTest1Policy2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;

      const space1ApiKeys = await apiClient.getEnrollmentApiKeys(TEST_SPACE_1);
      const defaultSpaceApiKeys = await apiClient.getEnrollmentApiKeys();
      defaultSpaceEnrollmentKey1 = defaultSpaceApiKeys.items[0];
      spaceTest1EnrollmentKey1 = space1ApiKeys.items[0];
      await spaces.createTestSpace(TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('read APIs', () => {
      describe('GET /enrollment_api_keys', () => {
        it('should return enrolmment keys in a specific space', async () => {
          const apiKeys = await apiClient.getEnrollmentApiKeys(TEST_SPACE_1);
          expect(apiKeys.total).to.eql(2);
          const policyIds = apiKeys.items?.map((item) => item.policy_id);
          expect(policyIds).to.contain(spaceTest1Policy1.item.id);
          expect(policyIds).to.contain(spaceTest1Policy2.item.id);
          expect(policyIds).not.to.contain(defaultSpacePolicy1.item.id);
        });

        it('should return enrolmment keys in default space', async () => {
          const apiKeys = await apiClient.getEnrollmentApiKeys();
          expect(apiKeys.total).to.eql(1);
          const policyIds = apiKeys.items?.map((item) => item.policy_id);
          expect(policyIds).not.to.contain(spaceTest1Policy1.item.id);
          expect(policyIds).not.contain(spaceTest1Policy2.item.id);
          expect(policyIds).to.contain(defaultSpacePolicy1.item.id);
        });
      });

      describe('GET /enrollment_api_keys/{id}', () => {
        it('should allow to access a enrollment keu in a specific space', async () => {
          await apiClient.getEnrollmentApiKey(spaceTest1EnrollmentKey1.id, TEST_SPACE_1);
        });
        it('should not allow to get an enrolmment key from a different space from the default space', async () => {
          let err: Error | undefined;
          try {
            await apiClient.getEnrollmentApiKey(spaceTest1EnrollmentKey1.id);
          } catch (_err) {
            err = _err;
          }

          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/404 "Not Found"/);
        });

        it('should not allow to get an default space enrolmment key from a different space', async () => {
          let err: Error | undefined;
          try {
            await apiClient.getEnrollmentApiKey(defaultSpaceEnrollmentKey1.id, TEST_SPACE_1);
          } catch (_err) {
            err = _err;
          }

          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/404 "Not Found"/);
        });
      });
    });

    describe('write APIs', () => {
      describe('POST /enrollment_api_keys', () => {
        it('should allow to create an enrollment api key for a policy in the default space', async () => {
          const res = await apiClient.postEnrollmentApiKeys({
            policy_id: defaultSpacePolicy1.item.id,
          });
          expect(res.item).to.have.key('id');
        });
        it('should allow to create an enrollment api key for a policy in the same space', async () => {
          const res = await apiClient.postEnrollmentApiKeys(
            {
              policy_id: spaceTest1Policy1.item.id,
            },
            TEST_SPACE_1
          );
          expect(res.item).to.have.key('id');
        });

        it('should not allow to create an enrollment api key for a policy in a different space', async () => {
          let err: Error | undefined;
          try {
            await apiClient.postEnrollmentApiKeys(
              {
                policy_id: defaultSpacePolicy1.item.id,
              },
              TEST_SPACE_1
            );
          } catch (_err) {
            err = _err;
          }
          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/404 "Not Found"/);
        });

        it('should not allow to create an enrollment api key for a policy from a different space in the default space', async () => {
          let err: Error | undefined;
          try {
            await apiClient.postEnrollmentApiKeys({
              policy_id: spaceTest1Policy1.item.id,
            });
          } catch (_err) {
            err = _err;
          }
          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/404 "Not Found"/);
        });
      });
      describe('DELETE /enrollment_api_keys', () => {
        it('should not allow to delete an enrollment api key in a different space', async () => {
          let err: Error | undefined;
          try {
            await apiClient.deleteEnrollmentApiKey(defaultSpaceEnrollmentKey1.id, TEST_SPACE_1);
          } catch (_err) {
            err = _err;
          }
          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/404 "Not Found"/);
        });

        it('should not allow to delete an enrollment api key from a different space in the default space', async () => {
          let err: Error | undefined;
          try {
            await apiClient.deleteEnrollmentApiKey(spaceTest1EnrollmentKey1.id);
          } catch (_err) {
            err = _err;
          }
          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/404 "Not Found"/);
        });
        it('should allow to delete an enrollment api key in the default space', async () => {
          await apiClient.deleteEnrollmentApiKey(defaultSpaceEnrollmentKey1.id);
        });
        it('should allow to create an enrollment api key in the same space', async () => {
          await apiClient.deleteEnrollmentApiKey(spaceTest1EnrollmentKey1.id, TEST_SPACE_1);
        });
      });
    });
  });
}
