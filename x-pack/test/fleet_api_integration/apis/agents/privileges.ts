/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_ELASTIC_AGENT_PACKAGE, AGENTS_INDEX } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { runPrivilegeTests } from '../../privileges_helpers';
import { testUsers } from '../test_users';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');
  let elasticAgentpkgVersion: string;

  describe('fleet_agents_api_privileges', () => {
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
      await es.transport
        .request({
          method: 'DELETE',
          path: `/_data_stream/metrics-elastic_agent.elastic_agent-default`,
        })
        .catch(() => {});
    });

    const READ_SCENARIOS = [
      {
        user: testUsers.fleet_all_only,
        expect: 200,
      },
      {
        user: testUsers.fleet_read_only,
        expect: 200,
      },
      {
        user: testUsers.fleet_agents_read_only,
        expect: 200,
      },
      {
        user: testUsers.fleet_no_access,
        expect: 403,
      },
      {
        user: testUsers.fleet_minimal_all_only,
        expect: 403,
      },
      {
        user: testUsers.fleet_minimal_read_only,
        expect: 403,
      },
      {
        user: testUsers.fleet_settings_read_only,
        expect: 403,
      },
    ];

    const ALL_SCENARIOS = [
      {
        user: testUsers.fleet_all_only,
        expect: 200,
      },
      {
        user: testUsers.fleet_agents_all_only,
        expect: 200,
      },
      {
        user: testUsers.fleet_agents_read_only,
        expect: 403,
      },
      {
        user: testUsers.fleet_read_only,
        expect: 403,
      },
      {
        user: testUsers.fleet_no_access,
        expect: 403,
      },
      {
        user: testUsers.fleet_minimal_all_only,
        expect: 403,
      },
      {
        user: testUsers.fleet_minimal_read_only,
        expect: 403,
      },
      {
        user: testUsers.fleet_settings_read_only,
        expect: 403,
      },
    ];

    let agentDoc: any;

    const ROUTES = [
      // READ scenarios
      {
        method: 'GET',
        path: '/api/fleet/agents',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agent-status',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agents/action_status',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agents/agent1',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'POST',
        path: '/api/fleet/agents/agent1/request_diagnostics',
        scenarios: READ_SCENARIOS,
      },

      // ALL scenarios
      {
        method: 'PUT',
        path: '/api/fleet/agents/agent1',
        scenarios: ALL_SCENARIOS,
        send: {
          tags: ['tag1'],
        },
      },
      {
        method: 'POST',
        path: '/api/fleet/agents/agent1/unenroll',
        scenarios: ALL_SCENARIOS,
      },
      {
        method: 'DELETE',
        path: '/api/fleet/agents/agent1',
        scenarios: ALL_SCENARIOS,
        beforeEach: async () => {
          const res = await es.get({
            id: 'agent1',
            index: AGENTS_INDEX,
          });
          agentDoc = res._source;
        },
        afterEach: async () => {
          await es.update({
            id: 'agent1',
            refresh: 'wait_for',
            index: AGENTS_INDEX,
            doc_as_upsert: true,
            doc: agentDoc,
          });
        },
      },
    ];

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
