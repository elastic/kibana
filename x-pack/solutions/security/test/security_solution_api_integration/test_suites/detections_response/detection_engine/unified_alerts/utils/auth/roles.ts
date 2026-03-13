/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTS_FEATURE_ID,
  ATTACK_DISCOVERY_FEATURE_ID,
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

export const alertsRead: Role = {
  name: 'alerts_read_all_spaces',
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
          [ALERTS_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const alertsReadNoIndices: Role = {
  name: 'alerts_read_all_spaces_no_indices',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          [ALERTS_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const alertsReadNoDetectionIndices: Role = {
  name: 'alerts_read_all_spaces_no_detection_indices',
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
          [ALERTS_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const alertsReadNoAttackIndices: Role = {
  name: 'alerts_read_all_spaces_no_attack_indices',
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
          [ALERTS_FEATURE_ID]: ['read'],
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

export const alertsReadAndAttackDiscoveryAll: Role = {
  name: 'alerts_read_and_attack_discovery_all_spaces',
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
          [ALERTS_FEATURE_ID]: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const allRoles = [
  noKibanaPrivileges,
  alertsRead,
  alertsReadNoIndices,
  alertsReadNoDetectionIndices,
  alertsReadNoAttackIndices,
  attackDiscoveryOnlyAll,
  alertsReadAndAttackDiscoveryAll,
];
