/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { User } from '../../../../cases_api_integration/common/lib/authentication/types';
import { casesAll, casesNoDelete, casesOnlyDelete } from './roles';

export const casesOnlyDeleteUser: User = {
  username: 'cases_only_delete_user',
  password: 'password',
  roles: [casesOnlyDelete.name],
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

export const users = [casesOnlyDeleteUser, casesNoDeleteUser, casesAllUser];
