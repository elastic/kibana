/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomRoleSpecification, User } from '../common/types';

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

const allRole: CustomRoleSpecification = {
  name: 'all_role',
  kibana: [
    {
      base: ['all'],
      spaces: ['*'],
    },
  ],
};

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
    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
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
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
};

interface All extends User {
  username: 'all';
}
const All: All = {
  username: 'all',
  fullName: 'all',
  password: 'all-password',
  role: allRole,
};

interface Read extends User {
  username: 'read';
}
const Read: Read = {
  username: 'read',
  fullName: 'read',
  password: 'read-password',
  role: {
    name: 'read_role',
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
};

interface FooAll extends User {
  username: 'foo_all';
}
const FooAll: FooAll = {
  username: 'foo_all',
  fullName: 'foo_all',
  password: 'foo_all-password',
  role: {
    name: 'foo_all_role',
    kibana: [
      {
        feature: {
          foo: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

interface FooRead extends User {
  username: 'foo_read';
}
const FooRead: FooRead = {
  username: 'foo_read',
  fullName: 'foo_read',
  password: 'foo_read-password',
  role: {
    name: 'foo_read_role',
    kibana: [
      {
        feature: {
          foo: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const UserScenarios: [
  NoKibanaPrivileges,
  Superuser,
  LegacyAll,
  DualPrivilegesAll,
  DualPrivilegesRead,
  All,
  Read,
  FooAll,
  FooRead
] = [
  NoKibanaPrivileges,
  Superuser,
  LegacyAll,
  DualPrivilegesAll,
  DualPrivilegesRead,
  All,
  Read,
  FooAll,
  FooRead,
];
