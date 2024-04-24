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
    user: testUsers.fleet_agents_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_agent_policies_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agent_policies_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agents_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_read_only,
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
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const ROUTES = [
    {
      method: 'GET',
      path: '/internal/fleet/settings/enrollment',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'GET',
      path: '/internal/fleet/settings/enrollment?agentPolicyId=policy1',
      scenarios: READ_SCENARIOS,
    },
  ];

  describe('fleet_enrollment_settings_privileges', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/fleet_server');
      await setupTestUsers(getService('security'));
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
