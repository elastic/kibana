/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const appsMenu = getService('appsMenu');
  const PageObjects = getPageObjects(['common', 'security']);

  describe('security', function () {
    before(async () => {
      await security.role.create('global_all_role', {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            base: ['all'],
            spaces: ['*'],
          },
        ],
      });

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();

      await security.role.delete('global_all_role');
    });

    describe('machine_learning_user', () => {
      before(async () => {
        await security.user.create('machine_learning_user', {
          password: 'machine_learning_user-password',
          roles: ['machine_learning_user'],
          full_name: 'machine learning user',
        });
      });

      after(async () => {
        await security.user.delete('machine_learning_user');
      });

      it('gets forbidden after login', async () => {
        await PageObjects.security.login(
          'machine_learning_user',
          'machine_learning_user-password',
          {
            expectForbidden: true,
          }
        );
      });
    });

    describe('global all', () => {
      before(async () => {
        await security.user.create('global_all', {
          password: 'global_all-password',
          roles: ['global_all_role'],
          full_name: 'global all',
        });

        await PageObjects.security.login('global_all', 'global_all-password');
      });

      after(async () => {
        await security.user.delete('global_all');
      });

      it(`shows ml navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Machine Learning');
      });
    });

    describe('machine_learning_user and global all', () => {
      before(async () => {
        await security.user.create('machine_learning_user', {
          password: 'machine_learning_user-password',
          roles: ['machine_learning_user', 'global_all_role'],
          full_name: 'machine learning user and global all user',
        });

        await PageObjects.security.login('machine_learning_user', 'machine_learning_user-password');
      });

      after(async () => {
        await security.user.delete('machine_learning_user');
      });

      it('shows ML navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Machine Learning');
      });
    });

    describe('ml read', () => {
      before(async () => {
        await security.role.create('ml_role_read', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              base: [],
              feature: { ml: ['read'], savedObjectsManagement: ['read'] },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('ml_read_user', {
          password: 'ml_read-password',
          roles: ['ml_role_read'],
          full_name: 'ml read',
        });

        await PageObjects.security.login('ml_read_user', 'ml_read-password');
      });

      after(async () => {
        await security.role.delete('ml_role_read');
        await security.user.delete('ml_read_user');
      });

      it('shows ML navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Machine Learning');
      });
    });

    describe('ml none', () => {
      before(async () => {
        await security.role.create('ml_role_none', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              base: [],
              feature: { discover: ['read'] },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('ml_none_user', {
          password: 'ml_none-password',
          roles: ['ml_role_none'],
          full_name: 'ml none',
        });

        await PageObjects.security.login('ml_none_user', 'ml_none-password');
      });

      after(async () => {
        await security.role.delete('ml_role_none');
        await security.user.delete('ml_none_user');
      });

      it('does NOT show ML navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.not.contain('Machine Learning');
      });
    });
  });
}
