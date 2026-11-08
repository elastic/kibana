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

/**
 * Index privileges added on top of a project role when it is cloned into a stateful custom role.
 *
 * On serverless these tests log in as the real project user, whose effective permissions come
 * from more than the role definition. On stateful we build a custom role out of that definition
 * alone, so a verbatim clone is short of what the test needs. This closes that gap in the test
 * setup instead of in `project_roles/security/roles.yml`, which mirrors the ES controller and
 * must not drift from it. Keep the entries minimal and scoped to the role that needs them.
 */
const STATEFUL_EXTRA_INDEX_PRIVILEGES: Record<
  string,
  NonNullable<ElasticsearchRoleDescriptor['indices']>
> = {
  // Closing and assigning an alert writes the alerts backing index, which the project role does
  // not name. See https://github.com/elastic/kibana/pull/272769.
  platform_engineer: [
    {
      names: ['.internal.alerts-security.alerts-*'],
      privileges: ['all'],
      allow_restricted_indices: false,
    },
  ],
};

export interface SecurityBrowserAuthFixture extends BrowserAuthFixture {
  loginAsPlatformEngineer: () => Promise<void>;
  loginAsT1Analyst: () => Promise<void>;
  loginAsEndpointPolicyManager: () => Promise<void>;
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
        const extraIndexPrivileges = STATEFUL_EXTRA_INDEX_PRIVILEGES[roleName];
        log.debug(`Using "${roleName}" role to execute the test`);
        return loginWithCustomRole(
          extraIndexPrivileges
            ? {
                ...roleDescriptor,
                indices: [...(roleDescriptor.indices ?? []), ...extraIndexPrivileges],
              }
            : roleDescriptor
        );
      } else {
        return browserAuth.loginAs(roleName);
      }
    };

    const loginAsPlatformEngineer = () => loginAsSecurityRole('platform_engineer');
    const loginAsT1Analyst = () => loginAsSecurityRole('t1_analyst');
    const loginAsEndpointPolicyManager = () => loginAsSecurityRole('endpoint_policy_manager');

    await use({
      ...browserAuth,
      loginWithCustomRole,
      loginAsPlatformEngineer,
      loginAsT1Analyst,
      loginAsEndpointPolicyManager,
      loginAsSecurityRole,
    });
  },
});
