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

    const loginAsSecurityRole = async (roleName: string) => {
      if (!config.serverless) {
        const roleDescriptor = roleDescriptors.serverless?.get(
          roleName
        ) as ElasticsearchRoleDescriptor;
        if (!roleDescriptor) {
          throw new Error(`No role descriptors found for ${roleName}`);
        }
        log.debug(`Using "${roleName}" role to execute the test`);
        return loginWithCustomRole(roleDescriptor);
      } else {
        return browserAuth.loginAs(roleName);
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
