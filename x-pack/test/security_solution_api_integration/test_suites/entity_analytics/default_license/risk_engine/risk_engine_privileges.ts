/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { SecurityService } from '../../../../../../../test/common/services/security/security';
import { riskEngineRouteHelpersFactoryNoAuth } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const USER_PASSWORD = 'changeme';
const ROLES = [
  {
    name: 'security_feature_read',
    privileges: {
      kibana: [
        {
          feature: {
            siem: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  {
    name: 'cluster_manage_index_templates',
    privileges: {
      elasticsearch: {
        cluster: ['manage_index_templates'],
      },
    },
  },
  {
    name: 'cluster_manage_transform',
    privileges: {
      elasticsearch: {
        cluster: ['manage_transform'],
      },
    },
  },
  {
    name: 'risk_score_index_read',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['risk-score.risk-score-*'],
            privileges: ['read'],
          },
        ],
      },
    },
  },
  {
    name: 'risk_score_index_write',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['risk-score.risk-score-*'],
            privileges: ['write'],
          },
        ],
      },
    },
  },
];

const ALL_ROLE_NAMES = ROLES.map((role) => role.name);

const allRolesExcept = (role: string) => ALL_ROLE_NAMES.filter((r) => r !== role);

const USERNAME_TO_ROLES = {
  no_cluster_manage_index_templates: allRolesExcept('cluster_manage_index_templates'),
  no_cluster_manage_transform: allRolesExcept('cluster_manage_transform'),
  no_risk_score_index_read: allRolesExcept('risk_score_index_read'),
  no_risk_score_index_write: allRolesExcept('risk_score_index_write'),
  all: ALL_ROLE_NAMES,
};

export default ({ getService }: FtrProviderContext) => {
  describe('@ess privileges_apis', () => {
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const riskEngineRoutesNoAuth = riskEngineRouteHelpersFactoryNoAuth(supertestWithoutAuth);
    const logger = getService('log');
    let security: SecurityService;
    try {
      security = getService('security');
    } catch (e) {
      // even though this test doesn't have the @serverless tag I cannot get it to stop running
      // with serverless config. This is a hack to skip the test if security service is not available
      logger.info(
        'Skipping privileges test as security service not available (likely run with serverless config)'
      );
      return;
    }

    const createRole = async ({ name, privileges }: { name: string; privileges: any }) => {
      return await security.role.create(name, privileges);
    };

    const createUser = async ({
      username,
      password,
      roles,
    }: {
      username: string;
      password: string;
      roles: string[];
    }) => {
      return await security.user.create(username, {
        password,
        roles,
        full_name: username.replace('_', ' '),
        email: `${username}@elastic.co`,
      });
    };

    async function createPrivilegeTestUsers() {
      const rolePromises = ROLES.map((role) => createRole(role));

      await Promise.all(rolePromises);
      const userPromises = Object.entries(USERNAME_TO_ROLES).map(([username, roles]) =>
        createUser({ username, roles, password: USER_PASSWORD })
      );

      return Promise.all(userPromises);
    }

    const getPrivilegesForUsername = async (username: string) =>
      riskEngineRoutesNoAuth.privilegesForUser({
        username,
        password: USER_PASSWORD,
      });
    before(async () => {
      await createPrivilegeTestUsers();
    });

    describe('Risk engine privileges API', () => {
      it('should return has_all_required true for user with all risk engine privileges', async () => {
        const { body } = await getPrivilegesForUsername('all');
        expect(body.has_all_required).to.eql(true);
        expect(body.privileges).to.eql({
          elasticsearch: {
            cluster: {
              manage_index_templates: true,
              manage_transform: true,
            },
            index: {
              'risk-score.risk-score-*': {
                read: true,
                write: true,
              },
            },
          },
        });
      });
      it('should return has_all_required false for user with no write access to risk indices', async () => {
        const { body } = await getPrivilegesForUsername('no_risk_score_index_write');
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            cluster: {
              manage_index_templates: true,
              manage_transform: true,
            },
            index: {
              'risk-score.risk-score-*': {
                read: true,
                write: false,
              },
            },
          },
        });
      });
      it('should return has_all_required false for user with no read access to risk indices', async () => {
        const { body } = await getPrivilegesForUsername('no_risk_score_index_read');
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            cluster: {
              manage_index_templates: true,
              manage_transform: true,
            },
            index: {
              'risk-score.risk-score-*': {
                read: false,
                write: true,
              },
            },
          },
        });
      });
      it('should return has_all_required false for user with no cluster manage transform privilege', async () => {
        const { body } = await getPrivilegesForUsername('no_cluster_manage_transform');
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            cluster: {
              manage_index_templates: true,
              manage_transform: false,
            },
            index: {
              'risk-score.risk-score-*': {
                read: true,
                write: true,
              },
            },
          },
        });
      });
      it('should return has_all_required false for user with no cluster manage index templates privilege', async () => {
        const { body } = await getPrivilegesForUsername('no_cluster_manage_index_templates');
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            cluster: {
              manage_index_templates: false,
              manage_transform: true,
            },
            index: {
              'risk-score.risk-score-*': {
                read: true,
                write: true,
              },
            },
          },
        });
      });
    });
  });
};
