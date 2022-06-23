/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { testUsers } from '../test_users';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');

  describe('fleet_list_agent', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    it.skip('should return a 200 if a user with the fleet all try to access the list', async () => {
      await supertest
        .get(`/api/fleet/agents`)
        .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
        .expect(200);
    });

    it('should not return the list of agents when requesting as a user without fleet permissions', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/agents`)
        .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
        .expect(403);
    });

    it('should return the list of agents when requesting as admin', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);

      expect(apiResponse).to.have.keys('page', 'total', 'items', 'list');
      expect(apiResponse.total).to.eql(4);
    });

    it('should return the list of agents when requesting as a user with fleet read permissions', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);
      expect(apiResponse).to.have.keys('page', 'total', 'items', 'list');
      expect(apiResponse.total).to.eql(4);
    });

    it('should return a 400 when given an invalid "kuery" value', async () => {
      await supertest.get(`/api/fleet/agents?kuery=.test%3A`).expect(400);
    });

    it('should return a 200 and an empty list when given a "kuery" value with a missing saved object type', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?kuery=m`) // missing saved object type
        .expect(200);
      expect(apiResponse.total).to.eql(0);
    });

    it('should accept a valid "kuery" value', async () => {
      const filter = encodeURIComponent('fleet-agents.access_api_key_id : "api-key-2"');
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?kuery=${filter}`)
        .expect(200);

      expect(apiResponse.total).to.eql(1);
      const agent = apiResponse.items[0];
      expect(agent.access_api_key_id).to.eql('api-key-2');
    });
  });
}
