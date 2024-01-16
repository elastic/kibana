/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { riskEngineRouteHelpersFactoryNoAuth } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { usersAndRolesFactory } from '../../utils/users_and_roles';
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
  const userHelper = usersAndRolesFactory(getService('security'));
  describe('@ess Entity Analytics - Risk Engine Privileges', () => {
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const riskEngineRoutesNoAuth = riskEngineRouteHelpersFactoryNoAuth(supertestWithoutAuth);
    async function createPrivilegeTestUsers() {
      const rolePromises = ROLES.map((role) => userHelper.createRole(role));

      await Promise.all(rolePromises);
      const userPromises = Object.entries(USERNAME_TO_ROLES).map(([username, roles]) =>
        userHelper.createUser({ username, roles, password: USER_PASSWORD })
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
      it('returns has_all_required true for user with all risk engine privileges', async () => {
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
      it('returns has_all_required false for user with no write access to risk indices', async () => {
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
      it('returns has_all_required false for user with no read access to risk indices', async () => {
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
      it('returns has_all_required false for user with no cluster manage transform privilege', async () => {
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
      it('returns has_all_required false for user with no cluster manage index templates privilege', async () => {
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

    describe('Risk engine init API privilege check', () => {
      it('returns 403 when the user doesnt have all risk engine privileges', async () => {
        await riskEngineRoutesNoAuth.init(
          {
            username: 'no_cluster_manage_index_templates',
            password: USER_PASSWORD,
          },
          403
        );
      });
    });

    describe('Risk engine enable API privilege check', () => {
      it('returns 403 when the user doesnt have all risk engine privileges', async () => {
        await riskEngineRoutesNoAuth.enable(
          {
            username: 'no_cluster_manage_index_templates',
            password: USER_PASSWORD,
          },
          403
        );
      });
    });

    describe('Risk engine disable API privilege check', () => {
      it('returns 403 when the user doesnt have all risk engine privileges', async () => {
        await riskEngineRoutesNoAuth.disable(
          {
            username: 'no_cluster_manage_index_templates',
            password: USER_PASSWORD,
          },
          403
        );
      });
    });
  });
};
