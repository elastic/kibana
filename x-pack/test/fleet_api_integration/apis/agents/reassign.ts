/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet_reassign_agent', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });
    setupFleetAndAgents(providerContext);
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('reassign single agent', () => {
      it('should allow to reassign single agent', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(200);
        const { body } = await supertest.get(`/api/fleet/agents/agent1`);
        expect(body.item.policy_id).to.eql('policy2');
      });

      it('should throw an error for invalid policy id for single reassign', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'INVALID_ID',
          })
          .expect(404);
      });

      it('can reassign from regular agent policy to regular', async () => {
        // policy2 is not hosted
        // reassign succeeds
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(200);
      });

      it('cannot reassign from regular agent policy to hosted', async () => {
        // agent1 is enrolled in policy1. set policy1 to hosted
        await supertest
          .put(`/api/fleet/agent_policies/policy1`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'Test policy', namespace: 'default', is_managed: true })
          .expect(200);

        // reassign fails
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(400);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/162545
    describe.skip('bulk reassign agents', () => {
      it('should allow to reassign multiple agents by id', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(200);
        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent3`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy2');
        expect(agent3data.body.item.policy_id).to.eql('policy2');
      });

      it('should allow to reassign multiple agents by id -- mix valid & invalid', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'INVALID_ID', 'agent3', 'MISSING_ID', 'etc'],
            policy_id: 'policy2',
          });

        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`),
          supertest.get(`/api/fleet/agents/agent3`),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy2');
        expect(agent3data.body.item.policy_id).to.eql('policy2');

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];

        expect(actionStatus.status).to.eql('FAILED');
        expect(actionStatus.nbAgentsActionCreated).to.eql(2);
        expect(actionStatus.nbAgentsFailed).to.eql(3);
      });

      it('should return error when none of the agents can be reassigned -- mixed invalid, hosted, etc', async () => {
        // agent1 is enrolled in policy1. set policy1 to hosted
        await supertest
          .put(`/api/fleet/agent_policies/policy1`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'Test policy', namespace: 'default', is_managed: true })
          .expect(200);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'INVALID_ID', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(400);
        expect(body.message).to.eql('No agents to reassign, already assigned or hosted agents');

        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`),
          supertest.get(`/api/fleet/agents/agent3`),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy1');
        expect(agent3data.body.item.policy_id).to.eql('policy1');
      });

      it('should allow to reassign multiple agents by kuery', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            policy_id: 'policy2',
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
        expect(body.total).to.eql(4);
        body.items.forEach((agent: any) => {
          expect(agent.policy_id).to.eql('policy2');
        });
      });

      it('should bulk reassign multiple agents by kuery in batches', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            policy_id: 'policy2',
            batchSize: 2,
          })
          .expect(200);

        const actionId = body.actionId;

        const verifyActionResult = async () => {
          const { body: result } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
          expect(result.total).to.eql(4);
          result.items.forEach((agent: any) => {
            expect(agent.policy_id).to.eql('policy2');
          });
        };

        await new Promise((resolve, reject) => {
          let attempts = 0;
          const intervalId = setInterval(async () => {
            if (attempts > 5) {
              clearInterval(intervalId);
              reject(new Error('action timed out'));
            }
            ++attempts;
            const {
              body: { items: actionStatuses },
            } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

            const action = actionStatuses.find((a: any) => a.actionId === actionId);
            if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
              clearInterval(intervalId);
              await verifyActionResult();
              resolve({});
            }
          }, 1000);
        }).catch((e) => {
          throw e;
        });
      });

      it('should throw an error for invalid policy id for bulk reassign', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'INVALID_ID',
          })
          .expect(404);
      });

      it('should return a 403 if user lacks fleet all permissions', async () => {
        await supertestWithoutAuth
          .post(`/api/fleet/agents/bulk_reassign`)
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(403);
      });
    });
  });
}
