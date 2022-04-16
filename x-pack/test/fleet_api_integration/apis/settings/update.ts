/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');
  const esArchiver = getService('esArchiver');

  describe('Settings - update', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    const createdAgentPolicyIds: string[] = [];
    after(async () => {
      const deletedPromises = createdAgentPolicyIds.map((agentPolicyId) =>
        supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
      );
      await Promise.all(deletedPromises);
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it('should explicitly set port on fleet_server_hosts', async function () {
      await supertest
        .put(`/api/fleet/settings`)
        .set('kbn-xsrf', 'xxxx')
        .send({ fleet_server_hosts: ['https://test.fr'] })
        .expect(200);

      const { body: getSettingsRes } = await supertest.get(`/api/fleet/settings`).expect(200);
      expect(getSettingsRes.item.fleet_server_hosts).to.eql(['https://test.fr:443']);
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
        .send({ fleet_server_hosts: ['http://localhost:1232/abc', 'http://localhost:1232/abc'] })
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
        index: AGENT_POLICY_INDEX,
        ignore_unavailable: true,
        body: {
          query: {
            term: {
              policy_id: testPolicyRes.item.id,
            },
          },
        },
      });

      await supertest
        .put(`/api/fleet/settings`)
        .set('kbn-xsrf', 'xxxx')
        .send({ fleet_server_hosts: ['http://localhost:1232/abc', 'http://localhost:1232/abc'] })
        .expect(200);

      const res = await esClient.search({
        index: AGENT_POLICY_INDEX,
        ignore_unavailable: true,
        body: {
          query: {
            term: {
              policy_id: testPolicyRes.item.id,
            },
          },
        },
      });

      expect(res.hits.hits.length).equal(beforeRes.hits.hits.length + 1);
    });
  });
}
