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
  casesOnlyReadDelete,
  casesRead,
  obsCasesAll,
  obsCasesNoDelete,
  obsCasesOnlyDelete,
  obsCasesOnlyReadDelete,
  obsCasesRead,
  secAll,
  secAllCasesNoDelete,
  secAllCasesNone,
  secAllCasesOnlyDelete,
  secAllCasesOnlyReadDelete,
  secAllCasesRead,
  secAllSpace1,
  secRead,
  secReadCasesAll,
  secReadCasesNone,
  secReadCasesRead,
} from './roles';

/**
 * Users for Cases in Security Solution
 */

export const secAllCasesOnlyDeleteUser: User = {
  username: 'sec_all_cases_only_delete_user_api_int',
  password: 'password',
  roles: [secAllCasesOnlyDelete.name],
};

export const secAllCasesOnlyReadDeleteUser: User = {
  username: 'sec_all_cases_only_read_delete_user_api_int',
  password: 'password',
  roles: [secAllCasesOnlyReadDelete.name],
};

export const secAllCasesNoDeleteUser: User = {
  username: 'sec_all_cases_no_delete_user_api_int',
  password: 'password',
  roles: [secAllCasesNoDelete.name],
};

export const secAllUser: User = {
  username: 'sec_all_user_api_int',
  password: 'password',
  roles: [secAll.name],
};

export const secAllSpace1User: User = {
  username: 'sec_all_space1_user_api_int',
  password: 'password',
  roles: [secAllSpace1.name],
};

export const secAllCasesReadUser: User = {
  username: 'sec_all_cases_read_user_api_int',
  password: 'password',
  roles: [secAllCasesRead.name],
};

export const secAllCasesNoneUser: User = {
  username: 'sec_all_cases_none_user_api_int',
  password: 'password',
  roles: [secAllCasesNone.name],
};

export const secReadCasesAllUser: User = {
  username: 'sec_read_cases_all_user_api_int',
  password: 'password',
  roles: [secReadCasesAll.name],
};

export const secReadCasesReadUser: User = {
  username: 'sec_read_cases_read_user_api_int',
  password: 'password',
  roles: [secReadCasesRead.name],
};

export const secReadUser: User = {
  username: 'sec_read_user_api_int',
  password: 'password',
  roles: [secRead.name],
};

export const secReadCasesNoneUser: User = {
  username: 'sec_read_cases_none_user_api_int',
  password: 'password',
  roles: [secReadCasesNone.name],
};

/**
 * Users for Cases in the Stack
 */

export const casesOnlyDeleteUser: User = {
  username: 'cases_only_delete_user_api_int',
  password: 'password',
  roles: [casesOnlyDelete.name],
};

export const casesOnlyReadDeleteUser: User = {
  username: 'cases_only_read_delete_user_api_int',
  password: 'password',
  roles: [casesOnlyReadDelete.name],
};

export const casesNoDeleteUser: User = {
  username: 'cases_no_delete_user_api_int',
  password: 'password',
  roles: [casesNoDelete.name],
};

export const casesAllUser: User = {
  username: 'cases_all_user_api_int',
  password: 'password',
  roles: [casesAll.name],
};

export const casesReadUser: User = {
  username: 'cases_read_user_api_int',
  password: 'password',
  roles: [casesRead.name],
};

/**
 * Users for Cases in Observability
 */

export const obsCasesOnlyDeleteUser: User = {
  username: 'obs_cases_only_delete_user_api_int',
  password: 'password',
  roles: [obsCasesOnlyDelete.name],
};

export const obsCasesOnlyReadDeleteUser: User = {
  username: 'obs_cases_only_read_delete_user_api_int',
  password: 'password',
  roles: [obsCasesOnlyReadDelete.name],
};

export const obsCasesNoDeleteUser: User = {
  username: 'obs_cases_no_delete_user_api_int',
  password: 'password',
  roles: [obsCasesNoDelete.name],
};

export const obsCasesAllUser: User = {
  username: 'obs_cases_all_user_api_int',
  password: 'password',
  roles: [obsCasesAll.name],
};

export const obsCasesReadUser: User = {
  username: 'obs_cases_read_user_api_int',
  password: 'password',
  roles: [obsCasesRead.name],
};

/**
 * Users for Observability and Security Solution
 */

export const obsSecCasesAllUser: User = {
  username: 'obs_sec_cases_all_user_api_int',
  password: 'password',
  roles: [obsCasesAll.name, secAll.name],
};

export const obsSecCasesReadUser: User = {
  username: 'obs_sec_cases_read_user_api_int',
  password: 'password',
  roles: [obsCasesRead.name, secRead.name],
};

export const users = [
  secAllCasesOnlyDeleteUser,
  secAllCasesOnlyReadDeleteUser,
  secAllCasesNoDeleteUser,
  secAllUser,
  secAllSpace1User,
  secAllCasesReadUser,
  secAllCasesNoneUser,
  secReadCasesAllUser,
  secReadCasesReadUser,
  secReadUser,
  secReadCasesNoneUser,
  casesOnlyDeleteUser,
  casesOnlyReadDeleteUser,
  casesNoDeleteUser,
  casesAllUser,
  casesReadUser,
  obsCasesOnlyDeleteUser,
  obsCasesOnlyReadDeleteUser,
  obsCasesNoDeleteUser,
  obsCasesAllUser,
  obsCasesReadUser,
  obsSecCasesAllUser,
  obsSecCasesReadUser,
];
