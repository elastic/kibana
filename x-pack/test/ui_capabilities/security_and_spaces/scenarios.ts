/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Space, User } from '../common/types';

// these are the users that we care about
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

const LegacyRead: User = {
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
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
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
    kibana: {
      global: {
        minimum: ['read'],
      },
    },
  },
};

const GlobalAll: User = {
  username: 'global_all',
  fullName: 'global_all',
  password: 'global_all-password',
  role: {
    name: 'global_all_role',
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
  },
};

const GlobalRead: User = {
  username: 'global_read',
  fullName: 'global_read',
  password: 'global_read-password',
  role: {
    name: 'global_read_role',
    kibana: {
      global: {
        minimum: ['read'],
      },
    },
  },
};

const SpaceWithAllFeaturesAll: User = {
  username: 'space_with_all_features_all',
  fullName: 'space_with_all_features_all',
  password: 'space_with_all_features_all-password',
  role: {
    name: 'space_with_all_features_all_role',
    kibana: {
      space: {
        space_with_all_features: {
          minimum: ['all'],
        },
      },
    },
  },
};

const SpaceWithAllFeaturesRead: User = {
  username: 'space_with_all_features_read',
  fullName: 'space_with_all_features_read',
  password: 'space_with_all_features_read-password',
  role: {
    name: 'space_with_all_features_read_role',
    kibana: {
      space: {
        space_with_all_features: {
          minimum: ['read'],
        },
      },
    },
  },
};

const SpaceWithNoFeaturesAll: User = {
  username: 'space_with_no_features_all',
  fullName: 'space_with_no_features_all',
  password: 'space_with_no_features_all-password',
  role: {
    name: 'space_with_no_features_all_role',
    kibana: {
      space: {
        space_with_no_features: {
          minimum: ['all'],
        },
      },
    },
  },
};

const SpaceWithNoFeaturesRead: User = {
  username: 'space_with_no_features_read',
  fullName: 'space_with_no_features_read',
  password: 'space_with_no_features_read-password',
  role: {
    name: 'space_with_no_features_read_role',
    kibana: {
      space: {
        space_with_no_features: {
          minimum: ['read'],
        },
      },
    },
  },
};

export const Users: User[] = [
  Superuser,
  LegacyAll,
  LegacyRead,
  DualPrivilegesAll,
  DualPrivilegesRead,
  GlobalAll,
  GlobalRead,
  SpaceWithAllFeaturesAll,
  SpaceWithAllFeaturesRead,
  SpaceWithNoFeaturesAll,
  SpaceWithNoFeaturesRead,
];

// these are the spaces that we care about
const SpaceWithAllFeatures: Space = {
  id: 'space_with_all_features',
  name: 'space_with_all_features',
  disabledFeatures: [],
};

const SpaceWithNoFeatures: Space = {
  id: 'space_with_no_features',
  name: 'space_with_no_features',
  disabledFeatures: [
    'advancedSettings',
    'apm',
    'canvas',
    'dashboard',
    'dev_tools',
    'discover',
    'graph',
    'infrastructure',
    'logs',
    'ml',
    'monitoring',
    'timelion',
    'visualize',
  ],
};

export const Spaces: Space[] = [SpaceWithAllFeatures, SpaceWithNoFeatures];

interface Scenario {
  user: User;
  space: Space;
}

interface SuperuserAtSpaceWithAllFeatures extends Scenario {
  id: 'superuser_at_space_with_all_features';
}
const SuperuserAtSpaceWithAllFeatures: SuperuserAtSpaceWithAllFeatures = {
  id: 'superuser_at_space_with_all_features',
  user: Superuser,
  space: SpaceWithAllFeatures,
};

interface SuperuserAtSpaceWithNoFeatures extends Scenario {
  id: 'superuser_at_space_with_no_features';
}
const SuperuserAtSpaceWithNoFeatures: SuperuserAtSpaceWithNoFeatures = {
  id: 'superuser_at_space_with_no_features',
  user: Superuser,
  space: SpaceWithNoFeatures,
};

interface LegacyAllAtSpaceWithAllFeatures extends Scenario {
  id: 'legacy_all_at_space_with_all_features';
}
const LegacyAllAtSpaceWithAllFeatures: LegacyAllAtSpaceWithAllFeatures = {
  id: 'legacy_all_at_space_with_all_features',
  user: LegacyAll,
  space: SpaceWithAllFeatures,
};

interface LegacyAllAtSpaceWithNoFeatures extends Scenario {
  id: 'legacy_all_at_space_with_no_features';
}
const LegacyAllAtSpaceWithNoFeatures: LegacyAllAtSpaceWithNoFeatures = {
  id: 'legacy_all_at_space_with_no_features',
  user: LegacyAll,
  space: SpaceWithNoFeatures,
};

interface LegacyReadAtSpaceWithAllFeatures extends Scenario {
  id: 'legacy_read_at_space_with_all_features';
}
const LegacyReadAtSpaceWithAllFeatures: LegacyReadAtSpaceWithAllFeatures = {
  id: 'legacy_read_at_space_with_all_features',
  user: LegacyRead,
  space: SpaceWithAllFeatures,
};

interface LegacyReadAtSpaceWithNoFeatures extends Scenario {
  id: 'legacy_read_at_space_with_no_features';
}
const LegacyReadAtSpaceWithNoFeatures: LegacyReadAtSpaceWithNoFeatures = {
  id: 'legacy_read_at_space_with_no_features',
  user: LegacyRead,
  space: SpaceWithNoFeatures,
};

interface DualPrivilegesAllAtSpaceWithAllFeatures extends Scenario {
  id: 'dual_privileges_all_at_space_with_all_features';
}
const DualPrivilegesAllAtSpaceWithAllFeatures: DualPrivilegesAllAtSpaceWithAllFeatures = {
  id: 'dual_privileges_all_at_space_with_all_features',
  user: DualPrivilegesAll,
  space: SpaceWithAllFeatures,
};

interface DualPrivilegesAllAtSpaceWithNoFeatures extends Scenario {
  id: 'dual_privileges_all_at_space_with_no_features';
}
const DualPrivilegesAllAtSpaceWithNoFeatures: DualPrivilegesAllAtSpaceWithNoFeatures = {
  id: 'dual_privileges_all_at_space_with_no_features',
  user: DualPrivilegesAll,
  space: SpaceWithNoFeatures,
};

interface DualPrivilegesReadAtSpaceWithAllFeatures extends Scenario {
  id: 'dual_privileges_read_at_space_with_all_features';
}
const DualPrivilegesReadAtSpaceWithAllFeatures: DualPrivilegesReadAtSpaceWithAllFeatures = {
  id: 'dual_privileges_read_at_space_with_all_features',
  user: DualPrivilegesRead,
  space: SpaceWithAllFeatures,
};

interface DualPrivilegesReadAtSpaceWithNoFeatures extends Scenario {
  id: 'dual_privileges_read_at_space_with_no_features';
}
const DualPrivilegesReadAtSpaceWithNoFeatures: DualPrivilegesReadAtSpaceWithNoFeatures = {
  id: 'dual_privileges_read_at_space_with_no_features',
  user: DualPrivilegesRead,
  space: SpaceWithNoFeatures,
};

interface GlobalAllAtSpaceWithAllFeatures extends Scenario {
  id: 'global_all_at_space_with_all_features';
}
const GlobalAllAtSpaceWithAllFeatures: GlobalAllAtSpaceWithAllFeatures = {
  id: 'global_all_at_space_with_all_features',
  user: GlobalAll,
  space: SpaceWithAllFeatures,
};

interface GlobalAllAtSpaceWithNoFeatures extends Scenario {
  id: 'global_all_at_space_with_no_features';
}
const GlobalAllAtSpaceWithNoFeatures: GlobalAllAtSpaceWithNoFeatures = {
  id: 'global_all_at_space_with_no_features',
  user: GlobalAll,
  space: SpaceWithNoFeatures,
};

interface GlobalReadAtSpaceWithAllFeatures extends Scenario {
  id: 'global_read_at_space_with_all_features';
}
const GlobalReadAtSpaceWithAllFeatures: GlobalReadAtSpaceWithAllFeatures = {
  id: 'global_read_at_space_with_all_features',
  user: GlobalRead,
  space: SpaceWithAllFeatures,
};

interface GlobalReadAtSpaceWithNoFeatures extends Scenario {
  id: 'global_read_at_space_with_no_features';
}
const GlobalReadAtSpaceWithNoFeatures: GlobalReadAtSpaceWithNoFeatures = {
  id: 'global_read_at_space_with_no_features',
  user: GlobalRead,
  space: SpaceWithNoFeatures,
};

interface SpaceWithAllFeaturesAllAtSpaceWithAllFeatures extends Scenario {
  id: 'space_with_all_features_all_at_space_with_all_features';
}
const SpaceWithAllFeaturesAllAtSpaceWithAllFeatures: SpaceWithAllFeaturesAllAtSpaceWithAllFeatures = {
  id: 'space_with_all_features_all_at_space_with_all_features',
  user: SpaceWithAllFeaturesAll,
  space: SpaceWithAllFeatures,
};

interface SpaceWithAllFeaturesAllAtSpaceWithNoFeatures extends Scenario {
  id: 'space_with_all_features_all_at_space_with_no_features';
}
const SpaceWithAllFeaturesAllAtSpaceWithNoFeatures: SpaceWithAllFeaturesAllAtSpaceWithNoFeatures = {
  id: 'space_with_all_features_all_at_space_with_no_features',
  user: SpaceWithAllFeaturesAll,
  space: SpaceWithNoFeatures,
};

interface SpaceWithAllFeaturesReadAtSpaceWithAllFeatures extends Scenario {
  id: 'space_with_all_features_read_at_space_with_all_features';
}
const SpaceWithAllFeaturesReadAtSpaceWithAllFeatures: SpaceWithAllFeaturesReadAtSpaceWithAllFeatures = {
  id: 'space_with_all_features_read_at_space_with_all_features',
  user: SpaceWithAllFeaturesRead,
  space: SpaceWithAllFeatures,
};

interface SpaceWithAllFeaturesReadAtSpaceWithNoFeatures extends Scenario {
  id: 'space_with_all_features_read_at_space_with_no_features';
}
const SpaceWithAllFeaturesReadAtSpaceWithNoFeatures: SpaceWithAllFeaturesReadAtSpaceWithNoFeatures = {
  id: 'space_with_all_features_read_at_space_with_no_features',
  user: SpaceWithAllFeaturesRead,
  space: SpaceWithNoFeatures,
};

interface SpaceWithNoFeaturesAllAtSpaceWithAllFeatures extends Scenario {
  id: 'space_with_no_features_all_at_space_with_all_features';
}
const SpaceWithNoFeaturesAllAtSpaceWithAllFeatures: SpaceWithNoFeaturesAllAtSpaceWithAllFeatures = {
  id: 'space_with_no_features_all_at_space_with_all_features',
  user: SpaceWithNoFeaturesAll,
  space: SpaceWithAllFeatures,
};

interface SpaceWithNoFeaturesAllAtSpaceWithNoFeatures extends Scenario {
  id: 'space_with_no_features_all_at_space_with_no_features';
}
const SpaceWithNoFeaturesAllAtSpaceWithNoFeatures: SpaceWithNoFeaturesAllAtSpaceWithNoFeatures = {
  id: 'space_with_no_features_all_at_space_with_no_features',
  user: SpaceWithNoFeaturesAll,
  space: SpaceWithNoFeatures,
};

interface SpaceWithNoFeaturesReadAtSpaceWithAllFeatures extends Scenario {
  id: 'space_with_no_features_read_at_space_with_all_features';
}
const SpaceWithNoFeaturesReadAtSpaceWithAllFeatures: SpaceWithNoFeaturesReadAtSpaceWithAllFeatures = {
  id: 'space_with_no_features_read_at_space_with_all_features',
  user: SpaceWithNoFeaturesRead,
  space: SpaceWithAllFeatures,
};

interface SpaceWithNoFeaturesReadAtSpaceWithNoFeatures extends Scenario {
  id: 'space_with_no_features_read_at_space_with_no_features';
}
const SpaceWithNoFeaturesReadAtSpaceWithNoFeatures: SpaceWithNoFeaturesReadAtSpaceWithNoFeatures = {
  id: 'space_with_no_features_read_at_space_with_no_features',
  user: SpaceWithNoFeaturesRead,
  space: SpaceWithNoFeatures,
};

export type UserAtSpaceScenarios =
  | SuperuserAtSpaceWithAllFeatures
  | SuperuserAtSpaceWithNoFeatures
  | LegacyAllAtSpaceWithAllFeatures
  | LegacyAllAtSpaceWithNoFeatures
  | LegacyReadAtSpaceWithAllFeatures
  | LegacyReadAtSpaceWithNoFeatures
  | DualPrivilegesAllAtSpaceWithAllFeatures
  | DualPrivilegesAllAtSpaceWithNoFeatures
  | DualPrivilegesReadAtSpaceWithAllFeatures
  | DualPrivilegesReadAtSpaceWithNoFeatures
  | GlobalAllAtSpaceWithAllFeatures
  | GlobalAllAtSpaceWithNoFeatures
  | GlobalReadAtSpaceWithAllFeatures
  | GlobalReadAtSpaceWithNoFeatures
  | SpaceWithAllFeaturesAllAtSpaceWithAllFeatures
  | SpaceWithAllFeaturesAllAtSpaceWithNoFeatures
  | SpaceWithAllFeaturesReadAtSpaceWithAllFeatures
  | SpaceWithAllFeaturesReadAtSpaceWithNoFeatures
  | SpaceWithNoFeaturesAllAtSpaceWithAllFeatures
  | SpaceWithNoFeaturesAllAtSpaceWithNoFeatures
  | SpaceWithNoFeaturesReadAtSpaceWithAllFeatures
  | SpaceWithNoFeaturesReadAtSpaceWithNoFeatures;
export const UserAtSpaceScenarios: UserAtSpaceScenarios[] = [
  SuperuserAtSpaceWithAllFeatures,
  SuperuserAtSpaceWithNoFeatures,
  LegacyAllAtSpaceWithAllFeatures,
  LegacyAllAtSpaceWithNoFeatures,
  LegacyReadAtSpaceWithAllFeatures,
  LegacyReadAtSpaceWithNoFeatures,
  DualPrivilegesAllAtSpaceWithAllFeatures,
  DualPrivilegesAllAtSpaceWithNoFeatures,
  DualPrivilegesReadAtSpaceWithAllFeatures,
  DualPrivilegesReadAtSpaceWithNoFeatures,
  GlobalAllAtSpaceWithAllFeatures,
  GlobalAllAtSpaceWithNoFeatures,
  GlobalReadAtSpaceWithAllFeatures,
  GlobalReadAtSpaceWithNoFeatures,
  SpaceWithAllFeaturesAllAtSpaceWithAllFeatures,
  SpaceWithAllFeaturesAllAtSpaceWithNoFeatures,
  SpaceWithAllFeaturesReadAtSpaceWithAllFeatures,
  SpaceWithAllFeaturesReadAtSpaceWithNoFeatures,
  SpaceWithNoFeaturesAllAtSpaceWithAllFeatures,
  SpaceWithNoFeaturesAllAtSpaceWithNoFeatures,
  SpaceWithNoFeaturesReadAtSpaceWithAllFeatures,
  SpaceWithNoFeaturesReadAtSpaceWithNoFeatures,
];
