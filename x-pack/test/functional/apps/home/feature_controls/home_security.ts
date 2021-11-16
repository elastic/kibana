/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['security', 'home']);
  const testSubjects = getService('testSubjects');

  describe('security', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/dashboard/feature_controls/security'
      );
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();

      await esArchiver.unload(
        'x-pack/test/functional/es_archives/dashboard/feature_controls/security'
      );
    });

    describe('global all privileges', () => {
      before(async () => {
        await security.role.create('global_all_role', {
          elasticsearch: {},
          kibana: [
            {
              base: ['all'],
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_all_user', {
          password: 'global_all_user-password',
          roles: ['global_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_all_user', 'global_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_all_role');
        await security.user.delete('global_all_user');
      });

      it('shows all available solutions', async () => {
        const solutions = await PageObjects.home.getVisibileSolutions();
        expect(solutions).to.eql([
          'enterpriseSearch',
          'observability',
          'securitySolution',
          'kibana',
        ]);
      });

      it('shows the management section', async () => {
        await testSubjects.existOrFail('homDataManage', { timeout: 2000 });
      });

      it('shows the "Manage" action item', async () => {
        await testSubjects.existOrFail('homManagementActionItem', {
          timeout: 2000,
        });
      });
    });

    describe('global dashboard all privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_all_role', {
          elasticsearch: {},
          kibana: [
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_dashboard_all_user', {
          password: 'global_dashboard_all_user-password',
          roles: ['global_dashboard_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_dashboard_all_user',
          'global_dashboard_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_dashboard_all_role');
        await security.user.delete('global_dashboard_all_user');
      });

      it('shows only the kibana solution', async () => {
        const solutions = await PageObjects.home.getVisibileSolutions();
        expect(solutions).to.eql(['kibana']);
      });

      it('does not show the management section', async () => {
        await testSubjects.missingOrFail('homDataManage', { timeout: 2000 });
      });

      it('does not show the "Manage" action item', async () => {
        await testSubjects.missingOrFail('homManagementActionItem', {
          timeout: 2000,
        });
      });
    });
  });
}
