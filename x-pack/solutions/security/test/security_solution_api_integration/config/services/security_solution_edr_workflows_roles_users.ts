/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from '@kbn/security-plugin/common';
import {
  EndpointSecurityRoleNames,
  ENDPOINT_SECURITY_ROLE_NAMES,
  getAllEndpointSecurityRoles,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users';

import { EndpointSecurityTestRolesLoader } from '@kbn/security-solution-plugin/scripts/endpoint/common/role_and_user_loader';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context_edr_workflows';

export const ROLE = ENDPOINT_SECURITY_ROLE_NAMES;

const rolesMapping = getAllEndpointSecurityRoles();

export function RolesUsersProvider({ getService }: FtrProviderContext) {
  const security = getService('security');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  return {
    /** Endpoint security test roles loader */
    loader: new EndpointSecurityTestRolesLoader(kbnServer, log),

    /**
     * Creates an user with specific values
     * @param user
     * @deprecated use `.loader.*` methods instead
     */
    async createUser(user: { name: string; roles: string[]; password?: string }): Promise<void> {
      const { name, roles, password } = user;
      await security.user.create(name, { roles, password: password ?? 'changeme' });
    },

    /**
     * Deletes specified users by username
     * @param names[]
     * @deprecated use `.loader.*` methods instead
     */
    async deleteUsers(names: string[]): Promise<void> {
      for (const name of names) {
        await security.user.delete(name);
      }
    },

    /**
     * Creates a role using predefined role config if defined or a custom one. It also allows define extra privileges.
     * @param options
     * @deprecated use `.loader.*` methods instead
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
          roleConfig.kibana[0].feature[SECURITY_FEATURE_ID] = [
            ...roleConfig.kibana[0].feature[SECURITY_FEATURE_ID],
            ...extraPrivileges,
          ];
        }

        await security.role.create(predefinedRole, roleConfig);
      }
      if (customRole) {
        const role: Omit<Role, 'name'> = {
          description: '',
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: [
            {
              spaces: ['*'],
              base: [],
              feature: {
                [SECURITY_FEATURE_ID]: customRole.extraPrivileges,
              },
            },
          ],
        };

        await security.role.create(customRole.roleName, role);
      }
    },

    /**
     * Deletes specified roles by name
     * @param roles[]
     * @deprecated use `.loader.*` methods instead
     */
    async deleteRoles(roles: string[]): Promise<void> {
      for (const role of roles) {
        await security.role.delete(role);
      }
    },
  };
}
