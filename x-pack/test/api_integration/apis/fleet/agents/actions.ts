/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_agents_actions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 200 if this a valid actions request', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            type: 'CONFIG_CHANGE',
            data: { data: 'action_data' },
            sent_at: '2020-03-18T19:45:02.620Z',
          },
        })
        .expect(200);

      expect(apiResponse.success).to.be(true);
      expect(apiResponse.item.data).to.eql({ data: 'action_data' });
      expect(apiResponse.item.sent_at).to.be('2020-03-18T19:45:02.620Z');
    });

    it('should return a 400 when request does not have type information', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            data: { data: 'action_data' },
            sent_at: '2020-03-18T19:45:02.620Z',
          },
        })
        .expect(400);
      expect(apiResponse.message).to.eql(
        '[request body.action.type]: expected at least one defined value but got [undefined]'
      );
    });

    it('should return a 404 when agent does not exist', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent100/actions`)
        .set('kbn-xsrf', 'xx')
        .send({
          action: {
            type: 'CONFIG_CHANGE',
            data: { data: 'action_data' },
            sent_at: '2020-03-18T19:45:02.620Z',
          },
        })
        .expect(404);
      expect(apiResponse.message).to.eql('Saved object [fleet-agents/agent100] not found');
    });
  });
}
