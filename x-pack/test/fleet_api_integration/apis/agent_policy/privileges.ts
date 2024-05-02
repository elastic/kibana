/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { runPrivilegeTests } from '../../privileges_helpers';
import { setupTestUsers, testUsers } from '../test_users';

const READ_SCENARIOS = [
  {
    user: testUsers.fleet_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_read_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_agent_policies_read_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_agent_policies_all_only,
    statusCode: 200,
  },
  {
    // Expect minimal access
    user: testUsers.fleet_agents_read_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_no_access,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_settings_read_only,
    statusCode: 403,
  },
];

const ALL_SCENARIOS = [
  {
    user: testUsers.fleet_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_agent_policies_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agent_policies_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agents_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_no_access,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_settings_read_only,
    statusCode: 403,
  },
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const ROUTES = [
    {
      method: 'GET',
      path: '/api/fleet/agent_policies',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'GET',
      path: '/api/fleet/agent_policies/policy-test-privileges-1',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'POST',
      path: '/api/fleet/agent_policies',
      scenarios: ALL_SCENARIOS,
      send: {
        id: 'policy-test-privileges-2',
        name: `TEST ${Date.now()}`,
        namespace: 'default',
      },
      afterEach: async () => {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: 'policy-test-privileges-2' });
      },
    },
    {
      method: 'POST',
      path: '/api/fleet/agent_policies/delete',
      send: { agentPolicyId: 'policy-test-privileges-2' },
      scenarios: ALL_SCENARIOS,
      beforeEach: async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .send({
            id: 'policy-test-privileges-2',
            name: `TEST ${Date.now()}`,
            namespace: 'default',
          })
          .set('kbn-xsrf', 'xxxx');
      },
      afterEach: async () => {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: 'policy-test-privileges-2' });
      },
    },
  ];

  describe('fleet_agent_policies_privileges', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'));
    });

    before(async () => {
      await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'policy-test-privileges-1',
          name: `TEST ${Date.now()}`,
          namespace: 'default',
        })
        .expect(200);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
