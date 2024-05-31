/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { runPrivilegeTests } from '../../privileges_helpers';
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');

  describe('fleet_enrollment_api_keys_privileges', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

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

    let enrollmentKeyId = '';

    const ROUTES = [
      {
        method: 'GET',
        path: '/api/fleet/enrollment_api_keys',
        scenarios: SCENARIOS,
      },
      {
        method: 'POST',
        path: '/api/fleet/enrollment_api_keys',
        scenarios: SCENARIOS,
        send: {
          policy_id: 'policy1',
        },
      },
      {
        method: 'DELETE',
        path: () => `/api/fleet/enrollment_api_keys/${enrollmentKeyId}`,
        scenarios: SCENARIOS,
        send: {
          policy_id: 'policy1',
        },
        beforeEach: async () => {
          const { body: apiResponse } = await supertest
            .post(`/api/fleet/enrollment_api_keys`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_id: 'policy1',
            })
            .expect(200);
          enrollmentKeyId = apiResponse.item.id;
        },
      },
    ];
    before(async () => {});
    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
