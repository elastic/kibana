/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Space, User } from '../common/types';

const NoKibanaPrivileges: User = {
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

const Superuser: User = {
  username: 'superuser',
  fullName: 'superuser',
  password: 'superuser-password',
  role: {
    name: 'superuser',
  },
};

const LegacyAll: User = {
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

const DualPrivilegesAll: User = {
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

const DualPrivilegesRead: User = {
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

const GlobalAll: User = {
  username: 'global_all',
  fullName: 'global_all',
  password: 'global_all-password',
  role: {
    name: 'global_all_role',
    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
  },
};

const GlobalRead: User = {
  username: 'global_read',
  fullName: 'global_read',
  password: 'global_read-password',
  role: {
    name: 'global_read_role',
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
};

const FooAll: User = {
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

const FooRead: User = {
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

interface FooAll extends User {
  username: 'foo_all';
}
interface FooRead extends User {
  username: 'foo_read';
}

const EverythingSpaceAll: User = {
  username: 'everything_space_all',
  fullName: 'everything_space_all',
  password: 'everything_space_all-password',
  role: {
    name: 'everything_space_all_role',
    kibana: [
      {
        base: ['all'],
        spaces: ['everything_space'],
      },
    ],
  },
};

const EverythingSpaceRead: User = {
  username: 'everything_space_read',
  fullName: 'everything_space_read',
  password: 'everything_space_read-password',
  role: {
    name: 'everything_space_read_role',
    kibana: [
      {
        base: ['read'],
        spaces: ['everything_space'],
      },
    ],
  },
};

const NothingSpaceAll: User = {
  username: 'nothing_space_all',
  fullName: 'nothing_space_all',
  password: 'nothing_space_all-password',
  role: {
    name: 'nothing_space_all_role',
    kibana: [
      {
        base: ['all'],
        spaces: ['nothing_space'],
      },
    ],
  },
};

const NothingSpaceRead: User = {
  username: 'nothing_space_read',
  fullName: 'nothing_space_read',
  password: 'nothing_space_read-password',
  role: {
    name: 'nothing_space_read_role',
    kibana: [
      {
        base: ['read'],
        spaces: ['nothing_space'],
      },
    ],
  },
};

export const Users: User[] = [
  NoKibanaPrivileges,
  Superuser,
  LegacyAll,
  DualPrivilegesAll,
  DualPrivilegesRead,
  GlobalAll,
  GlobalRead,
  FooAll,
  FooRead,
  EverythingSpaceAll,
  EverythingSpaceRead,
  NothingSpaceAll,
  NothingSpaceRead,
];

const EverythingSpace: Space = {
  id: 'everything_space',
  name: 'everything_space',
  disabledFeatures: [],
};

const NothingSpace: Space = {
  id: 'nothing_space',
  name: 'nothing_space',
  disabledFeatures: '*',
};

export const Spaces: Space[] = [EverythingSpace, NothingSpace];

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

interface Scenario {
  user: User;
  space: Space;
}

interface NoKibanaPrivilegesAtEverythingSpace extends Scenario {
  id: 'no_kibana_privileges at everything_space';
}
const NoKibanaPrivilegesAtEverythingSpace: NoKibanaPrivilegesAtEverythingSpace = {
  id: 'no_kibana_privileges at everything_space',
  user: NoKibanaPrivileges,
  space: EverythingSpace,
};

interface NoKibanaPrivilegesAtNothingSpace extends Scenario {
  id: 'no_kibana_privileges at nothing_space';
}
const NoKibanaPrivilegesAtNothingSpace: NoKibanaPrivilegesAtNothingSpace = {
  id: 'no_kibana_privileges at nothing_space',
  user: NoKibanaPrivileges,
  space: NothingSpace,
};

interface SuperuserAtEverythingSpace extends Scenario {
  id: 'superuser at everything_space';
}
const SuperuserAtEverythingSpace: SuperuserAtEverythingSpace = {
  id: 'superuser at everything_space',
  user: Superuser,
  space: EverythingSpace,
};

interface SuperuserAtNothingSpace extends Scenario {
  id: 'superuser at nothing_space';
}
const SuperuserAtNothingSpace: SuperuserAtNothingSpace = {
  id: 'superuser at nothing_space',
  user: Superuser,
  space: NothingSpace,
};

interface LegacyAllAtEverythingSpace extends Scenario {
  id: 'legacy_all at everything_space';
}
const LegacyAllAtEverythingSpace: LegacyAllAtEverythingSpace = {
  id: 'legacy_all at everything_space',
  user: LegacyAll,
  space: EverythingSpace,
};

interface LegacyAllAtNothingSpace extends Scenario {
  id: 'legacy_all at nothing_space';
}
const LegacyAllAtNothingSpace: LegacyAllAtNothingSpace = {
  id: 'legacy_all at nothing_space',
  user: LegacyAll,
  space: NothingSpace,
};

interface DualPrivilegesAllAtEverythingSpace extends Scenario {
  id: 'dual_privileges_all at everything_space';
}
const DualPrivilegesAllAtEverythingSpace: DualPrivilegesAllAtEverythingSpace = {
  id: 'dual_privileges_all at everything_space',
  user: DualPrivilegesAll,
  space: EverythingSpace,
};

interface DualPrivilegesAllAtNothingSpace extends Scenario {
  id: 'dual_privileges_all at nothing_space';
}
const DualPrivilegesAllAtNothingSpace: DualPrivilegesAllAtNothingSpace = {
  id: 'dual_privileges_all at nothing_space',
  user: DualPrivilegesAll,
  space: NothingSpace,
};

interface DualPrivilegesReadAtEverythingSpace extends Scenario {
  id: 'dual_privileges_read at everything_space';
}
const DualPrivilegesReadAtEverythingSpace: DualPrivilegesReadAtEverythingSpace = {
  id: 'dual_privileges_read at everything_space',
  user: DualPrivilegesRead,
  space: EverythingSpace,
};

interface DualPrivilegesReadAtNothingSpace extends Scenario {
  id: 'dual_privileges_read at nothing_space';
}
const DualPrivilegesReadAtNothingSpace: DualPrivilegesReadAtNothingSpace = {
  id: 'dual_privileges_read at nothing_space',
  user: DualPrivilegesRead,
  space: NothingSpace,
};

interface GlobalAllAtEverythingSpace extends Scenario {
  id: 'global_all at everything_space';
}
const GlobalAllAtEverythingSpace: GlobalAllAtEverythingSpace = {
  id: 'global_all at everything_space',
  user: GlobalAll,
  space: EverythingSpace,
};

interface GlobalAllAtNothingSpace extends Scenario {
  id: 'global_all at nothing_space';
}
const GlobalAllAtNothingSpace: GlobalAllAtNothingSpace = {
  id: 'global_all at nothing_space',
  user: GlobalAll,
  space: NothingSpace,
};

interface GlobalReadAtEverythingSpace extends Scenario {
  id: 'global_read at everything_space';
}
const GlobalReadAtEverythingSpace: GlobalReadAtEverythingSpace = {
  id: 'global_read at everything_space',
  user: GlobalRead,
  space: EverythingSpace,
};

interface GlobalReadAtNothingSpace extends Scenario {
  id: 'global_read at nothing_space';
}
const GlobalReadAtNothingSpace: GlobalReadAtNothingSpace = {
  id: 'global_read at nothing_space',
  user: GlobalRead,
  space: NothingSpace,
};

interface FooAllAtEverythingSpace extends Scenario {
  id: 'foo_all at everything_space';
}
const FooAllAtEverythingSpace: FooAllAtEverythingSpace = {
  id: 'foo_all at everything_space',
  user: FooAll,
  space: EverythingSpace,
};

interface FooAllAtNothingSpace extends Scenario {
  id: 'foo_all at nothing_space';
}
const FooAllAtNothingSpace: FooAllAtNothingSpace = {
  id: 'foo_all at nothing_space',
  user: FooAll,
  space: NothingSpace,
};

interface FooReadAtEverythingSpace extends Scenario {
  id: 'foo_read at everything_space';
}
const FooReadAtEverythingSpace: FooReadAtEverythingSpace = {
  id: 'foo_read at everything_space',
  user: FooRead,
  space: EverythingSpace,
};

interface FooReadAtNothingSpace extends Scenario {
  id: 'foo_read at nothing_space';
}
const FooReadAtNothingSpace: FooReadAtNothingSpace = {
  id: 'foo_read at nothing_space',
  user: FooRead,
  space: NothingSpace,
};

interface EverythingSpaceAllAtEverythingSpace extends Scenario {
  id: 'everything_space_all at everything_space';
}
const EverythingSpaceAllAtEverythingSpace: EverythingSpaceAllAtEverythingSpace = {
  id: 'everything_space_all at everything_space',
  user: EverythingSpaceAll,
  space: EverythingSpace,
};

interface EverythingSpaceAllAtNothingSpace extends Scenario {
  id: 'everything_space_all at nothing_space';
}
const EverythingSpaceAllAtNothingSpace: EverythingSpaceAllAtNothingSpace = {
  id: 'everything_space_all at nothing_space',
  user: EverythingSpaceAll,
  space: NothingSpace,
};

interface EverythingSpaceReadAtEverythingSpace extends Scenario {
  id: 'everything_space_read at everything_space';
}
const EverythingSpaceReadAtEverythingSpace: EverythingSpaceReadAtEverythingSpace = {
  id: 'everything_space_read at everything_space',
  user: EverythingSpaceRead,
  space: EverythingSpace,
};

interface EverythingSpaceReadAtNothingSpace extends Scenario {
  id: 'everything_space_read at nothing_space';
}
const EverythingSpaceReadAtNothingSpace: EverythingSpaceReadAtNothingSpace = {
  id: 'everything_space_read at nothing_space',
  user: EverythingSpaceRead,
  space: NothingSpace,
};

interface NothingSpaceAllAtEverythingSpace extends Scenario {
  id: 'nothing_space_all at everything_space';
}
const NothingSpaceAllAtEverythingSpace: NothingSpaceAllAtEverythingSpace = {
  id: 'nothing_space_all at everything_space',
  user: NothingSpaceAll,
  space: EverythingSpace,
};

interface NothingSpaceAllAtNothingSpace extends Scenario {
  id: 'nothing_space_all at nothing_space';
}
const NothingSpaceAllAtNothingSpace: NothingSpaceAllAtNothingSpace = {
  id: 'nothing_space_all at nothing_space',
  user: NothingSpaceAll,
  space: NothingSpace,
};

interface NothingSpaceReadAtEverythingSpace extends Scenario {
  id: 'nothing_space_read at everything_space';
}
const NothingSpaceReadAtEverythingSpace: NothingSpaceReadAtEverythingSpace = {
  id: 'nothing_space_read at everything_space',
  user: NothingSpaceRead,
  space: EverythingSpace,
};

interface NothingSpaceReadAtNothingSpace extends Scenario {
  id: 'nothing_space_read at nothing_space';
}
const NothingSpaceReadAtNothingSpace: NothingSpaceReadAtNothingSpace = {
  id: 'nothing_space_read at nothing_space',
  user: NothingSpaceRead,
  space: NothingSpace,
};

export const UserAtSpaceScenarios = [
  NoKibanaPrivilegesAtEverythingSpace,
  NoKibanaPrivilegesAtNothingSpace,
  SuperuserAtEverythingSpace,
  SuperuserAtNothingSpace,
  LegacyAllAtEverythingSpace,
  LegacyAllAtNothingSpace,
  DualPrivilegesAllAtEverythingSpace,
  DualPrivilegesAllAtNothingSpace,
  DualPrivilegesReadAtEverythingSpace,
  DualPrivilegesReadAtNothingSpace,
  GlobalAllAtEverythingSpace,
  GlobalAllAtNothingSpace,
  GlobalReadAtEverythingSpace,
  GlobalReadAtNothingSpace,
  FooAllAtEverythingSpace,
  FooAllAtNothingSpace,
  FooReadAtEverythingSpace,
  FooReadAtNothingSpace,
  EverythingSpaceAllAtEverythingSpace,
  EverythingSpaceAllAtNothingSpace,
  EverythingSpaceReadAtEverythingSpace,
  EverythingSpaceReadAtNothingSpace,
  NothingSpaceAllAtEverythingSpace,
  NothingSpaceAllAtNothingSpace,
  NothingSpaceReadAtEverythingSpace,
  NothingSpaceReadAtNothingSpace,
] as const;
