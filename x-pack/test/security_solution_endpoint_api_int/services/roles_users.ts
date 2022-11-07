/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';

import { FtrProviderContext } from '../ftr_provider_context';

import { t1Analyst } from './t1_analyst';
import { t2Analyst } from './t2_analyst';
import { hunter } from './hunter';
import { threadIntelligenceAnalyst } from './thread_intelligence_analyst';
import { socManager } from './soc_manager';
import { platformEngineer } from './platform_engineer';
import { endpointOperationsAnalyst } from './endpoint_operations_analyst';
import { endpointSecurityPolicyManager } from './endpoint_security_policy_manager';

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
  t1Analyst,
  t2Analyst,
  hunter,
  threadIntelligenceAnalyst,
  socManager,
  platformEngineer,
  endpointOperationsAnalyst,
  endpointSecurityPolicyManager,
};

export function RolesUsersProvider({ getService }: FtrProviderContext) {
  const security = getService('security');
  return {
    /**
     * Creates an user with specific values
     * @param user
     */
    async createUser(user: { name: string; roles: string[]; password?: string }) {
      const { name, roles, password } = user;
      await security.user.create(name, { roles, password: password ?? 'changeme' });
    },

    /**
     * Deletes specified users by username
     * @param names[]
     */
    async deleteUsers(names: string[]) {
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
    }) {
      const { predefinedRole, customRole, extraPrivileges } = options;
      if (predefinedRole) {
        const roleConfig = rolesMapping[predefinedRole];
        if (extraPrivileges) {
          roleConfig.kibana[0].feature.siem = [
            ...roleConfig.kibana[0].feature.siem,
            ...extraPrivileges,
          ];
        }

        await security.role.create(predefinedRole, rolesMapping[predefinedRole]);
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
    async deleteRoles(roles: string[]) {
      for (const role of roles) {
        await security.role.delete(role);
      }
    },
  };
}
