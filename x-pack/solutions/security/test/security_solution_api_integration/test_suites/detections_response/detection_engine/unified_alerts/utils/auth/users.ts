/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertsRead,
  alertsReadNoIndices,
  alertsReadNoDetectionIndices,
  alertsReadNoAttackIndices,
  attackDiscoveryOnlyAll,
  alertsReadAndAttackDiscoveryAll,
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

export const alertsReadUser: User = {
  username: 'alerts_read_all_spaces',
  password: 'alerts_read_all_spaces',
  roles: [alertsRead.name],
};

export const alertsReadNoIndicesUser: User = {
  username: 'alerts_read_all_spaces_no_indices',
  password: 'alerts_read_all_spaces_no_indices',
  roles: [alertsReadNoIndices.name],
};

export const alertsReadNoDetectionIndicesUser: User = {
  username: 'alerts_read_all_spaces_no_detection_indices',
  password: 'alerts_read_all_spaces_no_detection_indices',
  roles: [alertsReadNoDetectionIndices.name],
};

export const alertsReadNoAttackIndicesUser: User = {
  username: 'alerts_read_all_spaces_no_attack_indices',
  password: 'alerts_read_all_spaces_no_attack_indices',
  roles: [alertsReadNoAttackIndices.name],
};

export const attackDiscoveryOnly: User = {
  username: 'attack_discovery_only_all_spaces',
  password: 'attack_discovery_only_all_spaces',
  roles: [attackDiscoveryOnlyAll.name],
};

export const alertsReadAndAttackDiscoveryAllUser: User = {
  username: 'alerts_read_and_attack_discovery_all_spaces',
  password: 'alerts_read_and_attack_discovery_all_spaces',
  roles: [alertsReadAndAttackDiscoveryAll.name],
};

export const allUsers = [
  superUser,
  noKibanaPrivileges,
  alertsReadUser,
  alertsReadNoIndicesUser,
  alertsReadNoDetectionIndicesUser,
  alertsReadNoAttackIndicesUser,
  attackDiscoveryOnly,
  alertsReadAndAttackDiscoveryAllUser,
];
