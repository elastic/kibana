/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/scripts/endpoint/common/stack_services';
import { FtrProviderContext } from '../ftr_provider_context';
import { getRegistryUrlFromTestEnv, isRegistryEnabled } from '../registry';
import { ROLE } from '../services/roles_users';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  describe('Endpoint plugin', function () {
    const ingestManager = getService('ingestManager');
    const rolesUsersProvider = getService('rolesUsersProvider');
    const kbnClient = getService('kibanaServer');
    const log = getService('log');

    if (!isRegistryEnabled()) {
      log.warning('These tests are being run with an external package registry');
    }

    const registryUrl = getRegistryUrlFromTestEnv() ?? getRegistryUrlFromIngest();
    log.info(`Package registry URL for tests: ${registryUrl}`);

    const roles = Object.values(ROLE);
    before(async () => {
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

    loadTestFile(require.resolve('./resolver'));
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./policy'));
    loadTestFile(require.resolve('./package'));
    loadTestFile(require.resolve('./endpoint_authz'));
    loadTestFile(require.resolve('./endpoint_response_actions/execute'));
    loadTestFile(require.resolve('./endpoint_response_actions/agent_type_support'));
    loadTestFile(require.resolve('./endpoint_artifacts/trusted_apps'));
    loadTestFile(require.resolve('./endpoint_artifacts/event_filters'));
    loadTestFile(require.resolve('./endpoint_artifacts/host_isolation_exceptions'));
    loadTestFile(require.resolve('./endpoint_artifacts/blocklists'));
  });
}
