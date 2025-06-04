/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './types';
import { ROLES } from './roles';

export const playgroundAllUser: User = {
  username: 'playground_test_all',
  password: 'password',
  roles: [ROLES.ALL.name],
};

export const playgroundReadUser: User = {
  username: 'playground_test_read',
  password: 'password',
  roles: [ROLES.READ.name],
};

export const nonPlaygroundUser: User = {
  username: 'playground_test_no_access',
  password: 'password',
  roles: [ROLES.NO_ACCESS.name],
};

export const USERS = {
  ALL: playgroundAllUser,
  READ: playgroundReadUser,
  NO_ACCESS: nonPlaygroundUser,
};

export const ALL_USERS = Object.values(USERS);
