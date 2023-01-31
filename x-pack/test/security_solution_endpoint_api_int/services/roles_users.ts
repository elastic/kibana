/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';

import { getT1Analyst } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/t1_analyst';
import { getT2Analyst } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/t2_analyst';
import { getHunter } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/hunter';
import { getThreadIntelligenceAnalyst } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/thread_intelligence_analyst';
import { getSocManager } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/soc_manager';
import { getPlatformEngineer } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/platform_engineer';
import { getEndpointOperationsAnalyst } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/endpoint_operations_analyst';
import { getEndpointSecurityPolicyManager } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users/endpoint_security_policy_manager';

import { FtrProviderContext } from '../ftr_provider_context';

export enum ROLE {
  t1_analyst = 't1Analyst',
  t2_analyst = 't2Analyst',
  analyst_hunter = 'hunter',
  thread_intelligence_analyst = 'threadIntelligenceAnalyst',
  detections_engineer = 'detectionsEngineer',
  soc_manager = 'socManager',
  platform_engineer = 'platformEngineer',
  endpoint_operations_analyst = 'endpointOperationsAnalyst',
  endpoint_security_policy_manager = 'endpointSecurityPolicyManager',
}

const rolesMapping: { [id: string]: Omit<Role, 'name'> } = {
  t1Analyst: getT1Analyst(),
  t2Analyst: getT2Analyst(),
  hunter: getHunter(),
  threadIntelligenceAnalyst: getThreadIntelligenceAnalyst(),
  socManager: getSocManager(),
  platformEngineer: getPlatformEngineer(),
  endpointOperationsAnalyst: getEndpointOperationsAnalyst(),
  endpointSecurityPolicyManager: getEndpointSecurityPolicyManager(),
};

export function RolesUsersProvider({ getService }: FtrProviderContext) {
  const security = getService('security');
  return {
    /**
     * Creates an user with specific values
     * @param user
     */
    async createUser(user: { name: string; roles: string[]; password?: string }): Promise<void> {
      const { name, roles, password } = user;
      await security.user.create(name, { roles, password: password ?? 'changeme' });
    },

    /**
     * Deletes specified users by username
     * @param names[]
     */
    async deleteUsers(names: string[]): Promise<void> {
      for (const name of names) {
        await security.user.delete(name);
      }
    },

    /**
     * Creates a role using predefined role config if defined or a custom one. It also allows define extra privileges.
     * @param options
     */
    async createRole(options: {
      predefinedRole?: ROLE;
      extraPrivileges?: string[];
      customRole?: { roleName: string; extraPrivileges: string[] };
    }): Promise<void> {
      const { predefinedRole, customRole, extraPrivileges } = options;
      if (predefinedRole) {
        const roleConfig = rolesMapping[predefinedRole];
        if (extraPrivileges) {
          roleConfig.kibana[0].feature.siem = [
            ...roleConfig.kibana[0].feature.siem,
            ...extraPrivileges,
          ];
        }

        await security.role.create(predefinedRole, roleConfig);
      }
      if (customRole) {
        await security.role.create(customRole.roleName, {
          permissions: { feature: { siem: [...customRole.extraPrivileges] } },
        });
      }
    },

    /**
     * Deletes specified roles by name
     * @param roles[]
     */
    async deleteRoles(roles: string[]): Promise<void> {
      for (const role of roles) {
        await security.role.delete(role);
      }
    },
  };
}
