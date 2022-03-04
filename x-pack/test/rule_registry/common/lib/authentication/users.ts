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
  logsOnlyAllSpacesAll,
  observabilityOnlyReadSpacesAll,
  // trial license roles
  observabilityMinReadAlertsAll,
  observabilityMinReadAlertsRead,
  observabilityMinReadAlertsReadSpacesAll,
  observabilityMinimalRead,
  observabilityMinimalReadSpacesAll,
  securitySolutionOnlyAllSpace2,
  securitySolutionOnlyReadSpace2,
  observabilityOnlyAllSpace2,
  observabilityOnlyReadSpace2,
  observabilityMinReadAlertsAllSpacesAll,
  observabilityOnlyAllSpacesAllWithReadESIndices,
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

export const obsOnly: User = {
  username: 'obs_only_all_spaces_space1',
  password: 'obs_only_all_spaces_space1',
  roles: [observabilityOnlyAll.name],
};

export const obsOnlySpace2: User = {
  username: 'obs_only_all_spaces_space2',
  password: 'obs_only_all_spaces_space2',
  roles: [observabilityOnlyAllSpace2.name],
};

export const obsOnlyRead: User = {
  username: 'obs_only_read_spaces_space1',
  password: 'obs_only_read_spaces_space1',
  roles: [observabilityOnlyRead.name],
};

export const obsOnlyReadSpace2: User = {
  username: 'obs_only_read_spaces_space2',
  password: 'obs_only_read_spaces_space2',
  roles: [observabilityOnlyReadSpace2.name],
};

export const obsSec: User = {
  username: 'sec_only_all_spaces_space1_and_obs_only_all_spaces_space1',
  password: 'sec_only_all_spaces_space1_and_obs_only_all_spaces_space1',
  roles: [securitySolutionOnlyAll.name, observabilityOnlyAll.name],
};

export const obsSecAllSpace2: User = {
  username: 'sec_only_all_spaces_space2_and_obs_only_all_spaces_space2',
  password: 'sec_only_all_spaces_space2_and_obs_only_all_spaces_space2',
  roles: [securitySolutionOnlyAllSpace2.name, observabilityOnlyAllSpace2.name],
};

export const obsSecRead: User = {
  username: 'sec_only_read_spaces_space1_and_obs_only_read_spaces_space1',
  password: 'sec_only_read_spaces_space1_and_obs_only_read_spaces_space1',
  roles: [securitySolutionOnlyRead.name, observabilityOnlyRead.name],
};

export const obsSecReadSpace2: User = {
  username: 'sec_only_read_spaces_space2_and_obs_only_read_spaces_space2',
  password: 'sec_only_read_spaces_space2_and_obs_only_read_spaces_space2',
  roles: [securitySolutionOnlyReadSpace2.name, observabilityOnlyReadSpace2.name],
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
  username: 'obs_only_read_all_spaces_all',
  password: 'obs_only_read_all_spaces_all',
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
  username: 'sec_only_all_spaces_all',
  password: 'sec_only_all_spaces_all',
  roles: [securitySolutionOnlyAllSpacesAll.name],
};

export const secOnlyReadSpacesAll: User = {
  username: 'sec_only_read_spaces_all',
  password: 'sec_only_read_spaces_all',
  roles: [securitySolutionOnlyReadSpacesAll.name],
};

export const obsOnlySpacesAll: User = {
  username: 'obs_only_all_spaces_all',
  password: 'obs_only_all_spaces_all',
  roles: [observabilityOnlyAllSpacesAll.name],
};

export const logsOnlySpacesAll: User = {
  username: 'logs_only_all_spaces_all',
  password: 'logs_only_all_spaces_all',
  roles: [logsOnlyAllSpacesAll.name],
};

export const obsOnlySpacesAllEsRead: User = {
  username: 'obs_only_all_spaces_all_es_read',
  password: 'obs_only_all_spaces_all_es_read',
  roles: [observabilityOnlyAllSpacesAllWithReadESIndices.name],
};

export const obsSecSpacesAll: User = {
  username: 'sec_only_all_spaces_all_and_obs_only_all_spaces_all',
  password: 'sec_only_all_spaces_all_and_obs_only_all_spaces_all',
  roles: [securitySolutionOnlyAllSpacesAll.name, observabilityOnlyAllSpacesAll.name],
};

export const obsSecReadSpacesAll: User = {
  username: 'sec_only_read_all_spaces_all_and_obs_only_read_all_spaces_all',
  password: 'sec_only_read_all_spaces_all_and_obs_only_read_all_spaces_all',
  roles: [securitySolutionOnlyReadSpacesAll.name, observabilityOnlyReadSpacesAll.name],
};

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

// FOR UPDATES
// apm: ['minimal_read', 'alerts_all']
// spaces: ['space1']
export const obsMinReadAlertsAll: User = {
  username: 'obs_minimal_read_alerts_all_single_space',
  password: 'obs_minimal_read_alerts_all_single_space',
  roles: [observabilityMinReadAlertsAll.name],
};

// apm: ['minimal_read', 'alerts_all']
// spaces: ['*']
export const obsMinReadAlertsAllSpacesAll: User = {
  username: 'obs_minimal_read_alerts_all_all_spaces',
  password: 'obs_minimal_read_alerts_all_all_spaces',
  roles: [observabilityMinReadAlertsAllSpacesAll.name],
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

export const trialUsers = [
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinRead,
  obsMinReadSpacesAll,
  obsMinReadAlertsAll,
  obsMinReadAlertsAllSpacesAll,
  obsMinAll,
  obsMinAllSpacesAll,
];

export const allUsers = [
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
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  obsOnlySpacesAll,
  logsOnlySpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinRead,
  obsMinReadSpacesAll,
  obsMinReadAlertsAll,
  obsMinReadAlertsAllSpacesAll,
  obsMinAll,
  obsMinAllSpacesAll,
  secOnlySpace2,
  secOnlyReadSpace2,
  obsOnlySpace2,
  obsOnlyReadSpace2,
  obsSecAllSpace2,
  obsSecReadSpace2,
  obsOnlySpacesAllEsRead,
];
