/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSupertestWithoutAuth } from './services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

  const supertest = getSupertestWithoutAuth(providerContext);
  let apiKey: { id: string; api_key: string };

  describe('fleet_agents_acks', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');

      const { body: apiKeyBody } = await esClient.security.createApiKey<typeof apiKey>({
        body: {
          name: `test access api key: ${uuid.v4()}`,
        },
      });
      apiKey = apiKeyBody;
      const {
        body: { _source: agentDoc },
      } = await esClient.get({
        index: '.kibana',
        id: 'fleet-agents:agent1',
      });
      agentDoc['fleet-agents'].access_api_key_id = apiKey.id;
      await esClient.update({
        index: '.kibana',
        id: 'fleet-agents:agent1',
        refresh: 'true',
        body: {
          doc: agentDoc,
        },
      });
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 401 if this a not a valid acks access', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/acks`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', 'ApiKey NOT_A_VALID_TOKEN')
        .send({
          action_ids: [],
        })
        .expect(401);
    });

    it('should return a 200 if this a valid acks request', async () => {
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
              timestamp: '2019-01-05T14:32:03.36764-05:00',
              action_id: '48cebde1-c906-4893-b89f-595d943b72a2',
              agent_id: 'agent1',
              message: 'hello2',
              payload: 'payload2',
            },
          ],
        })
        .expect(200);
      expect(apiResponse.action).to.be('acks');
      expect(apiResponse.success).to.be(true);
      const { body: eventResponse } = await supertest
        .get(`/api/ingest_manager/fleet/agents/agent1/events`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .expect(200);
      const expectedEvents = eventResponse.list.filter(
        (item: Record<string, string>) =>
          item.action_id === '48cebde1-c906-4893-b89f-595d943b72a1' ||
          item.action_id === '48cebde1-c906-4893-b89f-595d943b72a2'
      );
      expect(expectedEvents.length).to.eql(2);
      const { id, ...expectedEvent } = expectedEvents.find(
        (item: Record<string, string>) => item.action_id === '48cebde1-c906-4893-b89f-595d943b72a1'
      );
      expect(expectedEvent).to.eql({
        type: 'ACTION_RESULT',
        subtype: 'CONFIG',
        timestamp: '2019-01-04T14:32:03.36764-05:00',
        action_id: '48cebde1-c906-4893-b89f-595d943b72a1',
        agent_id: 'agent1',
        message: 'hello',
        payload: 'payload',
      });
    });

    it('should return a 400 when request event list contains event for another agent id', async () => {
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
              agent_id: 'agent2',
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(400);
      expect(apiResponse.message).to.eql(
        'agent events contains events with different agent id from currently authorized agent'
      );
    });

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
      expect(apiResponse.message).to.eql('One or more actions cannot be found');
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
    });
  });
}
