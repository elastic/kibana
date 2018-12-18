/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { User } from '../common/types';

// these are the users that we care about
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

export type UserScenarios = Superuser | All | DiscoverAll | DiscoverRead;
export const UserScenarios: UserScenarios[] = [Superuser, All, DiscoverAll, DiscoverRead];
