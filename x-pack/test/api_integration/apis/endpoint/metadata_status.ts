/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  // const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  const esClient = getService('es');
  // agent that is enrolled and know to fleet
  const enrolledAgentId = '3efef370-8164-11ea-bc0d-9196b6de96eb';
  // host that is connected to enrolledAgentId
  const enrolledHostId = 'fdb346d9-6f56-426a-90a7-a9328d1b0528';
  // host that is not connected to an enrolled agent id
  const notEnrolledHostId = 'bcf0d070-d9f2-40aa-8620-cbc004747722';

  let apiKey: { id: string; api_key: string };

  describe('test metadata api status', () => {
    describe('/api/endpoint/metadata when index is not empty', () => {
      beforeEach(async () => {
        await esArchiver.load('endpoint/metadata/endpoint_status_feature');
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
    });
  });
}
