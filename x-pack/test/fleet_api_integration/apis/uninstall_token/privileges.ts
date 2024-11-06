/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { runPrivilegeTests } from '../../privileges_helpers';
import { testUsers } from '../test_users';
import { generateNAgentPolicies } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_uninstall_token_privileges', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await generateNAgentPolicies(supertest, 2);
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    skipIfNoDockerRegistry(providerContext);

    const SCENARIOS = [
      {
        user: testUsers.fleet_all_only,
        statusCode: 200,
      },
      {
        user: testUsers.fleet_agents_all_only,
        statusCode: 200,
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

    const ROUTES = [
      {
        method: 'GET',
        path: '/api/fleet/uninstall_tokens',
        scenarios: SCENARIOS,
      },
    ];
    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
