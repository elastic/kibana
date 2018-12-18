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

export const Users: User[] = [Superuser, GlobalAll];

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

export type UserAtSpaceScenarios =
  | SuperuserAtSpaceWithAllFeatures
  | SuperuserAtSpaceWithNoFeatures
  | GlobalAllAtSpaceWithAllFeatures
  | GlobalAllAtSpaceWithNoFeatures;
export const UserAtSpaceScenarios: UserAtSpaceScenarios[] = [
  SuperuserAtSpaceWithAllFeatures,
  SuperuserAtSpaceWithNoFeatures,
  GlobalAllAtSpaceWithAllFeatures,
  GlobalAllAtSpaceWithNoFeatures,
];
