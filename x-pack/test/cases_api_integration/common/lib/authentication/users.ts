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
  noCasesPrivilegesSpace1 as noCasesPrivilegesSpace1Role,
  securitySolutionOnlyAllSpacesRole,
  testDisabledPluginAll,
  securitySolutionOnlyDelete,
  securitySolutionOnlyNoDelete,
  observabilityOnlyReadAlerts,
  securitySolutionOnlyReadAlerts,
  securitySolutionOnlyReadNoIndexAlerts,
  securitySolutionOnlyReadDelete,
  noCasesConnectors as noCasesConnectorRole,
  onlyActions as onlyActionsRole,
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

export const secOnlyDelete: User = {
  username: 'sec_only_delete',
  password: 'sec_only_delete',
  roles: [securitySolutionOnlyDelete.name],
};

export const secOnlyReadDelete: User = {
  username: 'sec_only_read_delete',
  password: 'sec_only_read_delete',
  roles: [securitySolutionOnlyReadDelete.name],
};

export const secOnlyNoDelete: User = {
  username: 'sec_only_no_delete',
  password: 'sec_only_no_delete',
  roles: [securitySolutionOnlyNoDelete.name],
};

export const secOnlyRead: User = {
  username: 'sec_only_read',
  password: 'sec_only_read',
  roles: [securitySolutionOnlyRead.name],
};

export const secOnlyReadAlerts: User = {
  username: 'sec_only_read_alerts',
  password: 'sec_only_read_alerts',
  roles: [securitySolutionOnlyReadAlerts.name],
};

export const secSolutionOnlyReadNoIndexAlerts: User = {
  username: 'sec_only_read_no_index_alerts',
  password: 'sec_only_read_no_index_alerts',
  roles: [securitySolutionOnlyReadNoIndexAlerts.name],
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

export const obsOnlyReadAlerts: User = {
  username: 'obs_only_read_alerts',
  password: 'obs_only_read_alerts',
  roles: [observabilityOnlyReadAlerts.name],
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

export const noCasesPrivilegesSpace1: User = {
  username: 'no_cases_privileges_space1',
  password: 'no_cases_privileges_space1',
  roles: [noCasesPrivilegesSpace1Role.name],
};

export const noCasesConnectors: User = {
  username: 'no_cases_connectors',
  password: 'no_cases_connectors',
  roles: [noCasesConnectorRole.name],
};

/**
 * These users will have access to all spaces.
 */

export const secOnlySpacesAll: User = {
  username: 'sec_only_all_spaces',
  password: 'sec_only_all_spaces',
  roles: [securitySolutionOnlyAllSpacesRole.name],
};

export const onlyActions: User = {
  username: 'only_actions',
  password: 'only_actions',
  roles: [onlyActionsRole.name],
};

export const users = [
  superUser,
  secOnly,
  secOnlyRead,
  secOnlyReadAlerts,
  secSolutionOnlyReadNoIndexAlerts,
  secOnlyDelete,
  secOnlyReadDelete,
  secOnlyNoDelete,
  obsOnly,
  obsOnlyRead,
  obsOnlyReadAlerts,
  obsSec,
  obsSecRead,
  globalRead,
  noKibanaPrivileges,
  noCasesPrivilegesSpace1,
  testDisabled,
  noCasesConnectors,
  onlyActions,
];
