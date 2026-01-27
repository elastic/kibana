/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getRegistryUrl as getRegistryUrlFromIngest } from '@kbn/fleet-plugin/server';
import { isServerlessKibanaFlavor } from '@kbn/security-solution-plugin/common/endpoint/utils/kibana_status';
import { enableFleetSpaceAwareness } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

export default function endpointAPIIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  // FLAKY: https://github.com/elastic/kibana/issues/249143
  // FLAKY: https://github.com/elastic/kibana/issues/249144
  describe.skip('Endpoint plugin spaces support', function () {
    const ingestManager = getService('ingestManager');
    const rolesUsersProvider = getService('rolesUsersProvider');
    const kbnClient = getService('kibanaServer');
    const log = getService('log');
    const endpointRegistryHelpers = getService('endpointRegistryHelpers');
    const endpointTestResources = getService('endpointTestResources');

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

      // Enable fleet space awareness
      log.info('Enabling Fleet space awareness');
      await enableFleetSpaceAwareness(kbnClient);

      await endpointTestResources.installOrUpgradeEndpointFleetPackage();
    });

    after(async () => {
      if (!(await isServerlessKibanaFlavor(kbnClient))) {
        // delete role/user
        await rolesUsersProvider.deleteUsers(roles);
        await rolesUsersProvider.deleteRoles(roles);
      }
    });

    loadTestFile(require.resolve('./space_awareness'));
    loadTestFile(require.resolve('./artifacts'));
    loadTestFile(require.resolve('./response_actions'));
  });
}
