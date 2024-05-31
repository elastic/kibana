/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from '@kbn/security-plugin/common';
import { rootRequest } from '../tasks/api_calls/common';

/**
 * Utility function creates roles and corresponding users per each role with names
 * matching role names. Each user gets the same `password` passed in which is
 * `changeme` by default.
 *
 * @param roles an array of security `Role`s
 * @param password custom password if `changeme` doesn't fit
 */
export function setupUsers(roles: Role[], password = 'changeme'): void {
  for (const role of roles) {
    createRole(role);
    createUser(role.name, password, [role.name]);
  }
}

function createRole(role: Role): void {
  const { name: roleName, ...roleDefinition } = role;

  rootRequest({
    method: 'PUT',
    url: `/api/security/role/${roleName}`,
    body: roleDefinition,
  });
}

function createUser(username: string, password: string, roles: string[] = []): void {
  const user = {
    username,
    password,
    roles,
    full_name: username,
    email: `${username}@elastic.co`,
  };

  rootRequest({
    method: 'POST',
    url: `/internal/security/users/${username}`,
    body: user,
  });
}
