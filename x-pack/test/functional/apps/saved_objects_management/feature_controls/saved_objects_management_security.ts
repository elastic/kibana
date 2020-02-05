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
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  let version: string = '';

  describe('feature controls saved objects management', () => {
    before(async () => {
      await esArchiver.load('saved_objects_management/feature_controls/security');
      const versionService = getService('kibanaServer').version;
      version = await versionService.get();
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

        await PageObjects.security.forceLogout();

        await PageObjects.security.login('global_all_user', 'global_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_all_role'),
          security.user.delete('global_all_user'),
          PageObjects.security.forceLogout(),
        ]);
      });

      describe('listing', () => {
        before(async () => {
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaSavedObjects();
        });

        it('shows all saved objects', async () => {
          const objects = await PageObjects.settings.getSavedObjectsInTable();
          expect(objects).to.eql([
            'Advanced Settings [6.0.0]',
            `Advanced Settings [${version}]`,
            'A Dashboard',
            'logstash-*',
            'A Pie',
          ]);
        });

        it('can view all saved objects in applications', async () => {
          const bools = await PageObjects.settings.getSavedObjectsTableSummary();
          expect(bools).to.eql([
            {
              title: 'Advanced Settings [6.0.0]',
              canViewInApp: false,
            },
            {
              title: `Advanced Settings [${version}]`,
              canViewInApp: false,
            },
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

      describe('edit visualization', () => {
        before(async () => {
          await PageObjects.common.navigateToActualUrl(
            'kibana',
            '/management/kibana/objects/savedVisualizations/75c3e060-1e7c-11e9-8488-65449e65d0ed',
            {
              shouldLoginIfPrompted: false,
            }
          );
        });

        it('shows delete button', async () => {
          await testSubjects.existOrFail('savedObjectEditDelete');
        });

        it('shows save button', async () => {
          await testSubjects.existOrFail('savedObjectEditSave');
        });

        it('has inputs without readonly attributes', async () => {
          const form = await testSubjects.find('savedObjectEditForm');
          const inputs = await form.findAllByCssSelector('input');
          expect(inputs.length).to.be.greaterThan(0);
          for (const input of inputs) {
            const isEnabled = await input.isEnabled();
            expect(isEnabled).to.be(true);
          }
        });
      });
    });

    describe('global saved object management read privileges', () => {
      before(async () => {
        await security.role.create('global_som_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                savedObjectsManagement: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_som_read_user', {
          password: 'global_som_read_user-password',
          roles: ['global_som_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login('global_som_read_user', 'global_som_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_som_read_role'),
          security.user.delete('global_som_read_user'),
          PageObjects.security.forceLogout(),
        ]);
      });

      describe('listing', () => {
        before(async () => {
          await PageObjects.settings.navigateTo();
          await PageObjects.settings.clickKibanaSavedObjects();
        });

        it('shows all saved objects', async () => {
          const objects = await PageObjects.settings.getSavedObjectsInTable();
          expect(objects).to.eql([
            'Advanced Settings [6.0.0]',
            `Advanced Settings [${version}]`,
            'A Dashboard',
            'logstash-*',
            'A Pie',
          ]);
        });

        it('cannot view any saved objects in applications', async () => {
          const bools = await PageObjects.settings.getSavedObjectsTableSummary();
          expect(bools).to.eql([
            {
              title: 'Advanced Settings [6.0.0]',
              canViewInApp: false,
            },
            {
              title: `Advanced Settings [${version}]`,
              canViewInApp: false,
            },
            {
              title: 'A Dashboard',
              canViewInApp: false,
            },
            {
              title: 'logstash-*',
              canViewInApp: false,
            },
            {
              title: 'A Pie',
              canViewInApp: false,
            },
          ]);
        });

        it(`can't delete all saved objects`, async () => {
          await PageObjects.settings.clickSavedObjectsTableSelectAll();
          const actual = await PageObjects.settings.canSavedObjectsBeDeleted();
          expect(actual).to.be(false);
        });
      });

      describe('edit visualization', () => {
        before(async () => {
          await PageObjects.common.navigateToActualUrl(
            'kibana',
            '/management/kibana/objects/savedVisualizations/75c3e060-1e7c-11e9-8488-65449e65d0ed',
            {
              shouldLoginIfPrompted: false,
            }
          );
          await testSubjects.existOrFail('savedObjectsEdit');
        });

        it('does not show delete button', async () => {
          await testSubjects.missingOrFail('savedObjectEditDelete');
        });

        it('does not show save button', async () => {
          await testSubjects.missingOrFail('savedObjectEditSave');
        });

        it('has inputs with only readonly attributes', async () => {
          const form = await testSubjects.find('savedObjectEditForm');
          const inputs = await form.findAllByCssSelector('input');
          expect(inputs.length).to.be.greaterThan(0);
          for (const input of inputs) {
            const isEnabled = await input.isEnabled();
            expect(isEnabled).to.be(false);
          }
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

        await PageObjects.security.forceLogout();

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
          PageObjects.security.forceLogout(),
        ]);
      });

      describe('listing', () => {
        it('redirects to Kibana home', async () => {
          await PageObjects.common.navigateToActualUrl('kibana', 'management/kibana/objects', {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('homeApp');
        });
      });

      describe('edit visualization', () => {
        it('redirects to Kibana home', async () => {
          await PageObjects.common.navigateToActualUrl(
            'kibana',
            '/management/kibana/objects/savedVisualizations/75c3e060-1e7c-11e9-8488-65449e65d0ed',
            {
              shouldLoginIfPrompted: false,
              ensureCurrentUrl: false,
            }
          );
          await testSubjects.existOrFail('homeApp');
        });
      });
    });
  });
}
