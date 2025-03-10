/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type Agent, FLEET_ELASTIC_AGENT_PACKAGE, AGENTS_INDEX } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
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
      try {
        await es.transport.request({
          method: 'DELETE',
          path: `/_data_stream/metrics-elastic_agent.elastic_agent-default`,
        });
      } catch (e) {
        // ignore
      }
    });

    it('should return the list of agents when requesting as admin', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agents`).expect(200);

      expect(apiResponse).to.have.keys('page', 'total', 'items');
      expect(apiResponse.total).to.eql(4);
    });

    it('should return 200 if the passed kuery is valid', async () => {
      await supertest
        .get(`/api/fleet/agents?kuery=fleet-agents.local_metadata.host.hostname:test`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('should return 200 also if the passed kuery does not have prefix fleet-agents', async () => {
      await supertest
        .get(`/api/fleet/agents?kuery=local_metadata.host.hostname:test`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('with enableStrictKQLValidation should return a 400 when given an invalid "kuery" value', async () => {
      await supertest.get(`/api/fleet/agents?kuery='test%3A'`).expect(400);
    });

    it('with enableStrictKQLValidation should return 400 if passed kuery has non existing parameters', async () => {
      await supertest
        .get(`/api/fleet/agents?kuery=fleet-agents.non_existent_parameter:healthy`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
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
          component: { id: 'component1' },
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
          component: { id: 'component2' },
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

      expect(apiResponse).to.have.keys('page', 'total', 'items');
      expect(apiResponse.total).to.eql(4);

      const agent1: Agent = apiResponse.items.find((agent: any) => agent.id === 'agent1');

      expect(agent1.metrics?.memory_size_byte_avg).to.eql('25510920');
      expect(agent1.metrics?.cpu_avg).to.eql('0.01666');

      const agent2: Agent = apiResponse.items.find((agent: any) => agent.id === 'agent2');
      expect(agent2.metrics?.memory_size_byte_avg).equal(undefined);
      expect(agent2.metrics?.cpu_avg).equal(undefined);
    });

    it('should return a status summary if getStatusSummary provided', async () => {
      const { body: apiResponse } = await supertest
        .get('/api/fleet/agents?getStatusSummary=true&perPage=0')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(apiResponse.items).to.eql([]);

      expect(apiResponse.statusSummary).to.eql({
        degraded: 0,
        enrolling: 0,
        error: 0,
        inactive: 0,
        offline: 4,
        online: 0,
        orphaned: 0,
        unenrolled: 0,
        unenrolling: 0,
        updating: 0,
        uninstalled: 0,
      });
    });

    it('should return correct status summary if showUpgradeable is provided', async () => {
      await es.update({
        id: 'agent1',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_revision_idx: 1,
          last_checkin: new Date().toISOString(),
          status: 'online',
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      // 1 agent inactive
      await es.update({
        id: 'agent4',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_id: 'policy-inactivity-timeout',
          policy_revision_idx: 1,
          last_checkin: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
          status: 'online',
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });

      const { body: apiResponse } = await supertest
        .get('/api/fleet/agents?getStatusSummary=true&perPage=5&showUpgradeable=true')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(apiResponse.statusSummary).to.eql({
        degraded: 0,
        enrolling: 0,
        error: 0,
        inactive: 0,
        offline: 0,
        online: 2,
        orphaned: 0,
        unenrolled: 0,
        unenrolling: 0,
        updating: 0,
        uninstalled: 0,
      });
    });

    describe('advanced search params', () => {
      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      });

      it('should return correct results with searchAfter parameter', async () => {
        const { body: apiResponse } = await supertest.get(
          '/api/fleet/agents?perPage=1&sortField=agent.id&sortOrder=desc'
        );
        expect(apiResponse.page).to.eql(1);
        expect(apiResponse.nextSearchAfter).to.eql(JSON.stringify(apiResponse.items[0].sort));
        expect(apiResponse.items.map(({ agent }: any) => agent.id)).to.eql(['agent4']);

        const { body: apiResponse2 } = await supertest
          .get(
            `/api/fleet/agents?perPage=2&sortField=agent.id&sortOrder=desc&searchAfter=${apiResponse.nextSearchAfter}`
          )
          .expect(200);

        expect(apiResponse2.page).to.eql(0);
        expect(apiResponse2.nextSearchAfter).to.eql(JSON.stringify(apiResponse2.items[1].sort));
        expect(apiResponse2.items.map(({ agent }: any) => agent.id)).to.eql(['agent3', 'agent2']);
      });

      it('should return a pit ID when openPit is true', async () => {
        const { body: apiResponse } = await supertest
          .get('/api/fleet/agents?perPage=1&openPit=true&pitKeepAlive=1s')
          .expect(200);

        expect(apiResponse).to.have.keys('page', 'total', 'items', 'pit');
        expect(apiResponse.items.length).to.eql(1);
        expect(apiResponse.pit).to.be.a('string');
        expect(apiResponse.nextSearchAfter).to.eql(JSON.stringify(apiResponse.items[0].sort));
      });

      it('should use pit to return correct results', async () => {
        const { body: apiResponse } = await supertest
          .get(
            '/api/fleet/agents?perPage=1&sortField=agent.id&sortOrder=desc&openPit=true&pitKeepAlive=1m'
          )
          .expect(200);

        expect(apiResponse.pit).to.be.a('string');
        expect(apiResponse.nextSearchAfter).to.eql(JSON.stringify(apiResponse.items[0].sort));
        expect(apiResponse.items.map(({ agent }: any) => agent.id)).to.eql(['agent4']);

        // update ES document to change the order by changing agent.id of agent2 to agent9
        await es.transport.request({
          method: 'POST',
          path: `/.fleet-agents/_update/agent2`,
          body: {
            doc: { agent: { id: 'agent9' } },
          },
        });
        await es.transport.request({
          method: 'POST',
          path: `/.fleet-agents/_refresh`,
        });

        // check that non-pit query returns the new order
        // new order is [agent9, agent4, agent3, agent1]
        const { body: apiResponse2 } = await supertest
          .get(`/api/fleet/agents?sortField=agent.id&sortOrder=desc`)
          .expect(200);
        expect(apiResponse2.items.map(({ agent }: any) => agent.id)).to.eql([
          'agent9',
          'agent4',
          'agent3',
          'agent1',
        ]);

        // check that the pit query returns the old order
        // old order saved by PIT is [agent4, agent3, agent2, agent1]
        const { body: apiResponse3 } = await supertest
          .get(
            `/api/fleet/agents?perPage=2&sortField=agent.id&sortOrder=desc&searchAfter=${apiResponse.nextSearchAfter}&pitId=${apiResponse.pit}&pitKeepAlive=1m`
          )
          .expect(200);
        expect(apiResponse3.items.map(({ agent }: any) => agent.id)).to.eql(['agent3', 'agent2']);
        expect(apiResponse3.nextSearchAfter).to.eql(JSON.stringify(apiResponse3.items[1].sort));
      });
    });
  });
}
