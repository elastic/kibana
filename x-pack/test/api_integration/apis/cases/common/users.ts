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
import {
  casesAll,
  casesNoDelete,
  casesOnlyDelete,
  casesRead,
  obsCasesAll,
  obsCasesNoDelete,
  obsCasesOnlyDelete,
  obsCasesRead,
  secAll,
  secAllCasesNoDelete,
  secAllCasesNone,
  secAllCasesOnlyDelete,
  secAllCasesRead,
  secRead,
  secReadCasesAll,
  secReadCasesNone,
  secReadCasesRead,
} from './roles';

/**
 * Users for Cases in Security Solution
 */

export const secAllCasesOnlyDeleteUser: User = {
  username: 'sec_all_cases_only_delete_user',
  password: 'password',
  roles: [secAllCasesOnlyDelete.name],
};

export const secAllCasesNoDeleteUser: User = {
  username: 'sec_all_cases_no_delete_user',
  password: 'password',
  roles: [secAllCasesNoDelete.name],
};

export const secAllUser: User = {
  username: 'sec_all_user',
  password: 'password',
  roles: [secAll.name],
};

export const secAllCasesReadUser: User = {
  username: 'sec_all_cases_read_user',
  password: 'password',
  roles: [secAllCasesRead.name],
};

export const secAllCasesNoneUser: User = {
  username: 'sec_all_cases_none_user',
  password: 'password',
  roles: [secAllCasesNone.name],
};

export const secReadCasesAllUser: User = {
  username: 'sec_read_cases_all_user',
  password: 'password',
  roles: [secReadCasesAll.name],
};

export const secReadCasesReadUser: User = {
  username: 'sec_read_cases_read_user',
  password: 'password',
  roles: [secReadCasesRead.name],
};

export const secReadUser: User = {
  username: 'sec_read_user',
  password: 'password',
  roles: [secRead.name],
};

export const secReadCasesNoneUser: User = {
  username: 'sec_read_cases_none_user',
  password: 'password',
  roles: [secReadCasesNone.name],
};

/**
 * Users for Cases in the Stack
 */

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

export const casesReadUser: User = {
  username: 'cases_read_user',
  password: 'password',
  roles: [casesRead.name],
};

/**
 * Users for Cases in Observability
 */

export const obsCasesOnlyDeleteUser: User = {
  username: 'obs_cases_only_delete_user',
  password: 'password',
  roles: [obsCasesOnlyDelete.name],
};

export const obsCasesNoDeleteUser: User = {
  username: 'obs_cases_no_delete_user',
  password: 'password',
  roles: [obsCasesNoDelete.name],
};

export const obsCasesAllUser: User = {
  username: 'obs_cases_all_user',
  password: 'password',
  roles: [obsCasesAll.name],
};

export const obsCasesReadUser: User = {
  username: 'obs_cases_read_user',
  password: 'password',
  roles: [obsCasesRead.name],
};

export const users = [
  secAllCasesOnlyDeleteUser,
  secAllCasesNoDeleteUser,
  secAllUser,
  secAllCasesReadUser,
  secAllCasesNoneUser,
  secReadCasesAllUser,
  secReadCasesReadUser,
  secReadUser,
  secReadCasesNoneUser,
  casesOnlyDeleteUser,
  casesNoDeleteUser,
  casesAllUser,
  casesReadUser,
  obsCasesOnlyDeleteUser,
  obsCasesNoDeleteUser,
  obsCasesAllUser,
  obsCasesReadUser,
];
