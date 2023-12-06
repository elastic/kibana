/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ROLES as SERVERLESS_USERNAMES } from '@kbn/security-solution-plugin/common/test';
import { assetCriticalityRouteHelpersFactoryNoAuth } from '../../utils';
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
    name: 'asset_criticality_index_read',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['.asset-criticality.asset-criticality-*'],
            privileges: ['read'],
          },
        ],
      },
    },
  },
  {
    name: 'asset_criticality_index_write',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['.asset-criticality.asset-criticality-*'],
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
  no_asset_criticality_index_read: allRolesExcept('asset_criticality_index_read'),
  no_asset_criticality_index_write: allRolesExcept('asset_criticality_index_write'),
  all: ALL_ROLE_NAMES,
};

export default ({ getService }: FtrProviderContext) => {
  describe('@ess Entity Analytics - Asset Criticality Privileges API', () => {
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const assetCriticalityRoutesNoAuth =
      assetCriticalityRouteHelpersFactoryNoAuth(supertestWithoutAuth);
    const security = getService('security');

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
      assetCriticalityRoutesNoAuth.privilegesForUser({
        username,
        password: USER_PASSWORD,
      });
    before(async () => {
      await createPrivilegeTestUsers();
    });

    describe('Asset Criticality privileges API', () => {
      it('should return has_all_required true for user with all risk engine privileges', async () => {
        const { body } = await getPrivilegesForUsername('all');
        expect(body.has_all_required).to.eql(true);
        expect(body.privileges).to.eql({
          elasticsearch: {
            index: {
              '.asset-criticality.asset-criticality-*': {
                read: true,
                write: true,
              },
            },
          },
        });
      });
      it('should return has_all_required false for user without asset criticality index read', async () => {
        const { body } = await getPrivilegesForUsername('no_asset_criticality_index_read');
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            index: {
              '.asset-criticality.asset-criticality-*': {
                read: false,
                write: true,
              },
            },
          },
        });
      });
      it('should return has_all_required false for user without asset criticality index write', async () => {
        const { body } = await getPrivilegesForUsername('no_asset_criticality_index_write');
        expect(body.has_all_required).to.eql(false);
        expect(body.privileges).to.eql({
          elasticsearch: {
            index: {
              '.asset-criticality.asset-criticality-*': {
                read: true,
                write: false,
              },
            },
          },
        });
      });
    });
  });

  describe('@serverless privileges_apis', () => {
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const assetCriticalityRoutesNoAuth =
      assetCriticalityRouteHelpersFactoryNoAuth(supertestWithoutAuth);
    it('should return that t1_analyst only has read privileges', async () => {
      const { body } = await assetCriticalityRoutesNoAuth.privilegesForUser({
        username: SERVERLESS_USERNAMES.t1_analyst,
        password: USER_PASSWORD,
      });
      expect(body.has_all_required).to.eql(false);
      expect(body.privileges).to.eql({
        elasticsearch: {
          index: {
            '.asset-criticality.asset-criticality-*': {
              read: true,
              write: false,
            },
          },
        },
      });
    });

    it('should return that t2_analyst only has all privileges', async () => {
      const { body } = await assetCriticalityRoutesNoAuth.privilegesForUser({
        username: SERVERLESS_USERNAMES.t2_analyst,
        password: USER_PASSWORD,
      });
      expect(body.has_all_required).to.eql(true);
      expect(body.privileges).to.eql({
        elasticsearch: {
          index: {
            '.asset-criticality.asset-criticality-*': {
              read: true,
              write: true,
            },
          },
        },
      });
    });
  });
};
