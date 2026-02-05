/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_FEATURE_ID,
  RULES_FEATURE_ID,
} from '@kbn/security-solution-plugin/common/constants';
import type { Role } from './types';

export const noKibanaPrivileges: Role = {
  name: 'no_kibana_privileges',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['none'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesRead: Role = {
  name: 'rules_read_all_spaces',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: [
            '.alerts-security.alerts-default',
            '.alerts-security.attack.discovery.alerts-default',
          ],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [RULES_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesReadNoIndices: Role = {
  name: 'rules_read_all_spaces_no_indices',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          [RULES_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesReadNoDetectionIndices: Role = {
  name: 'rules_read_all_spaces_no_detection_indices',
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
          [RULES_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesReadNoAttackIndices: Role = {
  name: 'rules_read_all_spaces_no_attack_indices',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-security.alerts-default'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [RULES_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const attackDiscoveryOnlyAll: Role = {
  name: 'attack_discovery_only_all_spaces',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: [
            '.alerts-security.alerts-default',
            '.alerts-security.attack.discovery.alerts-default',
          ],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [ATTACK_DISCOVERY_FEATURE_ID]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesReadAndAttackDiscoveryAll: Role = {
  name: 'rules_read_and_attack_discovery_all_spaces',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: [
            '.alerts-security.alerts-default',
            '.alerts-security.attack.discovery.alerts-default',
          ],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [ATTACK_DISCOVERY_FEATURE_ID]: ['all'],
          [RULES_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const allRoles = [
  noKibanaPrivileges,
  rulesRead,
  rulesReadNoIndices,
  rulesReadNoDetectionIndices,
  rulesReadNoAttackIndices,
  attackDiscoveryOnlyAll,
  rulesReadAndAttackDiscoveryAll,
];
