/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet_agents_migrate', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });
    // TODO: create some agents in here so we can check things. DO it in the before (not beforeEach) so we can
    // reuse them in the other tests (above)

    // END TODO
    describe('POST /agents/{agentId}/migrate', () => {
      it('should return a 200 if the migration action is successful', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents/agent1/migrate`)
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

      it('should return a 500 if the agent is tamper protected', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents/agent2/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            action: {
              type: 'SETTINGS',
              data: { log_level: null },
            },
          })
          .expect(200);

        expect(apiResponse.item.type).to.eql('SETTINGS');
        expect(apiResponse.item.data).to.eql({ log_level: null });
      });

      it('should return a 500 is the agent is a fleet-agent', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/agents/agent3/migrate`)
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

      it('should return a 404 when agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/agent100/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            action: {
              type: 'SETTINGS',
              data: { log_level: 'debug' },
            },
          })
          .expect(404);
      });
    });
  });
}
