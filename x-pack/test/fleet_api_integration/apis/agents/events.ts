/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_agents_events', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 200 and the events for a given agent', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents/agent1/events`)
        .expect(200);
      expect(apiResponse).to.have.keys(['list', 'total', 'page']);
      expect(apiResponse.total).to.be(2);
      expect(apiResponse.page).to.be(1);

      const event = apiResponse.list[0];
      expect(event).to.have.keys('type', 'subtype', 'message', 'payload');
      expect(event.payload).to.have.keys('previous_state');
    });

    it('should return a 400 when given an invalid "kuery" value', async () => {
      await supertest
        .get(`/api/fleet/agents/agent1/events?kuery=m`) // missing saved object type
        .expect(400);
    });
    it('should accept a valid "kuery" value', async () => {
      const filter = encodeURIComponent('fleet-agent-events.subtype : "STOPPED"');
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents/agent1/events?kuery=${filter}`)
        .expect(200);

      expect(apiResponse).to.have.keys(['list', 'total', 'page']);
      expect(apiResponse.total).to.be(1);
      expect(apiResponse.page).to.be(1);

      const event = apiResponse.list[0];
      expect(event.subtype).to.eql('STOPPED');
    });
  });
}
