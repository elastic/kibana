/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_agent_actions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 404 if the agent do not exists', async () => {
      await supertest
        .post(`/api/fleet/agents/i-do-not-exist/actions`)
        .send({
          type: 'PAUSE',
        })
        .set('kbn-xsrf', 'xx')
        .expect(404);
    });

    it('should return a 400 if the action is not invalid', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .send({
          type: 'INVALID_ACTION',
        })
        .set('kbn-xsrf', 'xx')
        .expect(400);
    });

    it('should return a 200 if the action is not invalid', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .send({
          type: 'PAUSE',
        })
        .set('kbn-xsrf', 'xx')
        .expect(200);
      expect(apiResponse.success).to.be(true);
      expect(apiResponse.item).to.have.keys(['id', 'type', 'created_at']);
    });

    // it('should return a 200 after deleting an agent', async () => {
    //   const { body: apiResponse } = await supertest
    //     .delete(`/api/fleet/agents/agent1`)
    //     .set('kbn-xsrf', 'xx')
    //     .expect(200);
    //   expect(apiResponse).to.eql({
    //     success: true,
    //     action: 'deleted',
    //   });
    // });
  });
}
