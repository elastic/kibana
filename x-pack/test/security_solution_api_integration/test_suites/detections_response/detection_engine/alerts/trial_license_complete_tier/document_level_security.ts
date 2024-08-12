/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

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
const roleToAccessSecuritySolutionWithDls = {
  name: 'sec_all_spaces_with_dls',
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
const userAllSecWithDls = {
  username: 'user_all_sec_with_dls',
  password: 'user_all_sec_with_dls',
  full_name: 'userAllSecWithDls',
  email: 'userAllSecWithDls@elastic.co',
  roles: [roleToAccessSecuritySolutionWithDls.name],
};

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  // Notes: Similar tests should be added for serverless once infrastructure
  // is in place to test roles in MKI enviornment.
  describe('@ess @skipInServerless find alert with/without doc level security', () => {
    before(async () => {
      await security.role.create(
        roleToAccessSecuritySolution.name,
        roleToAccessSecuritySolution.privileges
      );
      await security.role.create(
        roleToAccessSecuritySolutionWithDls.name,
        roleToAccessSecuritySolutionWithDls.privileges
      );
      await security.user.create(userAllSec.username, {
        password: userAllSec.password,
        roles: userAllSec.roles,
        full_name: userAllSec.full_name,
        email: userAllSec.email,
      });
      await security.user.create(userAllSecWithDls.username, {
        password: userAllSecWithDls.password,
        roles: userAllSecWithDls.roles,
        full_name: userAllSecWithDls.full_name,
        email: userAllSecWithDls.email,
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
      await security.user.delete(userAllSecWithDls.username);
      await security.role.delete(roleToAccessSecuritySolution.name);
      await security.role.delete(roleToAccessSecuritySolutionWithDls.name);
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
        .auth(userAllSecWithDls.username, userAllSecWithDls.password)
        .set('kbn-xsrf', 'true')
        .send(query)
        .expect(200);
      expect(body.hits.total.value).to.eql(0);
    });
  });
};
