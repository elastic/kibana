/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { User } from '../../../../cases_api_integration/common/lib/authentication/types';
import { casesAll, casesNoDelete, casesReadDelete } from './roles';

/**
 * Users for Cases in the Stack
 */

export const casesReadDeleteUser: User = {
  username: 'cases_read_delete_user',
  password: 'password',
  roles: [casesReadDelete.name],
};

export const casesNoDeleteUser: User = {
  username: 'cases_no_delete_user',
  password: 'password',
  roles: [casesNoDelete.name],
};

export const casesAllUser: User = {
  username: 'cases_all_user',
  password: 'password',
  roles: [casesAll.name],
};

export const casesAllUser2: User = {
  username: 'cases_all_user2',
  password: 'password',
  roles: [casesAll.name],
};

export const users = [casesReadDeleteUser, casesNoDeleteUser, casesAllUser, casesAllUser2];
