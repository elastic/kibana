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
  loginAsT1Analyst: () => Promise<void>;
  loginAsSecurityRole: (roleName: string) => Promise<void>;
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

    const loginWithServerlessRoleDescriptor = async (roleName: string) => {
      const roleDescriptor = roleDescriptors.serverless?.get(
        roleName
      ) as ElasticsearchRoleDescriptor;
      if (!roleDescriptor) {
        throw new Error(`No role descriptors found for ${roleName}`);
      }
      log.debug(`Using "${roleName}" role to execute the test`);
      return loginWithCustomRole(roleDescriptor);
    };

    const isCloudUserMissing = (error: unknown): boolean =>
      error instanceof Error && /^User with '.+' role is not defined$/.test(error.message);

    const loginAsSecurityRole = async (roleName: string) => {
      if (!config.serverless) {
        return loginWithServerlessRoleDescriptor(roleName);
      }

      try {
        return await browserAuth.loginAs(roleName);
      } catch (error) {
        // Cloud SAML only has users listed in .ftr/role_users.json. Appex QA
        // typically provisions admin/editor/viewer plus custom_role_worker_N,
        // not every Security reserved role (e.g. endpoint_policy_manager).
        if (!(config.isCloud && isCloudUserMissing(error))) {
          throw error;
        }
        log.debug(
          `No Cloud user for "${roleName}"; applying the serverless role descriptor as a custom role`
        );
        return loginWithServerlessRoleDescriptor(roleName);
      }
    };

    const loginAsPlatformEngineer = () => loginAsSecurityRole('platform_engineer');
    const loginAsT1Analyst = () => loginAsSecurityRole('t1_analyst');

    await use({
      ...browserAuth,
      loginWithCustomRole,
      loginAsPlatformEngineer,
      loginAsT1Analyst,
      loginAsSecurityRole,
    });
  },
});
