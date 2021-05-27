/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  securitySolutionOnlyAll,
  observabilityOnlyAll,
  securitySolutionOnlyRead,
  observabilityOnlyRead,
  globalRead as globalReadRole,
  globalReadMinimal as globalReadMinimalRole,
  noKibanaPrivileges as noKibanaPrivilegesRole,
  securitySolutionOnlyAllSpacesAll,
  securitySolutionOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAll,
  observabilityOnlyReadSpacesAll,
  securitySolutionOnlyReadMinimal,
  securitySolutionOnlyAllMinimal,
  securitySolutionOnlyReadCasesNone,
  securitySolutionOnlyAllCasesNone,
  securitySolutionOnlyReadCasesAll,
  securitySolutionOnlyAllCasesRead,
} from './roles';
import { User } from './types';

export const superUser: User = {
  username: 'superuser',
  password: 'superuser',
  roles: ['superuser'],
};

export const secOnly: User = {
  username: 'sec_only',
  password: 'sec_only',
  roles: [securitySolutionOnlyAll.name],
};

export const secOnlyAllMinimal: User = {
  username: 'sec_only_minimal',
  password: 'sec_only_minimal',
  roles: [securitySolutionOnlyAllMinimal.name],
};

export const secOnlyAllCasesRead: User = {
  username: 'sec_only_cases_read',
  password: 'sec_only_cases_read',
  roles: [securitySolutionOnlyAllCasesRead.name],
};

export const secOnlyRead: User = {
  username: 'sec_only_read',
  password: 'sec_only_read',
  roles: [securitySolutionOnlyRead.name],
};

export const secOnlyReadMinimal: User = {
  username: 'sec_only_read_minimal',
  password: 'sec_only_read_minimal',
  roles: [securitySolutionOnlyReadMinimal.name],
};

export const secOnlyReadCasesAll: User = {
  username: 'sec_only_read_cases_all',
  password: 'sec_only_read_cases_all',
  roles: [securitySolutionOnlyReadCasesAll.name],
};

export const obsOnly: User = {
  username: 'obs_only',
  password: 'obs_only',
  roles: [observabilityOnlyAll.name],
};

export const obsOnlyRead: User = {
  username: 'obs_only_read',
  password: 'obs_only_read',
  roles: [observabilityOnlyRead.name],
};

export const obsSec: User = {
  username: 'obs_sec',
  password: 'obs_sec',
  roles: [securitySolutionOnlyAll.name, observabilityOnlyAll.name],
};

export const obsSecRead: User = {
  username: 'obs_sec_read',
  password: 'obs_sec_read',
  roles: [securitySolutionOnlyRead.name, observabilityOnlyRead.name],
};

export const globalRead: User = {
  username: 'global_read',
  password: 'global_read',
  roles: [globalReadRole.name],
};

export const globalReadMinimal: User = {
  username: 'global_read_minimal',
  password: 'global_read_minimal',
  roles: [globalReadMinimalRole.name],
};

export const noKibanaPrivileges: User = {
  username: 'no_kibana_privileges',
  password: 'no_kibana_privileges',
  roles: [noKibanaPrivilegesRole.name],
};

export const secOnlyReadCasesNone: User = {
  username: 'sec_only_read_cases_none',
  password: 'sec_only_read_cases_none',
  roles: [securitySolutionOnlyReadCasesNone.name],
};

export const secOnlyAllCasesNone: User = {
  username: 'sec_only_read_cases_none',
  password: 'sec_only_read_cases_none',
  roles: [securitySolutionOnlyAllCasesNone.name],
};

export const users = [
  superUser,
  secOnly,
  secOnlyAllMinimal,
  secOnlyRead,
  secOnlyReadMinimal,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  globalRead,
  globalReadMinimal,
  noKibanaPrivileges,
  secOnlyAllCasesNone,
  secOnlyReadCasesNone,
  secOnlyAllCasesRead,
  secOnlyReadCasesAll,
];

export const usersWithoutWritePermissions = [
  secOnlyRead,
  secOnlyReadMinimal,
  obsOnlyRead,
  obsSecRead,
  globalRead,
  globalReadMinimal,
  noKibanaPrivileges,
  secOnlyAllCasesNone,
  secOnlyReadCasesNone,
  secOnlyAllCasesRead,
];

export const usersWithReadPermissions = [
  superUser,
  secOnly,
  secOnlyAllMinimal,
  secOnlyRead,
  secOnlyReadMinimal,
  obsSecRead,
  obsSec,
  obsSecRead,
  globalRead,
  globalReadMinimal,
  secOnlyAllCasesRead,
  secOnlyReadCasesAll,
];

export const authScenariosWithoutRead = [
  { user: noKibanaPrivileges, space: 'space1' },
  { user: secOnlyAllCasesNone, space: 'space1' },
  { user: secOnlyReadCasesNone, space: 'space1' },
  { user: secOnly, space: 'space2' },
];

/**
 * These users will have access to all spaces.
 */

export const secOnlySpacesAll: User = {
  username: 'sec_only',
  password: 'sec_only',
  roles: [securitySolutionOnlyAllSpacesAll.name],
};

export const secOnlyReadSpacesAll: User = {
  username: 'sec_only_read',
  password: 'sec_only_read',
  roles: [securitySolutionOnlyReadSpacesAll.name],
};

export const obsOnlySpacesAll: User = {
  username: 'obs_only',
  password: 'obs_only',
  roles: [observabilityOnlyAllSpacesAll.name],
};

export const obsOnlyReadSpacesAll: User = {
  username: 'obs_only_read',
  password: 'obs_only_read',
  roles: [observabilityOnlyReadSpacesAll.name],
};

export const obsSecSpacesAll: User = {
  username: 'obs_sec',
  password: 'obs_sec',
  roles: [securitySolutionOnlyAllSpacesAll.name, observabilityOnlyAllSpacesAll.name],
};

export const obsSecReadSpacesAll: User = {
  username: 'obs_sec_read',
  password: 'obs_sec_read',
  roles: [securitySolutionOnlyReadSpacesAll.name, observabilityOnlyReadSpacesAll.name],
};

/**
 * These users are for the security_only tests because most of them have access to the default space instead of 'space1'
 */
export const usersDefaultSpace = [
  superUser,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  secOnlyReadMinimal,
  secOnlyReadCasesAll,
  secOnlyAllMinimal,
  secOnlyAllCasesRead,
  secOnlyAllCasesNone,
  secOnlyReadCasesNone,
  obsOnlySpacesAll,
  obsOnlyReadSpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  globalRead,
  globalReadMinimal,
  noKibanaPrivileges,
];

export const usersWithoutWritePermissionsSpacesAll = [
  secOnlyReadMinimal,
  globalRead,
  globalReadMinimal,
  noKibanaPrivileges,
  secOnlyAllCasesNone,
  secOnlyReadCasesNone,
  secOnlyAllCasesRead,
  secOnlyReadSpacesAll,
  obsOnlyReadSpacesAll,
  obsSecReadSpacesAll,
];

export const usersWithReadPermissionsSpacesAll = [
  superUser,
  secOnlyAllMinimal,
  secOnlyReadMinimal,
  globalRead,
  globalReadMinimal,
  secOnlyAllCasesRead,
  secOnlyReadCasesAll,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
];

export const usersWithoutReadPermissionsSpacesAll = [
  noKibanaPrivileges,
  secOnlyAllCasesNone,
  secOnlyReadCasesNone,
];
