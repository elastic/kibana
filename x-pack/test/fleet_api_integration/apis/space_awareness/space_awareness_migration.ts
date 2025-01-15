/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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

  describe('space awareness migration', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      // Create agent policies it should create a enrollment key for every keys
      const [defaultSpacePolicy1, spaceTest1Policy1] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);

      await apiClient.installPackage({
        pkgName: 'nginx',
        pkgVersion: '1.20.0',
        force: true, // To avoid package verification
      });

      await apiClient.createPackagePolicy(undefined, {
        policy_ids: [defaultSpacePolicy1.item.id],
        name: `test-nginx-1-${Date.now()}`,
        description: 'test',
        package: {
          name: 'nginx',
          version: '1.20.0',
        },
        inputs: {},
      });

      await apiClient.createPackagePolicy(TEST_SPACE_1, {
        policy_ids: [spaceTest1Policy1.item.id],
        name: `test-nginx-2-${Date.now()}`,
        description: 'test',
        package: {
          name: 'nginx',
          version: '1.20.0',
        },
        inputs: {},
      });

      await spaces.createTestSpace(TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('without opt-in', () => {
      it('agent policies should not be space aware', async () => {
        const policiesDefaultSpaceIds = (await apiClient.getAgentPolicies()).items
          .map(({ id }) => id)
          .sort();

        const policiesTestSpaceIds = (await apiClient.getAgentPolicies(TEST_SPACE_1)).items
          .map(({ id }) => id)
          .sort();

        expect(policiesDefaultSpaceIds.length).to.eql(3);
        expect(policiesDefaultSpaceIds).to.eql(policiesTestSpaceIds);
      });

      it('package policies should not be space aware', async () => {
        const policiesDefaultSpaceIds = (await apiClient.getPackagePolicies()).items
          .map(({ id }) => id)
          .sort();

        const policiesTestSpaceIds = (await apiClient.getPackagePolicies(TEST_SPACE_1)).items
          .map(({ id }) => id)
          .sort();

        expect(policiesDefaultSpaceIds.length).to.eql(2);
        expect(policiesDefaultSpaceIds).to.eql(policiesTestSpaceIds);
      });
    });

    describe('with space awareness opt-in', () => {
      before(async () => {
        await apiClient.postEnableSpaceAwareness();
      });

      it('agent policies should be migrated to the default space', async () => {
        const policiesDefaultSpaceIds = (await apiClient.getAgentPolicies()).items
          .map(({ id }) => id)
          .sort();

        const policiesTestSpaceIds = (await apiClient.getAgentPolicies(TEST_SPACE_1)).items
          .map(({ id }) => id)
          .sort();

        expect(policiesDefaultSpaceIds.length).to.eql(3);
        expect(policiesTestSpaceIds.length).to.eql(0);
      });

      it('package policies should be migrated to the default space', async () => {
        const policiesDefaultSpaceIds = (await apiClient.getPackagePolicies()).items
          .map(({ id }) => id)
          .sort();

        const policiesTestSpaceIds = (await apiClient.getPackagePolicies(TEST_SPACE_1)).items
          .map(({ id }) => id)
          .sort();

        expect(policiesDefaultSpaceIds.length).to.eql(2);
        expect(policiesTestSpaceIds.length).to.eql(0);
      });
    });
  });
}
