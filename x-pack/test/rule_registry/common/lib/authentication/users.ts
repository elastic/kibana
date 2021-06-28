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
  // trial license roles
  observabilityMinReadAlertsRead,
  observabilityMinReadAlertsReadSpacesAll,
  observabilityMinimalRead,
  observabilityMinimalReadSpacesAll,
  observabilityOnlyAlertsRead,
  observabilityOnlyAlertsReadSpacesAll,
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

export const obsOnlyReadSpacesAll: User = {
  username: 'obs_only_read_all_spaces',
  password: 'obs_only_read_all_spaces',
  roles: [observabilityOnlyReadSpacesAll.name],
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
  obsOnlyReadSpacesAll,
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
  obsOnlySpacesAll,
  obsOnlyReadSpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  globalRead,
  noKibanaPrivileges,
];

/**
 * Trial users with trial roles
 */

// apm: ['minimal_read', 'alerts_read']
// spaces: ['space1']
export const obsMinReadAlertsRead: User = {
  username: 'obs_minimal_read_alerts_read_single_space',
  password: 'obs_minimal_read_alerts_read_single_space',
  roles: [observabilityMinReadAlertsRead.name],
};

// apm: ['minimal_read', 'alerts_read']
// spaces: ['*']
export const obsMinReadAlertsReadSpacesAll: User = {
  username: 'obs_minimal_read_alerts_read_all_spaces',
  password: 'obs_minimal_read_alerts_read_all_spaces',
  roles: [observabilityMinReadAlertsReadSpacesAll.name],
};

// apm: ['minimal_read']
// spaces: ['space1']
export const obsMinRead: User = {
  username: 'obs_minimal_read_single_space',
  password: 'obs_minimal_read_single_space',
  roles: [observabilityMinimalRead.name],
};

// apm: ['minimal_read']
// spaces: ['*']
export const obsMinReadSpacesAll: User = {
  username: 'obs_minimal_read_all_space',
  password: 'obs_minimal_read_all_space',
  roles: [observabilityMinimalReadSpacesAll.name],
};

// apm: ['alerts_read']
// spaces: ['space1]
export const obsAlertsRead: User = {
  username: 'obs_alerts_read_single_space',
  password: 'obs_alerts_read_single_space',
  roles: [observabilityOnlyAlertsRead.name],
};

// apm: ['alerts_read']
// spaces: ['*']
export const obsAlertsReadSpacesAll: User = {
  username: 'obs_alerts_read_all_spaces',
  password: 'obs_alerts_read_all_spaces',
  roles: [observabilityOnlyAlertsReadSpacesAll.name],
};

// FOR UPDATES
// apm: ['minimal_read', 'alerts_all']
// spaces: ['space1']
export const obsMinReadAlertsAll: User = {
  username: 'obs_minimal_read_alerts_all_single_space',
  password: 'obs_minimal_read_alerts_all_single_space',
  roles: [observabilityMinReadAlertsRead.name],
};

// apm: ['minimal_read', 'alerts_all']
// spaces: ['*']
export const obsMinReadAlertsAllSpacesAll: User = {
  username: 'obs_minimal_read_alerts_all_all_spaces',
  password: 'obs_minimal_read_alerts_all_all_spaces',
  roles: [observabilityMinReadAlertsReadSpacesAll.name],
};

// apm: ['minimal_all']
// spaces: ['space1']
export const obsMinAll: User = {
  username: 'obs_minimal_all_single_space',
  password: 'obs_minimal_all_single_space',
  roles: [observabilityMinimalRead.name],
};

// apm: ['minimal_all']
// spaces: ['*']
export const obsMinAllSpacesAll: User = {
  username: 'obs_minimal_all_all_space',
  password: 'obs_minimal_read_all_space',
  roles: [observabilityMinimalReadSpacesAll.name],
};

// apm: ['alerts_all']
// spaces: ['space1]
export const obsAlertsAll: User = {
  username: 'obs_alerts_all_single_space',
  password: 'obs_alerts_all_single_space',
  roles: [observabilityOnlyAlertsRead.name],
};

// apm: ['alerts_all']
// spaces: ['*']
export const obsAlertsAllSpacesAll: User = {
  username: 'obs_alerts_all_all_spaces',
  password: 'obs_alerts_all_all_spaces',
  roles: [observabilityOnlyAlertsReadSpacesAll.name],
};
