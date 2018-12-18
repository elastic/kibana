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
const Space1: Space = {
  id: 'space_1',
  name: 'space_1',
  disabledFeatures: [],
};

const Space2: Space = {
  id: 'space_2',
  name: 'space_2',
  disabledFeatures: ['discover'],
};

export const Spaces: Space[] = [Space1, Space2];

interface Scenario {
  user: User;
  space: Space;
}

interface SuperuserAtSpace1 extends Scenario {
  id: 'superuser_at_space_1';
}
const SuperuserAtSpace1: SuperuserAtSpace1 = {
  id: 'superuser_at_space_1',
  user: Superuser,
  space: Space1,
};

interface SuperuserAtSpace2 extends Scenario {
  id: 'superuser_at_space_2';
}
const SuperuserAtSpace2: SuperuserAtSpace2 = {
  id: 'superuser_at_space_2',
  user: Superuser,
  space: Space2,
};

interface GlobalAllAtSpace1 extends Scenario {
  id: 'global_all_at_space_1';
}
const GlobalAllAtSpace1: GlobalAllAtSpace1 = {
  id: 'global_all_at_space_1',
  user: GlobalAll,
  space: Space1,
};

interface GlobalAllAtSpace2 extends Scenario {
  id: 'global_all_at_space_2';
}
const GlobalAllAtSpace2: GlobalAllAtSpace2 = {
  id: 'global_all_at_space_2',
  user: GlobalAll,
  space: Space2,
};

export type UserAtSpaceScenarios =
  | SuperuserAtSpace1
  | SuperuserAtSpace2
  | GlobalAllAtSpace1
  | GlobalAllAtSpace2;
export const UserAtSpaceScenarios: UserAtSpaceScenarios[] = [
  SuperuserAtSpace1,
  SuperuserAtSpace2,
  GlobalAllAtSpace1,
  GlobalAllAtSpace2,
];
