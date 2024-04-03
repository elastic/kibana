/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EndpointSecurityRoleNames,
  ENDPOINT_SECURITY_ROLE_NAMES,
  getAllEndpointSecurityRoles,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users';

import { FtrProviderContext } from '../ftr_provider_context';

export const ROLE = ENDPOINT_SECURITY_ROLE_NAMES;

const rolesMapping = getAllEndpointSecurityRoles();

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
      predefinedRole?: EndpointSecurityRoleNames;
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
