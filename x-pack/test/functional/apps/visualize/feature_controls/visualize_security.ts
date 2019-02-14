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
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'header',
    'security',
    'spaceSelector',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('feature controls security', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('visualize/default');
      await esArchiver.loadIfNeeded('logstash_functional');
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
        await PageObjects.security.logout();
        await security.role.delete('global_visualize_all_role');
        await security.user.delete('global_visualize_all_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Visualize', 'Unregistered App', 'Management']);
      });

      it(`allows a visualization to be created`, async () => {
        const fromTime = '2015-09-19 06:31:44.000';
        const toTime = '2015-09-23 18:31:44.000';
        const vizName1 = 'Visualization VerticalBarChart';

        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVerticalBarChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.saveVisualizationExpectSuccess(vizName1);
      });
    });

    describe('global visualize read-only privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_read_user', {
          password: 'global_visualize_read_user-password',
          roles: ['global_visualize_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_visualize_read_user',
          'global_visualize_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.logout();
        await security.role.delete('global_visualize_read_role');
        await security.user.delete('global_visualize_read_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Visualize', 'Unregistered App', 'Management']);
      });

      it(`does not allow a visualization to be created`, async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVerticalBarChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.expectNoSaveOption();
      });
    });

    describe('no visualize privileges', () => {
      before(async () => {
        await security.role.create('no_visualize_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_visualize_privileges_user', {
          password: 'no_visualize_privileges_user-password',
          roles: ['no_visualize_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_visualize_privileges_user',
          'no_visualize_privileges_user-password',
          {
            expectSpaceSelector: false,
            shouldLoginIfPrompted: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.logout();
        await security.role.delete('no_visualize_privileges_role');
        await security.user.delete('no_visualize_privileges_user');
      });

      it(`redirects to home page`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
