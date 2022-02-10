/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet_agents_actions', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    it('should return a 200 if this a valid actions request', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            type: 'POLICY_CHANGE',
            data: { data: 'action_data' },
          },
        })
        .expect(200);

      expect(apiResponse.item.type).to.eql('POLICY_CHANGE');
      expect(apiResponse.item.data).to.eql({ data: 'action_data' });
    });

    it('should return a 200 if this a valid SETTINGS action request', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            type: 'SETTINGS',
            data: { log_level: 'debug' },
          },
        })
        .expect(200);

      expect(apiResponse.item.type).to.eql('SETTINGS');
      expect(apiResponse.item.data).to.eql({ log_level: 'debug' });
    });

    it('should return a 400 if this a invalid SETTINGS action request', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            type: 'SETTINGS',
            data: { log_level: 'thisnotavalidloglevel' },
          },
        })
        .expect(400);

      expect(apiResponse.message).to.match(
        /\[request body.action\.[0-9]*\.data\.log_level]: types that failed validation/
      );
    });

    it('should return a 400 when request does not have type information', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            data: { data: 'action_data' },
          },
        })
        .expect(400);
      expect(apiResponse.message).to.match(
        /\[request body.action\.[0-9]*\.type]: expected at least one defined value but got \[undefined]/
      );
    });

    it('should return a 404 when agent does not exist', async () => {
      await supertest
        .post(`/api/fleet/agents/agent100/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            type: 'POLICY_CHANGE',
            data: { data: 'action_data' },
          },
        })
        .expect(404);
    });

    it('should return a 403 if user lacks fleet all permissions', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
        .send({
          action: {
            type: 'POLICY_CHANGE',
            data: { data: 'action_data' },
          },
        })
        .expect(403);
    });
  });
}
