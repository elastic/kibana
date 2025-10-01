/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import supertest from 'supertest';
import { format as formatUrl } from 'url';
import { usersAndRolesFactory } from '../../../utils/users_and_roles';
import { privilegeMonitoringRouteHelpersFactoryNoAuth } from '../../../utils/privilege_monitoring';

export const USER_PASSWORD = 'changeme';

const ALL_SECURITY_SOLUTION_PRIVILEGES = [
  {
    feature: {
      [SECURITY_FEATURE_ID]: ['all'],
    },
    spaces: ['default'],
  },
];

const READ_SECURITY_SOLUTION_PRIVILEGES = [
  {
    feature: {
      [SECURITY_FEATURE_ID]: ['read'],
    },
    spaces: ['default'],
  },
];

export const READ_ALL_INDICES_ROLE = {
  name: 'all',
  privileges: {
    kibana: ALL_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
  },
};

export const READ_PRIV_MON_INDICES_ROLE = {
  name: 'priv_mon_read',
  privileges: {
    kibana: READ_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [
        {
          names: ['.entity_analytics.monitoring*'],
          privileges: ['read'],
        },
      ],
    },
  },
};

export const READ_NO_INDEX_ROLE_NO_PRIVILEGES_ROLE = {
  name: 'no_index_no_privileges',
  privileges: {
    kibana: READ_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [],
    },
  },
};

export const READ_NO_INDEX_ROLE = {
  name: 'no_index',
  privileges: {
    kibana: READ_SECURITY_SOLUTION_PRIVILEGES,
    elasticsearch: {
      indices: [],
    },
  },
};

const ROLES = [
  READ_ALL_INDICES_ROLE,
  READ_PRIV_MON_INDICES_ROLE,
  READ_NO_INDEX_ROLE_NO_PRIVILEGES_ROLE,
  READ_NO_INDEX_ROLE,
];

export const PrivMonRolesUtils = (getService: FtrProviderContext['getService']) => {
  const userHelper = usersAndRolesFactory(getService('security'));
  const config = getService('config');
  const isServerless = config.get('serverless');
  const samlAuth = isServerless ? getService('samlAuth') : null;

  const createPrivilegeTestUsers = async () => {
    if (isServerless) {
      // In serverless, we don't create traditional users
      // Instead, we'll create custom roles that can be used with M2M API keys
      return;
    }

    // Traditional ESS user creation
    const rolePromises = ROLES.map((role) => userHelper.createRole(role));
    await Promise.all(rolePromises);

    const userPromises = ROLES.map((role) =>
      userHelper.createUser({
        username: role.name,
        roles: [role.name],
        password: USER_PASSWORD,
      })
    );

    return Promise.all(userPromises);
  };

  const deletePrivilegeTestUsers = async () => {
    if (isServerless) {
      // In serverless, we don't need to delete traditional users
      return;
    }

    // Traditional ESS user deletion
    const userPromises = ROLES.map((role) => userHelper.deleteUser(role.name));
    const rolePromises = ROLES.map((role) => userHelper.deleteRole(role.name));
    await Promise.all([...userPromises, ...rolePromises]);
  };

  const createCustomRoleForServerless = async (roleDefinition: any) => {
    if (!isServerless || !samlAuth) {
      throw new Error('createCustomRoleForServerless can only be used in serverless environments');
    }

    // Set the custom role with the provided privileges
    await samlAuth.setCustomRole(roleDefinition.privileges);

    // Create M2M API key with the custom role scope
    const credentials = await samlAuth.createM2mApiKeyWithCustomRoleScope();

    return credentials;
  };

  const cleanupCustomRoleForServerless = async () => {
    if (!isServerless || !samlAuth) {
      return;
    }

    // Clean up the custom role
    await samlAuth.deleteCustomRole();
  };

  const createUnifiedAuthHelper = (getServiceFn: FtrProviderContext['getService']) => {
    const supertestWithoutAuth = getServiceFn('supertestWithoutAuth');
    const configService = getServiceFn('config');
    const kbnUrl = formatUrl({
      ...configService.get('servers.kibana'),
      auth: false,
    });
    const privMonRoutesNoAuth = privilegeMonitoringRouteHelpersFactoryNoAuth(supertestWithoutAuth);

    const getPrivilegesForRole = async (roleDefinition: any) => {
      if (isServerless) {
        // In serverless, create a custom role and use M2M API key
        const credentials = await createCustomRoleForServerless(roleDefinition);

        // Create a supertest instance with the API key
        const supertestWithAuth = supertest.agent(kbnUrl).set(credentials.apiKeyHeader);

        // For serverless, we need to get privileges for the current user (the API key user)
        // The API key represents a user with the custom role privileges
        // We need to create a custom privilegesForUser that doesn't use username/password auth
        const response = await supertestWithAuth
          .get('/api/entity_analytics/monitoring/privileges/privileges')
          .set('elastic-api-version', '2023-10-31')
          .send();

        return { body: response.body };
      } else {
        // In ESS, use traditional username/password authentication
        const { body } = await privMonRoutesNoAuth.privilegesForUser({
          username: roleDefinition.name,
          password: USER_PASSWORD,
        });

        return { body };
      }
    };

    const initEngineForRole = async (roleDefinition: any, privMonUtils: any) => {
      if (isServerless) {
        // In serverless, create a custom role and use M2M API key
        const credentials = await createCustomRoleForServerless(roleDefinition);

        // For serverless, we need to create a custom privMonUtils with API key auth
        // Since privMonUtils uses supertestWithoutAuth, we need to create a new instance
        const supertestWithAuth = supertest.agent(kbnUrl).set(credentials.apiKeyHeader);
        const privMonUtilsWithAuth = {
          ...privMonUtils,
          initPrivMonEngineWithoutAuth: async () => {
            // Use the API key authenticated supertest instance with correct endpoint and headers
            return await supertestWithAuth
              .post('/api/entity_analytics/monitoring/engine/init')
              .set('kbn-xsrf', 'true')
              .set('elastic-api-version', '2023-10-31')
              .set('x-elastic-internal-origin-request', 'kibana')
              .send();
          },
        };

        const res = await privMonUtilsWithAuth.initPrivMonEngineWithoutAuth();
        await cleanupCustomRoleForServerless();
        return res;
      } else {
        // In ESS, use traditional username/password authentication
        const res = await privMonUtils.initPrivMonEngineWithoutAuth({
          username: roleDefinition.name,
          password: USER_PASSWORD,
        });

        return res;
      }
    };

    return {
      getPrivilegesForRole,
      initEngineForRole,
    };
  };

  return {
    createPrivilegeTestUsers,
    deletePrivilegeTestUsers,
    createCustomRoleForServerless,
    cleanupCustomRoleForServerless,
    createUnifiedAuthHelper,
    isServerless,
  };
};
