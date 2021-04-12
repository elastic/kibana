/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Space, User } from '../common/types';
import { ES_TEST_INDEX_NAME } from '../common/lib';

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
        {
          names: [`${ES_TEST_INDEX_NAME}*`],
          privileges: ['all'],
        },
      ],
    },
  },
};

export const Superuser: User = {
  username: 'superuser',
  fullName: 'superuser',
  password: 'superuser-password',
  role: {
    name: 'superuser',
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
        feature: {
          actions: ['read'],
          alertsFixture: ['read'],
          alertsRestrictedFixture: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      indices: [
        {
          names: [`${ES_TEST_INDEX_NAME}*`],
          privileges: ['all'],
        },
      ],
    },
  },
};

const Space1All: User = {
  username: 'space_1_all',
  fullName: 'space_1_all',
  password: 'space_1_all-password',
  role: {
    name: 'space_1_all_role',
    kibana: [
      {
        feature: {
          actions: ['all'],
          alertsFixture: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
    elasticsearch: {
      indices: [
        {
          names: [`${ES_TEST_INDEX_NAME}*`],
          privileges: ['all'],
        },
      ],
    },
  },
};

const Space1AllAlertingNoneActions: User = {
  username: 'space_1_all_alerts_none_actions',
  fullName: 'space_1_all_alerts_none_actions',
  password: 'space_1_all_alerts_none_actions-password',
  role: {
    name: 'space_1_all_alerts_none_actions_role',
    kibana: [
      {
        feature: {
          alertsFixture: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
    elasticsearch: {
      indices: [
        {
          names: [`${ES_TEST_INDEX_NAME}*`],
          privileges: ['all'],
        },
      ],
    },
  },
};

const Space1AllWithRestrictedFixture: User = {
  username: 'space_1_all_with_restricted_fixture',
  fullName: 'space_1_all_with_restricted_fixture',
  password: 'space_1_all_with_restricted_fixture-password',
  role: {
    name: 'space_1_all_with_restricted_fixture_role',
    kibana: [
      {
        feature: {
          actions: ['all'],
          alertsFixture: ['all'],
          alertsRestrictedFixture: ['all'],
        },
        spaces: ['space1'],
      },
    ],
    elasticsearch: {
      indices: [
        {
          names: [`${ES_TEST_INDEX_NAME}*`],
          privileges: ['all'],
        },
      ],
    },
  },
};

export const Users: User[] = [
  NoKibanaPrivileges,
  Superuser,
  GlobalRead,
  Space1All,
  Space1AllWithRestrictedFixture,
  Space1AllAlertingNoneActions,
];

const Space1: Space = {
  id: 'space1',
  name: 'Space 1',
  disabledFeatures: [],
};

const Space2: Space = {
  id: 'space2',
  name: 'Space 2',
  disabledFeatures: [],
};

const OtherSpace: Space = {
  id: 'other',
  name: 'Other',
  disabledFeatures: [],
};

export const Spaces: Space[] = [Space1, Space2, OtherSpace];

// For all scenarios, we define both an instance in addition
// to a "type" definition so that we can use the exhaustive switch in
// typescript to ensure all scenarios are handled.

interface Scenario {
  user: User;
  space: Space;
}

interface NoKibanaPrivilegesAtSpace1 extends Scenario {
  id: 'no_kibana_privileges at space1';
}
const NoKibanaPrivilegesAtSpace1: NoKibanaPrivilegesAtSpace1 = {
  id: 'no_kibana_privileges at space1',
  user: NoKibanaPrivileges,
  space: Space1,
};

interface SuperuserAtSpace1 extends Scenario {
  id: 'superuser at space1';
}
const SuperuserAtSpace1: SuperuserAtSpace1 = {
  id: 'superuser at space1',
  user: Superuser,
  space: Space1,
};

interface GlobalReadAtSpace1 extends Scenario {
  id: 'global_read at space1';
}
const GlobalReadAtSpace1: GlobalReadAtSpace1 = {
  id: 'global_read at space1',
  user: GlobalRead,
  space: Space1,
};

interface Space1AllAtSpace1 extends Scenario {
  id: 'space_1_all at space1';
}
const Space1AllAtSpace1: Space1AllAtSpace1 = {
  id: 'space_1_all at space1',
  user: Space1All,
  space: Space1,
};
interface Space1AllWithRestrictedFixtureAtSpace1 extends Scenario {
  id: 'space_1_all_with_restricted_fixture at space1';
}
const Space1AllWithRestrictedFixtureAtSpace1: Space1AllWithRestrictedFixtureAtSpace1 = {
  id: 'space_1_all_with_restricted_fixture at space1',
  user: Space1AllWithRestrictedFixture,
  space: Space1,
};

interface Space1AllAlertingNoneActionsAtSpace1 extends Scenario {
  id: 'space_1_all_alerts_none_actions at space1';
}
const Space1AllAlertingNoneActionsAtSpace1: Space1AllAlertingNoneActionsAtSpace1 = {
  id: 'space_1_all_alerts_none_actions at space1',
  user: Space1AllAlertingNoneActions,
  space: Space1,
};

interface Space1AllAtSpace2 extends Scenario {
  id: 'space_1_all at space2';
}
const Space1AllAtSpace2: Space1AllAtSpace2 = {
  id: 'space_1_all at space2',
  user: Space1All,
  space: Space2,
};

export const UserAtSpaceScenarios: [
  NoKibanaPrivilegesAtSpace1,
  SuperuserAtSpace1,
  GlobalReadAtSpace1,
  Space1AllAtSpace1,
  Space1AllAtSpace2,
  Space1AllWithRestrictedFixtureAtSpace1,
  Space1AllAlertingNoneActionsAtSpace1
] = [
  NoKibanaPrivilegesAtSpace1,
  SuperuserAtSpace1,
  GlobalReadAtSpace1,
  Space1AllAtSpace1,
  Space1AllAtSpace2,
  Space1AllWithRestrictedFixtureAtSpace1,
  Space1AllAlertingNoneActionsAtSpace1,
];
