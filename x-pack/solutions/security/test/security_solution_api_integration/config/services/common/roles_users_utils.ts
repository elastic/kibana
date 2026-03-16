/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KNOWN_ESS_ROLE_DEFINITIONS,
  KNOWN_SERVERLESS_ROLE_DEFINITIONS,
} from '@kbn/security-solution-plugin/common/test';
import type { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';

const KNOWN_ROLE_DEFINITIONS = {
  ...KNOWN_SERVERLESS_ROLE_DEFINITIONS,
  ...KNOWN_ESS_ROLE_DEFINITIONS,
};

interface SecurityService {
  role: {
    create(roleName: string, roleDefinition: unknown): Promise<void>;
    delete(roleName: string): Promise<void>;
  };
  user: {
    create(
      username: string,
      userDefinition: {
        password: string;
        roles: string[];
        full_name: string;
        email: string;
      }
    ): Promise<void>;
    delete(username: string): Promise<void>;
  };
}

interface LoggerService {
  error(message: string): void;
}

interface GetSecuritySolutionService {
  (name: 'security'): SecurityService;
  (name: 'log'): LoggerService;
}

/**
 * creates a security solution centric role and a user (both having the same name)
 * @param getService
 * @param role
 */
export const createUserAndRole = async (
  getService: GetSecuritySolutionService,
  role: SecurityRoleName
): Promise<void> => {
  const securityService = getService('security');
  const roleDefinition = KNOWN_ROLE_DEFINITIONS[role];

  await securityService.role.create(role, roleDefinition);
  await securityService.user.create(role, {
    password: 'changeme',
    roles: [role],
    full_name: role,
    email: 'detections-reader@example.com',
  });
};

/**
 * Given a roleName and security service this will delete the roleName
 * and user
 * @param roleName The user and role to delete with the same name
 * @param securityService The security service
 */
export const deleteUserAndRole = async (
  getService: GetSecuritySolutionService,
  roleName: SecurityRoleName
): Promise<void> => {
  const securityService = getService('security');
  await securityService.user.delete(roleName);
  await securityService.role.delete(roleName);
};

export const deleteAndReCreateUserRole = async (
  getService: GetSecuritySolutionService,
  roleName: SecurityRoleName
): Promise<void> => {
  const log = getService('log');
  try {
    await deleteUserAndRole(getService, roleName);
  } catch (exc) {
    log.error(`could not delete user and role ${roleName}`);
  }
  try {
    await createUserAndRole(getService, roleName);
  } catch (exc) {
    log.error(`could not create user and role ${roleName}`);
  }
};
