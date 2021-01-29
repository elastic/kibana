/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Client } from 'elasticsearch';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esClient: Client = getService('legacyEs');

  describe('Settings - update', async function () {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    const createdAgentPolicyIds: string[] = [];
    after(async () => {
      const deletedPromises = createdAgentPolicyIds.map((agentPolicyId) =>
        supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200)
      );
      await Promise.all(deletedPromises);
    });
    it("should bump all agent policy's revision", async function () {
      const { body: testPolicy1PostRes } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'test 1',
          description: '',
          namespace: 'default',
        });
      createdAgentPolicyIds.push(testPolicy1PostRes.item.id);

      const { body: testPolicy2PostRes } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'test2',
          description: '',
          namespace: 'default',
        });
      createdAgentPolicyIds.push(testPolicy2PostRes.item.id);

      await supertest
        .put(`/api/fleet/settings`)
        .set('kbn-xsrf', 'xxxx')
        .send({ kibana_urls: ['http://localhost:1232/abc', 'http://localhost:1232/abc'] })
        .expect(200);

      const getTestPolicy1Res = await kibanaServer.savedObjects.get({
        type: 'ingest-agent-policies',
        id: testPolicy1PostRes.item.id,
      });
      const getTestPolicy2Res = await kibanaServer.savedObjects.get({
        type: 'ingest-agent-policies',
        id: testPolicy2PostRes.item.id,
      });
      expect(getTestPolicy1Res.attributes.revision).equal(2);
      expect(getTestPolicy2Res.attributes.revision).equal(2);
    });

    it('should create agent actions', async function () {
      const { body: testPolicyRes } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'test',
          description: '',
          namespace: 'default',
        });
      createdAgentPolicyIds.push(testPolicyRes.item.id);

      const beforeRes = await esClient.search({
        index: '.kibana',
        body: {
          query: {
            bool: {
              must: [
                {
                  terms: {
                    type: ['fleet-agent-actions'],
                  },
                },
                { match: { 'fleet-agent-actions.policy_id': testPolicyRes.item.id } },
              ],
            },
          },
        },
      });

      await supertest
        .put(`/api/fleet/settings`)
        .set('kbn-xsrf', 'xxxx')
        .send({ kibana_urls: ['http://localhost:1232/abc', 'http://localhost:1232/abc'] })
        .expect(200);

      const res = await esClient.search({
        index: '.kibana',
        body: {
          query: {
            bool: {
              must: [
                {
                  terms: {
                    type: ['fleet-agent-actions'],
                  },
                },
                { match: { 'fleet-agent-actions.policy_id': testPolicyRes.item.id } },
              ],
            },
          },
        },
      });

      expect(res.hits.hits.length).equal(beforeRes.hits.hits.length + 1);
    });
  });
}
