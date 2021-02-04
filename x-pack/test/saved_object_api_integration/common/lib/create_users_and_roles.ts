/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuperTest } from 'supertest';
import { Client } from '@elastic/elasticsearch';
import { AUTHENTICATION } from './authentication';

export const createUsersAndRoles = async (es: Client, supertest: SuperTest<any>) => {
  await supertest
    .put('/api/security/role/kibana_legacy_user')
    .send({
      elasticsearch: {
        indices: [
          {
            names: ['.kibana'],
            privileges: ['manage', 'read', 'index', 'delete'],
          },
        ],
      },
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_dual_privileges_user')
    .send({
      elasticsearch: {
        indices: [
          {
            names: ['.kibana'],
            privileges: ['manage', 'read', 'index', 'delete'],
          },
        ],
      },
      kibana: [
        {
          base: ['all'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_dual_privileges_dashboard_only_user')
    .send({
      elasticsearch: {
        indices: [
          {
            names: ['.kibana'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
      },
      kibana: [
        {
          base: ['read'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest.put('/api/security/role/kibana_rbac_user').send({
    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
  });

  await supertest
    .put('/api/security/role/kibana_rbac_dashboard_only_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_default_space_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['default'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_default_space_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['default'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['space_1'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['space_1'],
        },
      ],
    })
    .expect(204);

  await es.security.putUser({
    username: AUTHENTICATION.NOT_A_KIBANA_USER.username,
    body: {
      password: AUTHENTICATION.NOT_A_KIBANA_USER.password,
      roles: [],
      full_name: 'not a kibana user',
      email: 'not_a_kibana_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_LEGACY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_LEGACY_USER.password,
      roles: ['kibana_legacy_user'],
      full_name: 'a kibana legacy user',
      email: 'a_kibana_legacy_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.password,
      roles: ['kibana_dual_privileges_user'],
      full_name: 'a kibana dual_privileges user',
      email: 'a_kibana_dual_privileges_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.password,
      roles: ['kibana_dual_privileges_dashboard_only_user'],
      full_name: 'a kibana dual_privileges dashboard only user',
      email: 'a_kibana_dual_privileges_dashboard_only_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_USER.password,
      roles: ['kibana_rbac_user'],
      full_name: 'a kibana user',
      email: 'a_kibana_rbac_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.password,
      roles: ['kibana_rbac_dashboard_only_user'],
      full_name: 'a kibana dashboard only user',
      email: 'a_kibana_rbac_dashboard_only_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.password,
      roles: ['kibana_rbac_default_space_all_user'],
      full_name: 'a kibana default space all user',
      email: 'a_kibana_rbac_default_space_all_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.password,
      roles: ['kibana_rbac_default_space_read_user'],
      full_name: 'a kibana default space read-only user',
      email: 'a_kibana_rbac_default_space_read_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.password,
      roles: ['kibana_rbac_space_1_all_user'],
      full_name: 'a kibana rbac space 1 all user',
      email: 'a_kibana_rbac_space_1_all_user@elastic.co',
    },
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.password,
      roles: ['kibana_rbac_space_1_read_user'],
      full_name: 'a kibana rbac space 1 read-only user',
      email: 'a_kibana_rbac_space_1_readonly_user@elastic.co',
    },
  });
};
