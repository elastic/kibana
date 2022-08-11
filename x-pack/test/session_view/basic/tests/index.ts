/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../rule_registry/common/lib/authentication';

import {
  superUser,
  globalRead,
  secOnlyReadSpacesAll,
  obsOnlySpacesAll,
  noKibanaPrivileges,
} from '../../../rule_registry/common/lib/authentication/users';

import { noKibanaPrivileges as noKibanaPrivilegesRole } from '../../../rule_registry/common/lib/authentication/roles';

import { Role } from '../../../rule_registry/common/lib/authentication/types';

const globalReadRole: Role = {
  name: 'global_read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          privileges: ['all'],
          names: ['logs-*'],
        },
      ],
    },
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
};

export const securitySolutionOnlyReadSpacesAll: Role = {
  name: 'sec_only_read_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          privileges: ['all'],
          names: ['logs-*'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityOnlyAllSpacesAll: Role = {
  name: 'obs_only_all_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          privileges: ['all'],
          names: ['logs-*'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          apm: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const users = [superUser, globalRead, secOnlyReadSpacesAll, obsOnlySpacesAll, noKibanaPrivileges];
const roles = [
  globalReadRole,
  securitySolutionOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAll,
  noKibanaPrivilegesRole,
];

// eslint-disable-next-line import/no-default-export
export default function kubernetesSecurityApiIntegrationTests({
  loadTestFile,
  getService,
}: FtrProviderContext) {
  describe('Session View API (basic)', function () {
    before(async () => {
      await createUsersAndRoles(getService, users, roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, users, roles);
    });

    loadTestFile(require.resolve('./process_events_route'));
    loadTestFile(require.resolve('./io_events_route'));
    loadTestFile(require.resolve('./get_total_io_bytes_route'));
  });
}
