/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { testUsers } from '../test_users';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const superTestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet_agents_status', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'policy-inactivity-timeout',
          name: 'Test policy inactivity timeout',
          namespace: 'default',
          description: 'Policy with inactivity timeout',
          is_default: true,
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 60,
        })
        .expect(200);
      // 2 agents online
      await es.update({
        id: 'agent1',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_revision_idx: 1,
          last_checkin: new Date().toISOString(),
        },
      });
      await es.update({
        id: 'agent2',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_revision_idx: 1,
          last_checkin: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 2m online
        },
      });
      // 1 agents offline
      await es.update({
        id: 'agent3',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_revision_idx: 1,
          last_checkin: new Date(Date.now() - 1000 * 60 * 6).toISOString(), // 6m offline
        },
      });
      // 1 agents inactive
      await es.update({
        id: 'agent4',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_id: 'policy-inactivity-timeout',
          policy_base_id: 'policy-inactivity-timeout',
          policy_revision_idx: 1,
          last_checkin: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
        },
      });
      // 1 agents inactive through enrolled_at as no last_checkin
      await es.create({
        id: 'agent5',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy-inactivity-timeout',
          type: 'PERMANENT',
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
        },
      });

      // 1 agent upgrading
      await es.create({
        id: 'agent6',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          policy_revision_idx: 1,
          last_checkin: new Date().toISOString(),
          upgrade_started_at: new Date().toISOString(),
        },
      });
      // 1 agent reassigned to a new policy
      await es.create({
        id: 'agent7',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy1',
          type: 'PERMANENT',
          local_metadata: { host: { hostname: 'host5' } },
          user_provided_metadata: {},
          enrolled_at: '2022-06-21T12:17:25Z',
          last_checkin: new Date().toISOString(),
          policy_revision_idx: null,
        },
      });

      // 1 agent unenrolled
      await es.create({
        id: 'agent8',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: false,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy1',
          type: 'PERMANENT',
          policy_revision_idx: 1,
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: '2022-06-21T12:17:25Z',
          unenrolled_at: '2022-06-21T12:29:29Z',
          last_checkin: '2022-06-27T12:29:29Z',
        },
      });
      // 1 agent error
      await es.create({
        id: 'agent9',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy1',
          type: 'PERMANENT',
          policy_revision_idx: 1,
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: '2022-06-21T12:17:25Z',
          last_checkin: new Date().toISOString(),
          last_checkin_status: 'ERROR',
        },
      });
      // 1 agent degraded (error category)
      await es.create({
        id: 'agent10',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy1',
          type: 'PERMANENT',
          policy_revision_idx: 1,
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: '2022-06-21T12:17:25Z',
          last_checkin: new Date().toISOString(),
          last_checkin_status: 'DEGRADED',
        },
      });
      // 1 agent enrolling, no last_checkin yet
      await es.create({
        id: 'agent11',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy-inactivity-timeout',
          type: 'PERMANENT',
          policy_revision_idx: 1,
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: new Date().toISOString(),
        },
      });
      // 1 uninstalled agent
      await es.create({
        id: 'agent12',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy-inactivity-timeout',
          type: 'PERMANENT',
          policy_revision_idx: 1,
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: new Date().toISOString(),
          audit_unenrolled_reason: 'uninstall',
        },
      });
      // 1 orphaned agent
      await es.create({
        id: 'agent13',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy-inactivity-timeout',
          type: 'PERMANENT',
          policy_revision_idx: 1,
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: new Date().toISOString(),
          audit_unenrolled_reason: 'orphaned',
        },
      });
    });
    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
    });

    it('should return the status of agents', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agent_status`).expect(200);
      expect(apiResponse).to.eql({
        results: {
          events: 0,
          other: 0,
          online: 2,
          active: 10,
          all: 13,
          error: 2,
          offline: 1,
          updating: 3,
          inactive: 2,
          unenrolled: 1,
          orphaned: 1,
          uninstalled: 1,
        },
      });
    });

    it('should work with adequate package privileges', async () => {
      await superTestWithoutAuth
        .get(`/api/fleet/agent_status`)
        .set('kbn-xsrf', 'xxxx')
        .auth(
          testUsers.endpoint_fleet_all_integr_read_policy.username,
          testUsers.endpoint_fleet_all_integr_read_policy.password
        )
        .expect(200);
    });

    it('should not work without adequate package privileges', async () => {
      await superTestWithoutAuth
        .get(`/api/fleet/agent_status`)
        .set('kbn-xsrf', 'xxxx')
        .auth(
          testUsers.endpoint_fleet_read_integr_none.username,
          testUsers.endpoint_fleet_read_integr_none.password
        )
        .expect(403, {
          error: 'Forbidden',
          message: 'Forbidden',
          statusCode: 403,
        });
    });

    it('should still mark agents as inactive with more agent policies with inactivity timeout than the previous limit', async function () {
      // Policy ids used to be written in the status script source, which Elasticsearch limits to 64KB
      // (~1,600 policies). They are now script params so there is no limit on the number of policies.
      this.timeout(15 * 60 * 1000);

      // agent4 and agent5 are on a policy with a 1 minute inactivity timeout and are already inactive,
      // they can only stay inactive. The other fixtures can change status while the policies are
      // created (for example agents that are not inactive yet), so they are not asserted on.
      const getInactiveAgentIds = async (): Promise<string[]> => {
        const { body } = await supertest
          .get(
            `/api/fleet/agents?showInactive=true&perPage=100&kuery=${encodeURIComponent(
              'status:inactive'
            )}`
          )
          .expect(200);
        return body.items.map((agent: { id: string }) => agent.id);
      };

      const CHUNK_SIZE = 50;
      const inChunks = (ids: string[]): string[][] => {
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          chunks.push(ids.slice(i, i + CHUNK_SIZE));
        }
        return chunks;
      };

      const inactiveBefore = await getInactiveAgentIds();
      expect(inactiveBefore).to.contain('agent4');
      expect(inactiveBefore).to.contain('agent5');

      const policyIds = new Array(1700).fill(0).map((_, i) => `policy-inactivity-timeout-${i}`);
      // every policy that a create request was sent for, including the ones whose request failed or
      // did not finish before an error: the policy may still have been created
      const attemptedPolicyIds: string[] = [];

      const createPolicies = async () => {
        for (const chunk of inChunks(policyIds)) {
          attemptedPolicyIds.push(...chunk);
          // wait for all the requests of the chunk to finish, so that none is still running when the
          // cleanup starts, then fail if any of them failed
          const results = await Promise.allSettled(
            chunk.map((policyId) =>
              supertest
                .post(`/api/fleet/agent_policies`)
                .set('kbn-xsrf', 'xxxx')
                .send({
                  id: policyId,
                  name: policyId,
                  namespace: 'default',
                  inactivity_timeout: 60,
                })
                .expect(200)
            )
          );
          const failed = results.find(
            (result): result is PromiseRejectedResult => result.status === 'rejected'
          );
          if (failed) {
            throw failed.reason;
          }
        }
      };

      // returns the ids of the policies that could not be deleted
      const deletePolicies = async (): Promise<string[]> => {
        const notDeleted: string[] = [];
        for (const chunk of inChunks(attemptedPolicyIds)) {
          const results = await Promise.allSettled(
            chunk.map((policyId) =>
              supertest
                .post(`/api/fleet/agent_policies/delete`)
                .set('kbn-xsrf', 'xxxx')
                .send({ agentPolicyId: policyId })
            )
          );
          results.forEach((result, index) => {
            // a policy that does not exist (404) was not created or is already deleted
            if (
              result.status === 'rejected' ||
              (result.value.status !== 200 && result.value.status !== 404)
            ) {
              notDeleted.push(chunk[index]);
            }
          });
        }
        return notDeleted;
      };

      let testError: unknown;
      try {
        await createPolicies();

        const inactiveAfter = await getInactiveAgentIds();
        expect(inactiveAfter).to.contain('agent4');
        expect(inactiveAfter).to.contain('agent5');
      } catch (error) {
        testError = error;
      }

      // do not leave 1,700 policies behind for the tests that run after this one
      const notDeleted = await deletePolicies();
      if (testError) {
        throw testError;
      }
      expect(notDeleted).to.eql([]);
    });

    it('should get a list of agent policies by kuery', async () => {
      await supertest
        .get(`/api/fleet/agent_status?kuery=fleet-agents.status:healthy`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'TEST',
          namespace: 'default',
        })
        .expect(200);
    });

    it('should return 200 also if the kuery does not have prefix fleet-agents', async () => {
      await supertest
        .get(`/api/fleet/agent_status?kuery=status:unhealthy`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('with enableStrictKQLValidation should return 400 if passed kuery has non existing parameters', async () => {
      await supertest
        .get(`/api/fleet/agent_status?kuery=fleet-agents.non_existent_parameter:healthy`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
    });

    it('with enableStrictKQLValidation should return 400 if passed kuery is not correct', async () => {
      await supertest
        .get(`/api/fleet/agent_status?kuery='test%3A'`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
    });

    it('should return incoming data status for specified agents', async () => {
      // force install the system package to override package verification
      await supertest
        .post(`/api/fleet/epm/packages/system/1.50.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      await es.create({
        refresh: 'wait_for',
        index: 'logs-system.system-default',
        id: uuidv4(),
        body: {
          agent: {
            id: 'agent1',
          },
          '@timestamp': new Date().toISOString(),
          data_stream: {
            dataset: 'system.system',
            namespace: 'default',
            type: 'logs',
          },
        },
      });
      await es.create({
        refresh: 'wait_for',
        index: 'logs-system.system-default',
        id: uuidv4(),
        body: {
          agent: {
            id: 'agent2',
          },
          '@timestamp': new Date().toISOString(),
          data_stream: {
            dataset: 'system.system',
            namespace: 'default',
            type: 'logs',
          },
        },
      });

      const { body: apiResponse1 } = await supertest
        .get(`/api/fleet/agent_status/data?agentsIds=agent1&agentsIds=agent2`)
        .expect(200);
      const { body: apiResponse2 } = await supertest
        .get(
          `/api/fleet/agent_status/data?agentsIds=agent1&agentsIds=agent2&pkgName=system&pkgVersion=1.50.0`
        )
        .expect(200);
      expect(apiResponse1).to.eql({
        items: [{ agent1: { data: true } }, { agent2: { data: true } }],
        dataPreview: [],
      });
      expect(apiResponse2).to.eql({
        items: [{ agent1: { data: true } }, { agent2: { data: true } }],
        dataPreview: [],
      });

      // clean up test data
      await es.deleteByQuery({
        index: 'logs-system.system-default',
        query: {
          bool: {
            filter: {
              terms: {
                'agent.id': ['agent1', 'agent2'],
              },
            },
          },
        },
      });
    });
  });
}
