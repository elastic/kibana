/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import {
  BENCHMARK_SCORE_INDEX_PATTERN,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  ALERTS_INDEX_PATTERN,
  FINDINGS_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

const alertsSecurityUserIndices = [
  {
    names: [FINDINGS_INDEX_PATTERN],
    privileges: ['read'],
  },
  {
    names: [CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN],
    privileges: ['read'],
  },
  {
    names: [BENCHMARK_SCORE_INDEX_PATTERN],
    privileges: ['read'],
  },
  {
    names: [CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN],
    privileges: ['all'],
  },
  {
    names: [ALERTS_INDEX_PATTERN],
    privileges: ['all'],
  },
];

const securityUserIndinces = [
  {
    names: [FINDINGS_INDEX_PATTERN],
    privileges: ['read'],
  },
  {
    names: [CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN],
    privileges: ['read'],
  },
  {
    names: [BENCHMARK_SCORE_INDEX_PATTERN],
    privileges: ['read'],
  },
  {
    names: [CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN],
    privileges: ['all'],
  },
];

export function CspSecurityCommonProvider(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const security = getService('security');

  const roles = [
    {
      name: 'role_security_no_read',
      elasticsearch: {
        indices: securityUserIndinces,
      },
      kibana: [
        {
          base: [],
          feature: {
            fleet: ['all'],
            fleetv2: ['all'],
            savedObjectsManagement: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'role_security_read',
      elasticsearch: {
        indices: securityUserIndinces,
      },
      kibana: [
        {
          base: [],
          feature: {
            siem: ['read'],
            fleet: ['all'],
            fleetv2: ['all'],
            savedObjectsManagement: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'role_security_read_alerts',
      elasticsearch: {
        indices: alertsSecurityUserIndices,
      },
      kibana: [
        {
          base: [],
          feature: {
            siem: ['read'],
            fleet: ['all'],
            fleetv2: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'role_security_no_read_alerts',
      elasticsearch: {
        indices: alertsSecurityUserIndices,
      },
      kibana: [
        {
          base: [],
          feature: {
            fleet: ['all'],
            fleetv2: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'role_security_all',
      elasticsearch: {
        indices: securityUserIndinces,
      },
      kibana: [
        {
          base: [],
          feature: {
            siem: ['all'],
            fleet: ['all'],
            fleetv2: ['all'],
            savedObjectsManagement: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
  ];

  const users = [
    {
      name: 'role_security_read_user',
      full_name: 'security read privilege user',
      password: 'test123',
      roles: ['role_security_read'],
    },
    {
      name: 'role_security_read_user_alerts',
      full_name: 'user with 0 security privilege',
      password: 'csp123',
      roles: ['role_security_read_alerts'],
    },
    {
      name: 'role_security_no_read_user',
      full_name: 'user with 0 security privilege',
      password: 'csp123',
      roles: ['role_security_no_read'],
    },
    {
      name: 'role_security_no_read_user_alerts',
      full_name: 'user with 0 security privilege',
      password: 'csp123',
      roles: ['role_security_no_read_alerts'],
    },
    {
      name: 'role_security_all_user',
      full_name: 'user with all security privilege',
      password: 'csp123',
      roles: ['role_security_all'],
    },
  ];

  return {
    async createRoles() {
      for (const role of roles) {
        await security.role.create(role.name, {
          elasticsearch: role.elasticsearch,
          kibana: role.kibana,
        });
      }
    },

    async createUsers() {
      for (const user of users) {
        await security.user.create(user.name, {
          password: user.password,
          roles: user.roles,
          full_name: user.full_name,
        });
      }
    },

    async cleanRoles() {
      for (const role of roles) {
        await security.role.delete(role.name);
      }
    },

    async cleanUsers() {
      for (const user of users) {
        await security.user.delete(user.name);
      }
    },

    getPasswordForUser(user: string): string {
      const userConfig = users.find((u) => u.name === user);
      if (userConfig === undefined) {
        throw new Error(`Can't log in user ${user} - not defined`);
      }
      return userConfig.password;
    },
  };
}
