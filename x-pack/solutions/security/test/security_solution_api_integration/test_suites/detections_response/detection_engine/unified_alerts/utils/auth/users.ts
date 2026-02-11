/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  rulesRead,
  rulesReadNoIndices,
  rulesReadNoDetectionIndices,
  rulesReadNoAttackIndices,
  attackDiscoveryOnlyAll,
  rulesReadAndAttackDiscoveryAll,
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

export const rulesReadUser: User = {
  username: 'rules_read_all_spaces',
  password: 'rules_read_all_spaces',
  roles: [rulesRead.name],
};

export const rulesReadNoIndicesUser: User = {
  username: 'rules_read_all_spaces_no_indices',
  password: 'rules_read_all_spaces_no_indices',
  roles: [rulesReadNoIndices.name],
};

export const rulesReadNoDetectionIndicesUser: User = {
  username: 'rules_read_all_spaces_no_detection_indices',
  password: 'rules_read_all_spaces_no_detection_indices',
  roles: [rulesReadNoDetectionIndices.name],
};

export const rulesReadNoAttackIndicesUser: User = {
  username: 'rules_read_all_spaces_no_attack_indices',
  password: 'rules_read_all_spaces_no_attack_indices',
  roles: [rulesReadNoAttackIndices.name],
};

export const attackDiscoveryOnly: User = {
  username: 'attack_discovery_only_all_spaces',
  password: 'attack_discovery_only_all_spaces',
  roles: [attackDiscoveryOnlyAll.name],
};

export const rulesReadAndAttackDiscoveryAllUser: User = {
  username: 'rules_read_and_attack_discovery_all_spaces',
  password: 'rules_read_and_attack_discovery_all_spaces',
  roles: [rulesReadAndAttackDiscoveryAll.name],
};

export const allUsers = [
  superUser,
  noKibanaPrivileges,
  rulesReadUser,
  rulesReadNoIndicesUser,
  rulesReadNoDetectionIndicesUser,
  rulesReadNoAttackIndicesUser,
  attackDiscoveryOnly,
  rulesReadAndAttackDiscoveryAllUser,
];
