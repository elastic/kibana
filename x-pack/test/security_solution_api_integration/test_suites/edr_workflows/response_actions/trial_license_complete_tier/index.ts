/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/common/endpoint/utils/kibana_status';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('Endpoint plugin', function () {
    const ingestManager = getService('ingestManager');
    const rolesUsersProvider = getService('rolesUsersProvider');
    const kbnClient = getService('kibanaServer');
    const log = getService('log');
    const endpointRegistryHelpers = getService('endpointRegistryHelpers');

    const roles = Object.values(ROLE);
    before(async () => {
      if (!endpointRegistryHelpers.isRegistryEnabled()) {
        log.warning('These tests are being run with an external package registry');
      }

      const registryUrl =
        endpointRegistryHelpers.getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
      log.info(`Package registry URL for tests: ${registryUrl}`);
      try {
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

    loadTestFile(require.resolve('./agent_type_support'));
    loadTestFile(require.resolve('./execute'));
  });
}
