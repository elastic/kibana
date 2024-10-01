/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  securitySolutionOnlyAll,
  securitySolutionOnlyRead,
  globalRead as globalReadRole,
  noKibanaPrivileges as noKibanaPrivilegesRole,
  securitySolutionOnlyAllSpacesAll,
  securitySolutionOnlyReadSpacesAll,

  // trial license roles
  securitySolutionOnlyAllSpace2,
  securitySolutionOnlyReadSpace2,
  securitySolutionOnlyAllSpacesAllWithReadESIndices,
} from './roles';
import { User } from './types';

export const superUser: User = {
  username: 'superuser',
  password: 'superuser',
  roles: ['superuser'],
};

export const secOnly: User = {
  username: 'sec_only_all_spaces_space1',
  password: 'sec_only_all_spaces_space1',
  roles: [securitySolutionOnlyAll.name],
};

export const secOnlySpace2: User = {
  username: 'sec_only_all_spaces_space2',
  password: 'sec_only_all_spaces_space2',
  roles: [securitySolutionOnlyAllSpace2.name],
};

export const secOnlyRead: User = {
  username: 'sec_only_read_spaces_space1',
  password: 'sec_only_read_spaces_space1',
  roles: [securitySolutionOnlyRead.name],
};

export const secOnlyReadSpace2: User = {
  username: 'sec_only_read_spaces_space2',
  password: 'sec_only_read_spaces_space2',
  roles: [securitySolutionOnlyReadSpace2.name],
};

export const globalRead: User = {
  username: 'global_read',
  password: 'global_read',
  roles: [globalReadRole.name],
};

export const noKibanaPrivileges: User = {
  username: 'no_kibana_privileges',
  password: 'no_kibana_privileges',
  roles: [noKibanaPrivilegesRole.name],
};

export const users = [superUser, secOnly, secOnlyRead, globalRead, noKibanaPrivileges];

/**
 * These users will have access to all spaces.
 */

export const secOnlySpacesAll: User = {
  username: 'sec_only_all_spaces_all',
  password: 'sec_only_all_spaces_all',
  roles: [securitySolutionOnlyAllSpacesAll.name],
};

export const secOnlyReadSpacesAll: User = {
  username: 'sec_only_read_spaces_all',
  password: 'sec_only_read_spaces_all',
  roles: [securitySolutionOnlyReadSpacesAll.name],
};

export const secOnlySpacesAllEsReadAll: User = {
  username: 'sec_only_all_spaces_all_with_read_es_indices',
  password: 'sec_only_all_spaces_all_with_read_es_indices',
  roles: [securitySolutionOnlyAllSpacesAllWithReadESIndices.name],
};

export const allUsers = [
  superUser,
  secOnly,
  secOnlyRead,
  globalRead,
  noKibanaPrivileges,
  secOnlySpacesAll,
  secOnlySpacesAllEsReadAll,
  secOnlyReadSpacesAll,
  secOnlySpace2,
  secOnlyReadSpace2,
];
