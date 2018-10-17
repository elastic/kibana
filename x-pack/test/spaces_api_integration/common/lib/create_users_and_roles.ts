/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SuperTest } from 'supertest';
import { AUTHENTICATION } from './authentication';

export const createUsersAndRoles = async (es: any, supertest: SuperTest<any>) => {
  await supertest.put('/api/security/role/kibana_legacy_user').send({
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['manage', 'read', 'index', 'delete'],
        },
      ],
    },
  });

  await supertest.put('/api/security/role/kibana_legacy_dashboard_only_user').send({
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
  });

  await supertest.put('/api/security/role/kibana_dual_privileges_user').send({
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['manage', 'read', 'index', 'delete'],
        },
      ],
    },
    kibana: {
      global: ['all'],
    },
  });

  await supertest.put('/api/security/role/kibana_dual_privileges_dashboard_only_user').send({
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
    kibana: {
      global: ['read'],
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_user').send({
    kibana: {
      global: ['all'],
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_dashboard_only_user').send({
    kibana: {
      global: ['read'],
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_default_space_all_user').send({
    kibana: {
      space: {
        default: ['all'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_default_space_read_user').send({
    kibana: {
      space: {
        default: ['read'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_space_1_all_user').send({
    kibana: {
      space: {
        space_1: ['all'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_space_1_read_user').send({
    kibana: {
      space: {
        space_1: ['read'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_space_2_all_user').send({
    kibana: {
      space: {
        space_2: ['all'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_space_2_read_user').send({
    kibana: {
      space: {
        space_2: ['read'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_space_1_2_all_user').send({
    kibana: {
      space: {
        space_1: ['all'],
        space_2: ['all'],
      },
    },
  });

  await supertest.put('/api/security/role/kibana_rbac_space_1_2_read_user').send({
    kibana: {
      space: {
        space_1: ['read'],
        space_2: ['read'],
      },
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.NOT_A_KIBANA_USER.username,
    body: {
      password: AUTHENTICATION.NOT_A_KIBANA_USER.password,
      roles: [],
      full_name: 'not a kibana user',
      email: 'not_a_kibana_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_LEGACY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_LEGACY_USER.password,
      roles: ['kibana_legacy_user'],
      full_name: 'a kibana legacy user',
      email: 'a_kibana_legacy_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_LEGACY_DASHBOARD_ONLY_USER.password,
      roles: ['kibana_legacy_dashboard_only_user'],
      full_name: 'a kibana legacy dashboard only user',
      email: 'a_kibana_legacy_dashboard_only_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.password,
      roles: ['kibana_dual_privileges_user'],
      full_name: 'a kibana dual_privileges user',
      email: 'a_kibana_dual_privileges_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.password,
      roles: ['kibana_dual_privileges_dashboard_only_user'],
      full_name: 'a kibana dual_privileges dashboard only user',
      email: 'a_kibana_dual_privileges_dashboard_only_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_USER.password,
      roles: ['kibana_rbac_user'],
      full_name: 'a kibana user',
      email: 'a_kibana_rbac_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.password,
      roles: ['kibana_rbac_dashboard_only_user'],
      full_name: 'a kibana dashboard only user',
      email: 'a_kibana_rbac_dashboard_only_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.password,
      roles: ['kibana_rbac_default_space_all_user'],
      full_name: 'a kibana default space all user',
      email: 'a_kibana_rbac_default_space_all_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.password,
      roles: ['kibana_rbac_default_space_read_user'],
      full_name: 'a kibana default space read-only user',
      email: 'a_kibana_rbac_default_space_read_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.password,
      roles: ['kibana_rbac_space_1_all_user'],
      full_name: 'a kibana rbac space 1 all user',
      email: 'a_kibana_rbac_space_1_all_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.password,
      roles: ['kibana_rbac_space_1_read_user'],
      full_name: 'a kibana rbac space 1 read-only user',
      email: 'a_kibana_rbac_space_1_readonly_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_2_ALL_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_2_ALL_USER.password,
      roles: ['kibana_rbac_space_2_all_user'],
      full_name: 'a kibana rbac space 2 all user',
      email: 'a_kibana_rbac_space_2_all_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_2_READ_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_2_READ_USER.password,
      roles: ['kibana_rbac_space_2_read_user'],
      full_name: 'a kibana rbac space 2 read-only user',
      email: 'a_kibana_rbac_space_2_readonly_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_ALL_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_ALL_USER.password,
      roles: ['kibana_rbac_space_1_2_all_user'],
      full_name: 'a kibana rbac space 1 and 2 all user',
      email: 'a_kibana_rbac_space_1_2_all_user@elastic.co',
    },
  });

  await es.shield.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_READ_USER.username,
    body: {
      password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_READ_USER.password,
      roles: ['kibana_rbac_space_1_2_read_user'],
      full_name: 'a kibana rbac space 1 and 2 read-only user',
      email: 'a_kibana_rbac_space_1_2_readonly_user@elastic.co',
    },
  });
};
