/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import type { Role } from '../../../utils/auth/types';

export const noIndexPrivileges: Role = {
  name: 'no_index_privileges',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const noAdhocIndexPrivileges: Role = {
  name: 'no_adhoc_index_privileges',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-security.attack.discovery.alerts-default'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const noAttacksIndexPrivileges: Role = {
  name: 'no_attacks_index_privileges',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.adhoc.alerts-security.attack.discovery.alerts-default'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const allIndexPrivileges: Role = {
  name: 'all_index_privileges',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const roles = [
  noIndexPrivileges,
  noAdhocIndexPrivileges,
  noAttacksIndexPrivileges,
  allIndexPrivileges,
];
