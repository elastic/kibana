/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { SpaceTestApiClient } from './api_helper';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  const apiClient = new SpaceTestApiClient(supertest);

  describe('space_telemetry', function () {
    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await spaces.createTestSpace(TEST_SPACE_1);
      await apiClient.postEnableSpaceAwareness();
      await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
    });

    it('return correct fleet usage', async () => {
      const res = await apiClient.getFleetUsage();
      expect(res.usage.agent_policies.count).to.eql(5);
      expect(res.usage.agent_policies.count_with_non_default_space).to.eql(3);
    });
  });
}
