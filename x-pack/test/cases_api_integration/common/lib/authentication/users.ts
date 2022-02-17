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
  noKibanaPrivileges as noKibanaPrivilegesRole,
  securitySolutionOnlyAllSpacesAll,
  securitySolutionOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAll,
  observabilityOnlyReadSpacesAll,
  testDisabledPluginAll,
} from './roles';
import { User } from './types';

export const superUser: User = {
  username: 'superuser',
  password: 'superuser',
  roles: ['superuser'],
};

export const testDisabled: User = {
  username: 'test_disabled',
  password: 'test_disabled',
  roles: [testDisabledPluginAll.name],
};

export const secOnly: User = {
  username: 'sec_only',
  password: 'sec_only',
  roles: [securitySolutionOnlyAll.name],
};

export const secOnlyRead: User = {
  username: 'sec_only_read',
  password: 'sec_only_read',
  roles: [securitySolutionOnlyRead.name],
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

export const noKibanaPrivileges: User = {
  username: 'no_kibana_privileges',
  password: 'no_kibana_privileges',
  roles: [noKibanaPrivilegesRole.name],
};

export const users = [
  superUser,
  secOnly,
  secOnlyRead,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  globalRead,
  noKibanaPrivileges,
  testDisabled,
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
