/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from '@kbn/security-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

type CreateRolePayload = Pick<Role, 'metadata' | 'elasticsearch' | 'kibana'>;

const OBSERVABILITY_TEST_ROLE_NAME = 'observability-functional-test-role';
const HOME_PAGE_SELECTOR = 'homeApp';

export function ObservabilityUsersProvider({ getPageObject, getService }: FtrProviderContext) {
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const commonPageObject = getPageObject('common');

  /**
   * Creates a test role and set it as the test user's role. Performs a page
   * reload to apply the role change, but doesn't require a re-login.
   *
   * @arg roleDefinition - the privileges of the test role
   */
  const setTestUserRole = async (roleDefinition: CreateRolePayload) => {
    // return to neutral grounds to avoid running into permission problems on reload
    await commonPageObject.navigateToActualUrl('home');
    await testSubjects.existOrFail(HOME_PAGE_SELECTOR);

    await security.role.create(OBSERVABILITY_TEST_ROLE_NAME, roleDefinition);

    await security.testUser.setRoles([OBSERVABILITY_TEST_ROLE_NAME]); // performs a page reload
  };

  /**
   * Deletes the test role and restores thedefault test user role. Performs a
   * page reload to apply the role change, but doesn't require a re-login.
   */
  const restoreDefaultTestUserRole = async () => {
    await Promise.all([
      security.role.delete(OBSERVABILITY_TEST_ROLE_NAME),
      security.testUser.restoreDefaults(),
    ]);
  };

  return {
    defineBasicObservabilityRole,
    restoreDefaultTestUserRole,
    setTestUserRole,
  };
}

/**
 * Generates a combination of Elasticsearch and Kibana privileges for given
 * observability features.
 */
const defineBasicObservabilityRole = (
  features: Partial<{
    observabilityCasesV3: string[];
    apm: string[];
    logs: string[];
    infrastructure: string[];
    uptime: string[];
  }>
): CreateRolePayload => {
  return {
    elasticsearch: {
      cluster: ['all'],
      indices: [
        ...((features.logs?.length ?? 0) > 0
          ? [{ names: ['filebeat-*', 'logs-*'], privileges: ['all'] }]
          : []),
        ...((features.infrastructure?.length ?? 0) > 0
          ? [{ names: ['metricbeat-*', 'metrics-*'], privileges: ['all'] }]
          : []),
        ...((features.apm?.length ?? 0) > 0
          ? [
              {
                names: [
                  'apm-*',
                  'logs-apm*',
                  'metrics-apm*',
                  'traces-apm*',
                  'observability-annotations',
                ],
                privileges: ['read', 'view_index_metadata'],
              },
            ]
          : []),
        ...((features.uptime?.length ?? 0) > 0
          ? [{ names: ['heartbeat-*,synthetics-*'], privileges: ['all'] }]
          : []),
      ],
      run_as: [],
    },
    kibana: [
      {
        spaces: ['*'],
        base: [],
        // undefined props yet
        feature: features,
      },
    ],
  };
};
