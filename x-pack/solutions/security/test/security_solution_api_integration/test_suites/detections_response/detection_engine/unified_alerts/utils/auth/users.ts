/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  securitySolutionOnlyAll,
  securitySolutionAllNoIndices,
  securitySolutionAllNoDetectionIndices,
  securitySolutionAllNoAttackIndices,
  attackDiscoveryOnlyAll,
  securitySolutionAndAttackDiscoveryAll,
  noKibanaPrivileges as noKibanaPrivilegesRole,
} from './roles';
import type { User } from './types';

export const superUser: User = {
  username: 'superuser',
  password: 'superuser',
  roles: ['superuser'],
};

export const noKibanaPrivileges: User = {
  username: 'no_kibana_privileges',
  password: 'no_kibana_privileges',
  roles: [noKibanaPrivilegesRole.name],
};

export const secOnly: User = {
  username: 'sec_only_all_spaces',
  password: 'sec_only_all_spaces',
  roles: [securitySolutionOnlyAll.name],
};

export const secOnlyNoIndices: User = {
  username: 'sec_only_all_spaces_no_indices',
  password: 'sec_only_all_spaces_no_indices',
  roles: [securitySolutionAllNoIndices.name],
};

export const secOnlyNoDetectionIndices: User = {
  username: 'sec_only_all_spaces_no_detection_indices',
  password: 'sec_only_all_spaces_no_detection_indices',
  roles: [securitySolutionAllNoDetectionIndices.name],
};

export const secOnlyNoAttackIndices: User = {
  username: 'sec_only_all_spaces_no_attack_indices',
  password: 'sec_only_all_spaces_no_attack_indices',
  roles: [securitySolutionAllNoAttackIndices.name],
};

export const attackDiscoveryOnly: User = {
  username: 'attack_discovery_only_all_spaces',
  password: 'attack_discovery_only_all_spaces',
  roles: [attackDiscoveryOnlyAll.name],
};

export const secAndAttackDiscoveryOnly: User = {
  username: 'sec_and_attack_discovery_all_spaces',
  password: 'sec_and_attack_discovery_all_spaces',
  roles: [securitySolutionAndAttackDiscoveryAll.name],
};

export const allUsers = [
  superUser,
  noKibanaPrivileges,
  secOnly,
  secOnlyNoIndices,
  secOnlyNoDetectionIndices,
  secOnlyNoAttackIndices,
  attackDiscoveryOnly,
  secAndAttackDiscoveryOnly,
];
