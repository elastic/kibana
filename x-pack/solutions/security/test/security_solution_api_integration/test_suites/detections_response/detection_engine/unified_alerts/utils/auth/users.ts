/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  securitySolutionOnlyAll,
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
  attackDiscoveryOnly,
  secAndAttackDiscoveryOnly,
];
