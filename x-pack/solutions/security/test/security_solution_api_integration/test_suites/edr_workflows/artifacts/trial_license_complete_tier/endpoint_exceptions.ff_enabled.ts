/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/common/endpoint/utils/kibana_status';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

/** This is a TEMPORARY test wrapper created to perform Endpoint Exceptions related API tests with
 * the feature flag `endpointExceptionsMovedUnderManagement` enabled.
 *
 * Once Endpoint Exceptions are fully moved under management and the feature flag is removed,
 * this config file should be deleted.
 */
export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  // FLAKY: https://github.com/elastic/kibana/issues/250470
  describe.skip('Endpoint Exceptions with feature flag enabled', function () {
    const ingestManager = getService('ingestManager');
    const rolesUsersProvider = getService('rolesUsersProvider');
    const kbnClient = getService('kibanaServer');
    const log = getService('log');
    const endpointRegistryHelpers = getService('endpointRegistryHelpers');

    const roles = Object.values(ROLE);
    before(async () => {
      try {
        if (!endpointRegistryHelpers.isRegistryEnabled()) {
          log.warning('These tests are being run with an external package registry');
        }

        const registryUrl =
          endpointRegistryHelpers.getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
        log.info(`Package registry URL for tests: ${registryUrl}`);
        await ingestManager.setup();
      } catch (err) {
        log.warning(`Error setting up ingestManager: ${err}`);
      }

      if (!(await isServerlessKibanaFlavor(kbnClient))) {
        // create role/user
        for (const role of roles) {
          await rolesUsersProvider.createRole({ predefinedRole: role });
          await rolesUsersProvider.createUser({ name: role, roles: [role] });
        }
      }
    });

    after(async () => {
      if (!(await isServerlessKibanaFlavor(kbnClient))) {
        // delete role/user
        await rolesUsersProvider.deleteUsers(roles);
        await rolesUsersProvider.deleteRoles(roles);
      }
    });

    loadTestFile(require.resolve('./endpoint_exceptions'));
    loadTestFile(require.resolve('./endpoint_list_api_rbac'));
  });
}
