/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { expectToRejectWithError } from '../space_awareness/helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');

  describe('create standalone api key', function () {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await setupTestUsers(getService('security'));
    });

    describe('POST /internal/fleet/create_standalone_agent_api_key', () => {
      it('should work with a user with the correct permissions', async () => {
        const apiClient = new SpaceTestApiClient(supertest);
        const res = await apiClient.postStandaloneApiKey('test');
        expect(res.item.name).to.eql('standalone_agent-test');
      });
      it('should return a 403 if the user cannot create the api key', async () => {
        const apiClient = new SpaceTestApiClient(supertestWithoutAuth, {
          username: testUsers.fleet_all_int_all.username,
          password: testUsers.fleet_all_int_all.password,
        });
        await expectToRejectWithError(
          () => apiClient.postStandaloneApiKey('tata'),
          /403 Forbidden Missing permissions to create standalone API key/
        );
      });
    });
  });
}
