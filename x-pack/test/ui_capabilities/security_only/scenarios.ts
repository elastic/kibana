/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from '../common/types';

interface NoKibanaPrivileges extends User {
  username: 'no_kibana_privileges';
}
const NoKibanaPrivileges: NoKibanaPrivileges = {
  username: 'no_kibana_privileges',
  fullName: 'no_kibana_privileges',
  password: 'no_kibana_privileges-password',
  role: {
    name: 'no_kibana_privileges',
    elasticsearch: {
      indices: [
        {
          names: ['foo'],
          privileges: ['all'],
        },
      ],
    },
  },
};

interface Superuser extends User {
  username: 'superuser';
}
const Superuser: Superuser = {
  username: 'superuser',
  fullName: 'superuser',
  password: 'superuser-password',
  role: {
    name: 'superuser',
  },
};

interface LegacyAll extends User {
  username: 'legacy_all';
}
const LegacyAll: LegacyAll = {
  username: 'legacy_all',
  fullName: 'legacy_all',
  password: 'legacy_all-password',
  role: {
    name: 'legacy_all_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['all'],
        },
      ],
    },
  },
};

interface LegacyRead extends User {
  username: 'legacy_read';
}
const LegacyRead: LegacyRead = {
  username: 'legacy_read',
  fullName: 'legacy_read',
  password: 'legacy_read-password',
  role: {
    name: 'legacy_read_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read'],
        },
      ],
    },
  },
};

interface DualPrivilegesAll extends User {
  username: 'dual_privileges_all';
}
const DualPrivilegesAll: DualPrivilegesAll = {
  username: 'dual_privileges_all',
  fullName: 'dual_privileges_all',
  password: 'dual_privileges_all-password',
  role: {
    name: 'dual_privileges_all_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
  },
};

interface DualPrivilegesRead extends User {
  username: 'dual_privileges_read';
}
const DualPrivilegesRead: DualPrivilegesRead = {
  username: 'dual_privileges_read',
  fullName: 'dual_privileges_read',
  password: 'dual_privileges_read-password',
  role: {
    name: 'dual_privileges_read_role',
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: {
      global: {
        minimum: ['read'],
      },
    },
  },
};

interface All extends User {
  username: 'all';
}
const All: All = {
  username: 'all',
  fullName: 'all',
  password: 'all-password',
  role: {
    name: 'all_role',
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
  },
};

interface DiscoverAll extends User {
  username: 'discover_all';
}
const DiscoverAll: DiscoverAll = {
  username: 'discover_all',
  fullName: 'discover_all',
  password: 'discover_all-password',
  role: {
    name: 'discover_all_role',
    kibana: {
      global: {
        feature: {
          discover: ['all'],
        },
      },
    },
  },
};

interface DiscoverRead extends User {
  username: 'discover_read';
}
const DiscoverRead: DiscoverRead = {
  username: 'discover_read',
  fullName: 'discover_read',
  password: 'discover_read-password',
  role: {
    name: 'discover_read_role',
    kibana: {
      global: {
        feature: {
          discover: ['read'],
        },
      },
    },
  },
};

export type UserScenarios =
  | NoKibanaPrivileges
  | Superuser
  | LegacyAll
  | LegacyRead
  | DualPrivilegesAll
  | DualPrivilegesRead
  | All
  | DiscoverAll
  | DiscoverRead;
export const UserScenarios: UserScenarios[] = [
  NoKibanaPrivileges,
  Superuser,
  LegacyAll,
  LegacyRead,
  DualPrivilegesAll,
  DualPrivilegesRead,
  All,
  DiscoverAll,
  DiscoverRead,
];
