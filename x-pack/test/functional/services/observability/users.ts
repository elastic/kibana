/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { Role } from '../../../../plugins/security/common/model';
import { FtrProviderContext } from '../../ftr_provider_context';

type CreateRolePayload = Pick<Role, 'metadata' | 'elasticsearch' | 'kibana'>;

interface ObservabilityTestUserDefinition {
  userName: string;
  password: string;
  roleDefinition: {
    roleName: string;
    role: CreateRolePayload;
  };
}

const OBSERVABILITY_TEST_ROLE_NAME_PREFIX = 'observability-functional-test-role';
const OBSERVABILITY_TEST_USER_NAME_PREFIX = 'observability-functional-test-user';
const OBSERVABILITY_TEST_USER_PASSWORD = 'observability-functional-test-password';

export function ObservabilityUsersProvider({ getPageObject, getService }: FtrProviderContext) {
  const securityPageObject = getPageObject('security');
  const security = getService('security');

  /**
   * Defines an observability test user with a given role.
   *
   * Note: This does not actually create the user in the system under test.
   */
  const defineTestUser = (role: CreateRolePayload): ObservabilityTestUserDefinition => {
    const uniqueUserSuffix = uuid.v4();

    return {
      userName: [OBSERVABILITY_TEST_USER_NAME_PREFIX, uniqueUserSuffix].join('-'),
      password: OBSERVABILITY_TEST_USER_PASSWORD,
      roleDefinition: {
        roleName: [OBSERVABILITY_TEST_ROLE_NAME_PREFIX, uniqueUserSuffix].join('-'),
        role,
      },
    };
  };

  /**
   * Creates in an observability test user that matches the given user
   * definition. The user and role are created via the Kibana API.
   *
   * @arg user - the test user definition
   */
  const createUser = async (user: ObservabilityTestUserDefinition) => {
    await security.role.create(user.roleDefinition.roleName, user.roleDefinition.role);

    await security.user.create(user.userName, {
      password: user.password,
      roles: [user.roleDefinition.roleName],
      full_name: user.userName,
    });
  };

  /**
   * Creates and logs in an observability test user that matches the given user
   * definition. The user and role are created via the Kibana API.
   *
   * @arg user - the test user definition
   */
  const createUserAndLogIn = async (user: ObservabilityTestUserDefinition) => {
    await createUser(user);

    await securityPageObject.forceLogout();

    await securityPageObject.login(user.userName, user.password, {
      expectSpaceSelector: false,
    });
  };

  /**
   * Deletes an observability test user via the Kibana API.
   *
   * @arg user - the test user definition
   */
  const deleteUser = async (user: ObservabilityTestUserDefinition) => {
    await Promise.all([
      security.role.delete(user.roleDefinition.roleName),
      security.user.delete(user.userName),
    ]);
  };

  /**
   * Logs out and deletes an observability test user via the Kibana API.
   *
   * @arg user - the test user definition
   */
  const logOutAndDeleteUser = async (user: ObservabilityTestUserDefinition) => {
    await securityPageObject.forceLogout();
    await deleteUser(user);
  };

  return {
    createUser,
    createUserAndLogIn,
    defineTestUser,
    deleteUser,
    logOutAndDeleteUser,
  };
}
