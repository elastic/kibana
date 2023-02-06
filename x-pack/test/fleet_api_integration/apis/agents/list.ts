/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type Agent, FLEET_ELASTIC_AGENT_PACKAGE } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { testUsers } from '../test_users';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');
  let elasticAgentpkgVersion: string;
  describe('fleet_list_agent', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      const getPkRes = await supertest
        .get(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      elasticAgentpkgVersion = getPkRes.body.item.version;
      // Install latest version of the package
      await supertest
        .post(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${elasticAgentpkgVersion}`)
        .send({
          force: true,
        })
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await supertest
        .delete(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${elasticAgentpkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
      await es.transport.request({
        method: 'DELETE',
        path: `/_data_stream/metrics-elastic_agent.elastic_agent-default`,
      });
    });

    it.skip('should return a 200 if a user with the fleet all try to access the list', async () => {
      await supertest
        .get(`/api/fleet/agents`)
        .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
        .expect(200);
    });

    it('should not return the list of agents when requesting as a user without fleet permissions', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/agents`)
        .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
        .expect(403);
    });

    it('should return the list of agents when requesting as admin', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);

      expect(apiResponse).to.have.keys('page', 'total', 'items', 'list');
      expect(apiResponse.total).to.eql(4);
    });

    it('should return the list of agents when requesting as a user with fleet read permissions', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);
      expect(apiResponse).to.have.keys('page', 'total', 'items', 'list');
      expect(apiResponse.total).to.eql(4);
    });

    it('should return a 400 when given an invalid "kuery" value', async () => {
      await supertest.get(`/api/fleet/agents?kuery=.test%3A`).expect(400);
    });

    it('should return a 200 and an empty list when given a "kuery" value with a missing saved object type', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?kuery=m`) // missing saved object type
        .expect(200);
      expect(apiResponse.total).to.eql(0);
    });

    it('should accept a valid "kuery" value', async () => {
      const filter = encodeURIComponent('fleet-agents.access_api_key_id : "api-key-2"');
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?kuery=${filter}`)
        .expect(200);

      expect(apiResponse.total).to.eql(1);
      const agent = apiResponse.items[0];
      expect(agent.access_api_key_id).to.eql('api-key-2');
    });

    it('should return a 200 when given sort options', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?sortField=last_checkin&sortOrder=desc`)
        .expect(200);
      expect(apiResponse.items.map((agent: { id: string }) => agent.id)).to.eql([
        'agent4',
        'agent3',
        'agent2',
        'agent1',
      ]);
    });

    it('should return agents in enrolled_at and hostname order when default sort options and same enrollment time', async () => {
      let { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);
      expect(apiResponse.items.map((agent: { id: string }) => agent.id)).to.eql([
        'agent4',
        'agent1',
        'agent2',
        'agent3',
      ]);

      ({ body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200));
      expect(apiResponse.items.map((agent: { id: string }) => agent.id)).to.eql([
        'agent4',
        'agent1',
        'agent2',
        'agent3',
      ]);
    });

    it('should return tags of all agents', async () => {
      const { body: apiResponse } = await supertest.get('/api/fleet/agents/tags').expect(200);
      expect(apiResponse.items).to.eql(['existingTag', 'tag1']);
    });

    it('should return metrics if available and called with withMetrics', async () => {
      const now = Date.now();
      await es.index({
        index: 'metrics-elastic_agent.elastic_agent-default',
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date(now - 2 * 60 * 1000).toISOString(),
          data_stream: {
            namespace: 'default',
            type: 'metrics',
            dataset: 'elastic_agent.elastic_agent',
          },
          elastic_agent: { id: 'agent1', process: 'elastic_agent' },
          system: {
            process: {
              memory: {
                size: 25510920,
              },
              cpu: {
                total: {
                  value: 500,
                },
              },
            },
          },
        },
      });
      await es.index({
        index: 'metrics-elastic_agent.elastic_agent-default',
        refresh: 'wait_for',
        document: {
          '@timestamp': new Date(now - 1 * 60 * 1000).toISOString(),
          elastic_agent: { id: 'agent1', process: 'elastic_agent' },
          data_stream: {
            namespace: 'default',
            type: 'metrics',
            dataset: 'elastic_agent.elastic_agent',
          },
          system: {
            process: {
              memory: {
                size: 25510920,
              },
              cpu: {
                total: {
                  value: 1500,
                },
              },
            },
          },
        },
      });

      const { body: apiResponse } = await supertest
        .get(`/api/fleet/agents?withMetrics=true`)
        .expect(200);

      expect(apiResponse).to.have.keys('page', 'total', 'items', 'list');
      expect(apiResponse.total).to.eql(4);

      const agent1: Agent = apiResponse.items.find((agent: any) => agent.id === 'agent1');

      expect(agent1.metrics?.memory_size_byte_avg).to.eql('25510920');
      expect(agent1.metrics?.cpu_avg).to.eql('0.0166');

      const agent2: Agent = apiResponse.items.find((agent: any) => agent.id === 'agent2');
      expect(agent2.metrics?.memory_size_byte_avg).equal(undefined);
      expect(agent2.metrics?.cpu_avg).equal(undefined);
    });

    it('should return a status summary if getStatusSummary provided', async () => {
      const { body: apiResponse } = await supertest
        .get('/api/fleet/agents?getStatusSummary=true&perPage=0')
        .expect(200);

      expect(apiResponse.items).to.eql([]);

      expect(apiResponse.statusSummary).to.eql({
        degraded: 0,
        enrolling: 0,
        error: 0,
        inactive: 0,
        offline: 4,
        online: 0,
        unenrolled: 0,
        unenrolling: 0,
        updating: 0,
      });
    });
  });
}
