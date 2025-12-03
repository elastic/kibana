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
} from '@kbn/scout';
import type { RoleDescriptorsFixture } from '../../worker';
import { roleDescriptorsFixture } from '../../worker';

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
      roleDescriptors,
      samlAuth,
      log,
    }: {
      browserAuth: BrowserAuthFixture;
      config: ScoutTestConfig;
      roleDescriptors: RoleDescriptorsFixture;
      samlAuth: SamlAuth;
      log: ScoutLogger;
    },
    use: (extendedBrowserAuth: SecurityBrowserAuthFixture) => Promise<void>
  ) => {
    const loginWithCustomRole = async (role: KibanaRole | ElasticsearchRoleDescriptor) => {
      await samlAuth.setCustomRole(role);
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
  },
});
