/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const appsMenu = getService('appsMenu');

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
      await security.logout();
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
      await security.role.delete('global_all_role');

      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await security.logout();
    });

    describe('monitoring_user', () => {
      before(async () => {
        await security.user.create('monitoring_user', {
          password: 'monitoring_user-password',
          roles: ['monitoring_user'],
          full_name: 'monitoring all',
        });
      });

      after(async () => {
        await security.user.delete('monitoring_user');
      });

      it('gets forbidden after login', async () => {
        await security.loginAs({
          username: 'monitoring_user',
          password: 'monitoring_user-password',
          expect: 'forbidden',
        });
      });
    });

    describe('global all', () => {
      before(async () => {
        await security.user.create('global_all', {
          password: 'global_all-password',
          roles: ['global_all_role'],
          full_name: 'global all',
        });

        await security.loginAs({
          username: 'global_all',
          password: 'global_all-password',
        });
      });

      after(async () => {
        await security.user.delete('global_all');
      });

      it(`doesn't show monitoring navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Stack Monitoring');
      });
    });

    describe('monitoring_user and global all', () => {
      before(async () => {
        await security.user.create('monitoring_user', {
          password: 'monitoring_user-password',
          roles: ['monitoring_user', 'global_all_role'],
          full_name: 'monitoring user',
        });

        await security.loginAs({
          username: 'monitoring_user',
          password: 'monitoring_user-password',
        });
      });

      after(async () => {
        await security.user.delete('monitoring_user');
      });

      it('shows monitoring navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Stack Monitoring');
      });
    });
  });
}
