/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedFtrProviderContext } from '../ftr_provider_context';
import { allUsers } from './users';
import { allRoles } from './roles';

export async function createUsersAndRoles(getService: InheritedFtrProviderContext['getService']) {
  const security = getService('security');
  const log = getService('log');

  // create roles
  await Promise.all(
    allRoles.map(({ name, privileges }) => {
      return security.role.create(name, privileges);
    })
  );

  // create users
  await Promise.all(
    allUsers.map((user) => {
      log.info(`Creating user: ${user.username} with roles: ${user.roles.join(', ')}`);
      return security.user.create(user.username, {
        password: user.password,
        roles: user.roles,
      });
    })
  );
}
