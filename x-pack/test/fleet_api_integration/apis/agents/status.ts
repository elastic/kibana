/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { testUsers } from '../test_users';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const superTestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet_agents_status', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      await es.create({
        id: 'ingest-agent-policies:policy-inactivity-timeout',
        index: '.kibana',
        refresh: 'wait_for',
        document: {
          type: 'ingest-agent-policies',
          'ingest-agent-policies': {
            name: 'Test policy',
            namespace: 'default',
            description: 'Policy with inactivity timeout',
            status: 'active',
            is_default: true,
            monitoring_enabled: ['logs', 'metrics'],
            revision: 2,
            updated_at: '2020-05-07T19:34:42.533Z',
            updated_by: 'system',
            inactivity_timeout: 60,
          },
          migrationVersion: {
            'ingest-agent-policies': '7.10.0',
          },
        },
      });
      // 2 agents online
      await es.update({
        id: 'agent1',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            policy_revision_idx: 1,
            last_checkin: new Date().toISOString(),
          },
        },
      });
      await es.update({
        id: 'agent2',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            policy_revision_idx: 1,
            last_checkin: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 2m online
          },
        },
      });
      // 1 agents offline
      await es.update({
        id: 'agent3',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            policy_revision_idx: 1,
            last_checkin: new Date(Date.now() - 1000 * 60 * 6).toISOString(), // 6m offline
          },
        },
      });
      // 1 agents inactive
      await es.update({
        id: 'agent4',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        body: {
          doc: {
            policy_id: 'policy-inactivity-timeout',
            policy_revision_idx: 1,
            last_checkin: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
          },
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
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    it('should return the status of agents', async () => {
      const { body: apiResponse } = await supertest.get(`/api/fleet/agent_status`).expect(200);
      expect(apiResponse).to.eql({
        results: {
          events: 0,
          other: 0,
          total: 8,
          online: 2,
          active: 8,
          all: 11,
          error: 2,
          offline: 1,
          updating: 3,
          inactive: 2,
          unenrolled: 1,
        },
      });
    });

    it('should work with deprecated api', async () => {
      await supertest.get(`/api/fleet/agent-status`).expect(200);
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

    it('should not perform inactivity check if there are too many agent policies with inactivity timeout', async () => {
      // the test server is started with --xpack.fleet.developer.maxAgentPoliciesWithInactivityTimeout=10
      // so we create 11 policies with inactivity timeout then no agents should turn inactive

      const policiesToAdd = new Array(11).fill(0).map((_, i) => `policy-inactivity-timeout-${i}`);

      await Promise.all(
        policiesToAdd.map((policyId) =>
          es.create({
            id: 'ingest-agent-policies:' + policyId,
            index: '.kibana',
            refresh: 'wait_for',
            document: {
              type: 'ingest-agent-policies',
              'ingest-agent-policies': {
                name: policyId,
                namespace: 'default',
                description: 'Policy with inactivity timeout',
                status: 'active',
                is_default: true,
                monitoring_enabled: ['logs', 'metrics'],
                revision: 2,
                updated_at: '2020-05-07T19:34:42.533Z',
                updated_by: 'system',
                inactivity_timeout: 60,
              },
              migrationVersion: {
                'ingest-agent-policies': '7.10.0',
              },
            },
          })
        )
      );
      const { body: apiResponse } = await supertest.get(`/api/fleet/agent_status`).expect(200);
      expect(apiResponse).to.eql({
        results: {
          events: 0,
          other: 0,
          total: 10,
          online: 3,
          active: 10,
          all: 11,
          error: 2,
          offline: 1,
          updating: 4,
          inactive: 0,
          unenrolled: 1,
        },
      });
    });
  });
}
