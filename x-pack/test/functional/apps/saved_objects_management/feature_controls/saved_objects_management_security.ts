/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from 'x-pack/test/types/providers';

// tslint:disable no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);

  describe('feature controls saved objects management', () => {
    before(async () => {
      await esArchiver.load('saved_objects_management/feature_controls/security');
    });

    after(async () => {
      await esArchiver.unload('saved_objects_management/feature_controls/security');
    });

    describe('global all privileges', () => {
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

        await security.user.create('global_all_user', {
          password: 'global_all_user-password',
          roles: ['global_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.logout();

        await PageObjects.security.login('global_all_user', 'global_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_all_role'),
          security.user.delete('global_all_user'),
          PageObjects.security.logout(),
        ]);
      });

      describe('listing', () => {
        before(async () => {
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaSavedObjects();
        });

        it('shows all saved objects', async () => {
          const objects = await PageObjects.settings.getSavedObjectsInTable();
          expect(objects).to.eql(['A Dashboard', 'logstash-*', 'A Pie']);
        });

        it('can view all saved objects in applications', async () => {
          const bools = await PageObjects.settings.getSavedObjectsTableSummary();
          expect(bools).to.eql([
            {
              title: 'A Dashboard',
              canViewInApp: true,
            },
            {
              title: 'logstash-*',
              canViewInApp: true,
            },
            {
              title: 'A Pie',
              canViewInApp: true,
            },
          ]);
        });

        it('can delete all saved objects', async () => {
          await PageObjects.settings.clickSavedObjectsTableSelectAll();
          const actual = await PageObjects.settings.canSavedObjectsBeDeleted();
          expect(actual).to.be(true);
        });
      });
    });

    describe('global visualize all privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_all_user', {
          password: 'global_visualize_all_user-password',
          roles: ['global_visualize_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.logout();

        await PageObjects.security.login(
          'global_visualize_all_user',
          'global_visualize_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_visualize_all_role'),
          security.user.delete('global_visualize_all_user'),
          PageObjects.security.logout(),
        ]);
      });

      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSavedObjects();
      });

      it('shows a visualization and an index pattern', async () => {
        const objects = await PageObjects.settings.getSavedObjectsInTable();
        expect(objects).to.eql(['logstash-*', 'A Pie']);
      });

      it('can view only the visualization in application', async () => {
        const bools = await PageObjects.settings.getSavedObjectsTableSummary();
        expect(bools).to.eql([
          {
            title: 'logstash-*',
            canViewInApp: false,
          },
          {
            title: 'A Pie',
            canViewInApp: true,
          },
        ]);
      });

      it(`can't delete all saved objects`, async () => {
        await PageObjects.settings.clickSavedObjectsTableSelectAll();
        const actual = await PageObjects.settings.canSavedObjectsBeDeleted();
        expect(actual).to.be(false);
      });
    });
  });
}
