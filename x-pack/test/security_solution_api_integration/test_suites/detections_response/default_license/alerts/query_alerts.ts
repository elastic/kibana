/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const roleToAccessSecuritySolution = {
  name: 'sec_all_spaces',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-security.alerts-default'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
const roleToAccessSecuritySolutionWithDsl = {
  name: 'sec_all_spaces_with_dsl',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-security.alerts-default'],
          privileges: ['read'],
          query:
            '{"wildcard" : { "kibana.alert.ancestors.index" : { "value": ".ds-kibana_does_not_exist" } } }',
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
const userAllSec = {
  username: 'user_all_sec',
  password: 'user_all_sec',
  full_name: 'userAllSec',
  email: 'userAllSec@elastic.co',
  roles: [roleToAccessSecuritySolution.name],
};
const userAllSecWithDsl = {
  username: 'user_all_sec_with_dsl',
  password: 'user_all_sec_with_dsl',
  full_name: 'userAllSecWithDsl',
  email: 'userAllSecWithDsl@elastic.co',
  roles: [roleToAccessSecuritySolutionWithDsl.name],
};

describe('find alert with/without doc level security', () => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const security = getService('security');

  before(async () => {
    await security.role.create(
      roleToAccessSecuritySolution.name,
      roleToAccessSecuritySolution.privileges
    );
    await security.role.create(
      roleToAccessSecuritySolutionWithDsl.name,
      roleToAccessSecuritySolutionWithDsl.privileges
    );
    await security.user.create(userAllSec.username, {
      password: userAllSec.password,
      roles: userAllSec.roles,
      full_name: userAllSec.full_name,
      email: userAllSec.email,
    });
    await security.user.create(userAllSecWithDsl.username, {
      password: userAllSecWithDsl.password,
      roles: userAllSecWithDsl.roles,
      full_name: userAllSecWithDsl.full_name,
      email: userAllSecWithDsl.email,
    });

    await esArchiver.load(
      'x-pack/test/functional/es_archives/security_solution/alerts/8.8.0_multiple_docs',
      {
        useCreate: true,
        docsOnly: true,
      }
    );
  });
  after(async () => {
    await security.user.delete(userAllSec.username);
    await security.user.delete(userAllSecWithDsl.username);
    await security.role.delete(roleToAccessSecuritySolution.name);
    await security.role.delete(roleToAccessSecuritySolutionWithDsl.name);
    await esArchiver.unload(
      'x-pack/test/functional/es_archives/security_solution/alerts/8.8.0_multiple_docs'
    );
  });
  it('should return alerts with user who has access to security solution privileges', async () => {
    const query = {
      query: {
        bool: {
          should: [{ match_all: {} }],
        },
      },
    };
    const { body } = await supertestWithoutAuth
      .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
      .auth(userAllSec.username, userAllSec.password)
      .set('kbn-xsrf', 'true')
      .send(query)
      .expect(200);
    expect(body.hits.total.value).to.eql(3);
  });
  it('should filter out alerts with user who has access to security solution privileges and document level security', async () => {
    const query = {
      query: {
        bool: {
          should: [{ match_all: {} }],
        },
      },
    };
    const { body } = await supertestWithoutAuth
      .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
      .auth(userAllSecWithDsl.username, userAllSecWithDsl.password)
      .set('kbn-xsrf', 'true')
      .send(query)
      .expect(200);
    expect(body.hits.total.value).to.eql(0);
  });
});
