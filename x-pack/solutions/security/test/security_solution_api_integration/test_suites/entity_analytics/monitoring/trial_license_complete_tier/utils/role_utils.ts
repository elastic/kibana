/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import { usersAndRolesFactory } from '../../../utils/users_and_roles';

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

  const createPrivilegeTestUsers = async () => {
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
    const userPromises = ROLES.map((role) => userHelper.deleteUser(role.name));
    const rolePromises = ROLES.map((role) => userHelper.deleteRole(role.name));
    await Promise.all([...userPromises, ...rolePromises]);
  };
  return {
    createPrivilegeTestUsers,
    deletePrivilegeTestUsers,
  };
};
