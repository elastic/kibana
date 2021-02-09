/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents, getSupertestWithoutAuth } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  const esClient = getService('es');

  describe('fleet_agent_flow', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    setupFleetAndAgents(providerContext);
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    it('should work', async () => {
      const kibanaVersionAccessor = kibanaServer.version;
      const kibanaVersion = await kibanaVersionAccessor.get();

      // Get enrollment token
      const { body: enrollmentApiKeysResponse } = await supertest
        .get(`/api/fleet/enrollment-api-keys`)
        .expect(200);

      expect(enrollmentApiKeysResponse.list).length(1);
      const { body: enrollmentApiKeyResponse } = await supertest
        .get(`/api/fleet/enrollment-api-keys/${enrollmentApiKeysResponse.list[0].id}`)
        .expect(200);

      expect(enrollmentApiKeyResponse.item).to.have.key('api_key');
      const enrollmentAPIToken = enrollmentApiKeyResponse.item.api_key;
      // Enroll agent
      const { body: enrollmentResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `ApiKey ${enrollmentAPIToken}`)
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: kibanaVersion } },
            },
            user_provided: {},
          },
        })
        .expect(200);

      const agentAccessAPIKey = enrollmentResponse.item.access_api_key;

      // Agent checkin
      const { body: checkinApiResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(200);

      expect(checkinApiResponse.actions).length(1);
      expect(checkinApiResponse.actions[0].type).be('POLICY_CHANGE');
      const policyChangeAction = checkinApiResponse.actions[0];
      const defaultOutputApiKey = policyChangeAction.data.policy.outputs.default.api_key;

      // Ack actions
      await supertestWithoutAuth
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/acks`)
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .set('kbn-xsrf', 'xx')

        .send({
          events: [
            {
              type: 'ACTION_RESULT',
              subtype: 'ACKNOWLEDGED',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: policyChangeAction.id,
              agent_id: enrollmentResponse.item.id,
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(200);

      // Second agent checkin
      const { body: secondCheckinApiResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(200);
      expect(secondCheckinApiResponse.actions).length(0);

      // Get agent
      const { body: getAgentApiResponse } = await supertest
        .get(`/api/fleet/agents/${enrollmentResponse.item.id}`)
        .expect(200);

      expect(getAgentApiResponse.item.packages).to.contain(
        'system',
        "Agent should run the 'system' package"
      );

      // Unenroll agent
      await supertest
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/unenroll`)
        .set('kbn-xsrf', 'xx')
        .expect(200);

      //  Checkin after unenrollment
      const { body: checkinAfterUnenrollResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(200);

      expect(checkinAfterUnenrollResponse.actions).length(1);
      expect(checkinAfterUnenrollResponse.actions[0].type).be('UNENROLL');
      const unenrollAction = checkinAfterUnenrollResponse.actions[0];

      //  ack unenroll actions
      await supertestWithoutAuth
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/acks`)
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .set('kbn-xsrf', 'xx')
        .send({
          events: [
            {
              type: 'ACTION_RESULT',
              subtype: 'ACKNOWLEDGED',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: unenrollAction.id,
              agent_id: enrollmentResponse.item.id,
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(200);

      // Checkin after unenrollment acknowledged
      await supertestWithoutAuth
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(401);

      // very api key are invalidated
      const {
        body: { api_keys: accessAPIKeys },
      } = await esClient.security.getApiKey({
        id: Buffer.from(agentAccessAPIKey, 'base64').toString('utf8').split(':')[0],
      });
      expect(accessAPIKeys).length(1);
      expect(accessAPIKeys[0].invalidated).eql(true);

      const {
        body: { api_keys: outputAPIKeys },
      } = await esClient.security.getApiKey({
        id: defaultOutputApiKey.split(':')[0],
      });
      expect(outputAPIKeys).length(1);
      expect(outputAPIKeys[0].invalidated).eql(true);
    });

    // BWC for agent <= 7.9
    it('should work with 7.9 APIs', async () => {
      const kibanaVersionAccessor = kibanaServer.version;
      const kibanaVersion = await kibanaVersionAccessor.get();

      // Get enrollment token
      const { body: enrollmentApiKeysResponse } = await supertest
        .get(`/api/fleet/enrollment-api-keys`)
        .expect(200);

      expect(enrollmentApiKeysResponse.list).length(1);
      const { body: enrollmentApiKeyResponse } = await supertest
        .get(`/api/fleet/enrollment-api-keys/${enrollmentApiKeysResponse.list[0].id}`)
        .expect(200);

      expect(enrollmentApiKeyResponse.item).to.have.key('api_key');
      const enrollmentAPIToken = enrollmentApiKeyResponse.item.api_key;
      // Enroll agent
      const { body: enrollmentResponse } = await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `ApiKey ${enrollmentAPIToken}`)
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: kibanaVersion } },
            },
            user_provided: {},
          },
        })
        .expect(200);

      const agentAccessAPIKey = enrollmentResponse.item.access_api_key;

      // Agent checkin
      const { body: checkinApiResponse } = await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(200);

      expect(checkinApiResponse.actions).length(1);
      expect(checkinApiResponse.actions[0].type).be('POLICY_CHANGE');
      const policyChangeAction = checkinApiResponse.actions[0];
      const defaultOutputApiKey = policyChangeAction.data.policy.outputs.default.api_key;

      // Ack actions
      await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/acks`)
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .set('kbn-xsrf', 'xx')

        .send({
          events: [
            {
              type: 'ACTION_RESULT',
              subtype: 'ACKNOWLEDGED',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: policyChangeAction.id,
              agent_id: enrollmentResponse.item.id,
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(200);

      // Second agent checkin
      const { body: secondCheckinApiResponse } = await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(200);
      expect(secondCheckinApiResponse.actions).length(0);

      // Get agent
      const { body: getAgentApiResponse } = await supertest
        .get(`/api/fleet/agents/${enrollmentResponse.item.id}`)
        .expect(200);

      expect(getAgentApiResponse.item.packages).to.contain(
        'system',
        "Agent should run the 'system' package"
      );

      // Unenroll agent
      await supertest
        .post(`/api/fleet/agents/${enrollmentResponse.item.id}/unenroll`)
        .set('kbn-xsrf', 'xx')
        .expect(200);

      //  Checkin after unenrollment
      const { body: checkinAfterUnenrollResponse } = await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(200);

      expect(checkinAfterUnenrollResponse.actions).length(1);
      expect(checkinAfterUnenrollResponse.actions[0].type).be('UNENROLL');
      const unenrollAction = checkinAfterUnenrollResponse.actions[0];

      //  ack unenroll actions
      await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/acks`)
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .set('kbn-xsrf', 'xx')
        .send({
          events: [
            {
              type: 'ACTION_RESULT',
              subtype: 'ACKNOWLEDGED',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              action_id: unenrollAction.id,
              agent_id: enrollmentResponse.item.id,
              message: 'hello',
              payload: 'payload',
            },
          ],
        })
        .expect(200);

      // Checkin after unenrollment acknowledged
      await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/checkin`)
        .set('kbn-xsrf', 'xx')
        .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
        .send({
          events: [],
        })
        .expect(401);

      // very api key are invalidated
      const {
        body: { api_keys: accessAPIKeys },
      } = await esClient.security.getApiKey({
        id: Buffer.from(agentAccessAPIKey, 'base64').toString('utf8').split(':')[0],
      });
      expect(accessAPIKeys).length(1);
      expect(accessAPIKeys[0].invalidated).eql(true);

      const {
        body: { api_keys: outputAPIKeys },
      } = await esClient.security.getApiKey({
        id: defaultOutputApiKey.split(':')[0],
      });
      expect(outputAPIKeys).length(1);
      expect(outputAPIKeys[0].invalidated).eql(true);
    });
  });
}
