/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { browserAuthFixture, mergeTests } from '@kbn/scout';
import type {
  ElasticsearchRoleDescriptor,
  KibanaRole,
  ScoutTestConfig,
  BrowserAuthFixture,
  SamlAuth,
  ScoutLogger,
  EsClient,
} from '@kbn/scout';
import { roleDescriptorsFixture, RoleDescriptorsFixture } from '../../worker';

export interface SecurityBrowserAuthFixture extends BrowserAuthFixture {
  loginAsPlatformEngineer: () => Promise<void>;
}

export const securityBrowserAuthFixture = mergeTests(
  browserAuthFixture,
  roleDescriptorsFixture
).extend<{
  browserAuth: SecurityBrowserAuthFixture;
}>({
  browserAuth: async (
    {
      browserAuth,
      config,
      esClient,
      roleDescriptors,
      samlAuth,
      log,
    }: {
      browserAuth: BrowserAuthFixture;
      config: ScoutTestConfig;
      esClient: EsClient;
      roleDescriptors: RoleDescriptorsFixture;
      samlAuth: SamlAuth;
      log: ScoutLogger;
    },
    use: (extendedBrowserAuth: SecurityBrowserAuthFixture) => Promise<void>
  ) => {
    let isCustomRoleCreated = false;

    // explicitly overriding to update 'isCustomRoleCreated' flag and pass descriptor to the login method
    const loginWithCustomRole = async (role: KibanaRole | ElasticsearchRoleDescriptor) => {
      await samlAuth.setCustomRole(role);
      isCustomRoleCreated = true;
      return browserAuth.loginAs(samlAuth.customRoleName);
    };

    const loginAsPlatformEngineer = async () => {
      const roleName = 'platform_engineer';
      if (!config.serverless) {
        const roleDesciptor = roleDescriptors.serverless?.get(
          roleName
        ) as ElasticsearchRoleDescriptor;
        if (!roleDesciptor) {
          throw new Error(`No role descriptors found for ${roleName}`);
        }
        log.debug(`Using "${roleName}" role to execute the test`);
        return loginWithCustomRole(roleDesciptor);
      } else {
        return browserAuth.loginAs(roleName);
      }
    };

    await use({
      ...browserAuth,
      loginWithCustomRole,
      loginAsPlatformEngineer,
    });

    if (isCustomRoleCreated) {
      log.debug(`Deleting custom role with name ${samlAuth.customRoleName}`);
      await esClient.security.deleteRole({ name: samlAuth.customRoleName });
    }
  },
});
