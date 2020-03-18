/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSupertestWithoutAuth } from './services';

export default function(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

  const supertest = getSupertestWithoutAuth(providerContext);
  let apiKey: { id: string; api_key: string };

  describe('fleet_agents_actions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');

      const { body: apiKeyBody } = await esClient.security.createApiKey({
        body: {
          name: `test access api key: ${uuid.v4()}`,
        },
      });
      apiKey = apiKeyBody;
      const {
        body: { _source: agentDoc },
      } = await esClient.get({
        index: '.kibana',
        id: 'agents:agent1',
      });
      agentDoc.agents.access_api_key_id = apiKey.id;
      await esClient.update({
        index: '.kibana',
        id: 'agents:agent1',
        refresh: 'true',
        body: {
          doc: agentDoc,
        },
      });
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 401 if this a not a valid actions access', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', 'ApiKey NOT_A_VALID_TOKEN')
        .send({
          action_ids: [],
        })
        .expect(401);
    });

    it('should return a 200 if this a valid actions request', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          action: {
            type: 'CONFIG_CHANGE',
            data: 'action_data',
            sent_at: '2020-03-18T19:45:02.620Z',
          },
        })
        .expect(200);

      expect(apiResponse.success).to.be(true);
      expect(apiResponse.item.data).to.be('action_data');
      expect(apiResponse.item.sent_at).to.be('2020-03-18T19:45:02.620Z');

      const { body: agentResponse } = await supertest
        .get(`/api/ingest_manager/fleet/agents/agent1`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .expect(200);

      const updatedAction = agentResponse.item.actions.find(
        (itemAction: Record<string, string>) => itemAction?.data === 'action_data'
      );

      expect(updatedAction.type).to.be('CONFIG_CHANGE');
      expect(updatedAction.data).to.be('action_data');
      expect(updatedAction.sent_at).to.be('2020-03-18T19:45:02.620Z');
    });

    it('should return a 400 when request does not have type information', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/actions`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          action: {
            data: 'action_data',
            sent_at: '2020-03-18T19:45:02.620Z',
          },
        })
        .expect(400);
      expect(apiResponse.message).to.eql(
        '[request body.action.type]: expected at least one defined value but got [undefined]'
      );
    });

    /*
    it('should return a 400 when request event list contains action that does not belong to agent current actions', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/acks`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          events: [
            {
              type: 'ACTION_RESULT',
              subtype: 'CONFIG',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: '48cebde1-c906-4893-b89f-595d943b72a1',
              agent_id: 'agent1',
              message: 'hello',
              payload: 'payload',
            },
            {
              type: 'ACTION_RESULT',
              subtype: 'CONFIG',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: 'does-not-exist',
              agent_id: 'agent1',
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(400);
      expect(apiResponse.message).to.eql('all actions should belong to current agent');
    });

    it('should return a 400 when request event list contains action types that are not allowed for acknowledgement', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/acks`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          events: [
            {
              type: 'ACTION',
              subtype: 'FAILED',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: '48cebde1-c906-4893-b89f-595d943b72a1',
              agent_id: 'agent1',
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(400);
      expect(apiResponse.message).to.eql(
        'ACTION not allowed for acknowledgment only ACTION_RESULT'
      );
    });*/
  });
}
