/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import { AgentManagerParams } from './agent';

interface Roles {
  [roleName: string]: {
    indices: [
      {
        names: string[];
        privileges: string[];
        allow_restricted_indices: boolean;
      }
    ];
    applications: [
      {
        application: string;
        privileges: string[];
        resources: string[];
      }
    ];
    transient_metadata: {
      enabled: boolean;
    };
  };
}

interface Users {
  [username: string]: { roles: string[] };
}

export const ROLES: Roles = {
  read: {
    indices: [
      {
        names: ['logs-*'],
        privileges: ['read'],
        allow_restricted_indices: false,
      },
    ],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_osquery.read'],
        resources: ['*'],
      },
    ],
    transient_metadata: {
      enabled: true,
    },
  },
  all: {
    indices: [
      {
        names: ['logs-*'],
        privileges: ['read'],
        allow_restricted_indices: false,
      },
    ],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_osquery.all'],
        resources: ['*'],
      },
    ],
    transient_metadata: {
      enabled: true,
    },
  },
};

export const USERS: Users = {
  osqueryRead: {
    roles: ['osquery_read'],
  },
  osqueryAll: {
    roles: ['osquery_all'],
  },
};

export const setupUsers = async (config: AgentManagerParams) => {
  const { esHost, user: username, password } = config;
  const params = {
    auth: { username, password },
  };
  await Promise.all(
    Object.keys(ROLES).map((role) =>
      axios.put(`${esHost}/_security/role/osquery_${role}`, ROLES[role], params)
    )
  );
  await Promise.all(
    Object.keys(USERS).map((newUsername) =>
      axios.put(`${esHost}/_security/user/${newUsername}`, { password, ...USERS[username] }, params)
    )
  );
};
