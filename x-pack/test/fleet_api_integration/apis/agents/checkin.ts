/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getSupertestWithoutAuth, setupFleetAndAgents } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';
import { AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS } from '../../../../plugins/fleet/common';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

  const supertest = getSupertestWithoutAuth(providerContext);
  let apiKey: { id: string; api_key: string };

  describe('fleet_agents_checkin', () => {
    skipIfNoDockerRegistry(providerContext);
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
        index: '.fleet-agents',
        id: 'agent1',
      });
      agentDoc.access_api_key_id = apiKey.id;
      await esClient.update({
        index: '.fleet-agents',
        id: 'agent1',
        refresh: true,
        body: {
          doc: agentDoc,
        },
      });
    });
    setupFleetAndAgents(providerContext);
    after(async () => {
      // Wait before agent status is updated
      return new Promise((resolve) => setTimeout(resolve, AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS));
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return a 401 if this a not a valid checkin access', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', 'ApiKey NOT_A_VALID_TOKEN')
        .send({
          events: [],
        })
        .expect(401);
    });

    it('should return a 400 if for a malformed request payload', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/checkin`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          events: ['i-am-not-valid-event'],
          metadata: {},
        })
        .expect(400);
    });

    it('should return a 200 if this a valid checkin access', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/checkin`)
        .set('kbn-xsrf', 'xx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          events: [
            {
              type: 'STATE',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              subtype: 'STARTING',
              message: 'State change: STARTING',
              agent_id: 'agent1',
            },
          ],
          local_metadata: {
            cpu: 12,
          },
        })
        .expect(200);

      expect(apiResponse.action).to.be('checkin');
    });
  });
}
