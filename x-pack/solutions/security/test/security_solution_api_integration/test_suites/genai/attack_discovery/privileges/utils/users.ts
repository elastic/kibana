/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  noIndexPrivileges,
  noAdhocIndexPrivileges,
  noAttacksIndexPrivileges,
  allIndexPrivileges,
} from './roles';
import type { User } from '../../../utils/auth/types';

export const noIndexPrivilegesUser: User = {
  username: 'no_index_privileges',
  password: 'no_index_privileges',
  roles: [noIndexPrivileges.name],
};

export const noAdhocIndexPrivilegesUser: User = {
  username: 'no_adhoc_index_privileges',
  password: 'no_adhoc_index_privileges',
  roles: [noAdhocIndexPrivileges.name],
};

export const noAttacksIndexPrivilegesUser: User = {
  username: 'no_attacks_index_privileges',
  password: 'no_attacks_index_privileges',
  roles: [noAttacksIndexPrivileges.name],
};

export const allIndexPrivilegesUser: User = {
  username: 'all_index_privileges',
  password: 'all_index_privileges',
  roles: [allIndexPrivileges.name],
};

export const users = [
  noIndexPrivilegesUser,
  noAdhocIndexPrivilegesUser,
  noAttacksIndexPrivilegesUser,
  allIndexPrivilegesUser,
];
