/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getSupertestWithoutAuth } from '../fleet/agents/services';

export default function(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');
  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  // agent that is enrolled and know to fleet
  const enrolledAgentId = '94e689c0-81bd-11ea-a4eb-77680821cd3b';
  // host that is connected to enrolledAgentId
  const enrolledHostId = '89ec7354-84a8-4f74-8d87-ba75f0994a17';
  // host that is not connected to an enrolled agent id
  const notEnrolledHostId = 'bcf0d070-d9f2-40aa-8620-cbc004747722';

  let apiKey: { id: string; api_key: string };

  describe('test metadata api status', () => {
    describe('/api/endpoint/metadata when index is not empty', () => {
      beforeEach(async () => {
        await esArchiver.loadIfNeeded('endpoint/metadata/endpoint_status_feature');
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
          id: `agents:${enrolledAgentId}`,
        });

        agentDoc.agents.access_api_key_id = apiKey.id;

        await esClient.update({
          index: '.kibana',
          id: `agents:${enrolledAgentId}`,
          refresh: 'true',
          body: {
            doc: agentDoc,
          },
        });
        await getService('supertest')
          .post(`/api/ingest_manager/setup`)
          .set('kbn-xsrf', 'xxx')
          .send();
        await getService('supertest')
          .post(`/api/ingest_manager/fleet/setup`)
          .set('kbn-xsrf', 'xxx');
      });

      afterEach(async () => await esArchiver.unload('endpoint/metadata/endpoint_status_feature'));

      it('should return single metadata with status error when agent status is error', async () => {
        const { body: metadataResponse } = await supertest
          .get(`/api/endpoint/metadata/${enrolledHostId}`)
          .expect(200);
        expect(metadataResponse.host_status).to.be('error');
      });

      it('should return single metadata with status error when agent is not enrolled', async () => {
        const { body: metadataResponse } = await supertest
          .get(`/api/endpoint/metadata/${notEnrolledHostId}`)
          .expect(200);
        expect(metadataResponse.host_status).to.be('error');
      });

      it('should return metadata list with status error when no agent is not enrolled', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(2);
        expect(body.hosts.length).to.eql(2);
        const enrolledHost = body.hosts.filter(
          (hostInfo: Record<string, any>) => hostInfo.metadata.host.id === enrolledHostId
        );
        const notEnrolledHost = body.hosts.filter(
          (hostInfo: Record<string, any>) => hostInfo.metadata.host.id === notEnrolledHostId
        );
        expect(enrolledHost.host_status === 'error');
        expect(notEnrolledHost.host_status === 'error');
      });

      it('should return single metadata with status online when agent status is online', async () => {
        const { body: checkInResponse } = await supertestWithoutAuth
          .post(`/api/ingest_manager/fleet/agents/${enrolledAgentId}/checkin`)
          .set('kbn-xsrf', 'xx')
          .set(
            'Authorization',
            `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
          )
          .send({
            events: [],
            local_metadata: {},
          })
          .expect(200);

        expect(checkInResponse.action).to.be('checkin');
        expect(checkInResponse.success).to.be(true);

        const { body: metadataResponse } = await supertest
          .get(`/api/endpoint/metadata/${enrolledHostId}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(metadataResponse.host_status).to.be('online');
      });

      it('should return metadata list with status only when agent is checked in', async () => {
        const { body: checkInResponse } = await supertestWithoutAuth
          .post(`/api/ingest_manager/fleet/agents/${enrolledAgentId}/checkin`)
          .set('kbn-xsrf', 'xx')
          .set(
            'Authorization',
            `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
          )
          .send({
            events: [],
            local_metadata: {},
          })
          .expect(200);

        expect(checkInResponse.action).to.be('checkin');
        expect(checkInResponse.success).to.be(true);

        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(2);
        expect(body.hosts.length).to.eql(2);
        const enrolledHost = body.hosts.filter(
          (hostInfo: Record<string, any>) => hostInfo.metadata.host.id === enrolledHostId
        );
        const notEnrolledHost = body.hosts.filter(
          (hostInfo: Record<string, any>) => hostInfo.metadata.host.id === notEnrolledHostId
        );
        expect(enrolledHost.host_status === 'online');
        expect(notEnrolledHost.host_status === 'error');
      });
    });
  });
}
