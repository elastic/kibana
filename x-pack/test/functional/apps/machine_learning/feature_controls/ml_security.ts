/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const appsMenu = getService('appsMenu');
  const PageObjects = getPageObjects(['common', 'security']);

  describe('security', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');

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
      await PageObjects.security.logout();
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
      await security.role.delete('global_all_role');

      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await PageObjects.security.logout();
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

      it(`doesn't show ml navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Machine Learning');
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
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Machine Learning');
      });
    });
  });
}
