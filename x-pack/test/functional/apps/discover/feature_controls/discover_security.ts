/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSavedQuerySecurityUtils } from '../../saved_query_management/utils/saved_query_security';

export default function (ctx: FtrProviderContext) {
  const { getPageObjects, getService } = ctx;
  const savedQuerySecurityUtils = getSavedQuerySecurityUtils(ctx);
  const esArchiver = getService('esArchiver');
  const esSupertest = getService('esSupertest');
  const dataGrid = getService('dataGrid');
  const find = getService('find');
  const indexPatterns = getService('indexPatterns');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects([
    'common',
    'error',
    'discover',
    'timePicker',
    'security',
    'share',
    'spaceSelector',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');
  const logstashIndexName = 'logstash-2015.09.22';

  async function setDiscoverTimeRange() {
    await PageObjects.timePicker.setDefaultAbsoluteRange();
  }

  // more tests are in x-pack/test/functional/apps/saved_query_management/feature_controls/security.ts

  describe('discover feature controls security', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/security'
      );
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });
    afterEach(async () => {
      retry.waitFor('close share modal', async () => {
        await PageObjects.share.closeShareModal(); // close modal
        return await testSubjects.exists('shareTopNavButton');
      });
    });
    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();

      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/security'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('global discover all privileges', () => {
      before(async () => {
        await security.role.create('global_discover_all_role', {
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

        await security.user.create('global_discover_all_user', {
          password: 'global_discover_all_user-password',
          roles: ['global_discover_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_all_user',
          'global_discover_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.selectIndexPattern('logstash-*');
      });
      afterEach(async () => {
        retry.waitFor('close share modal', async () => {
          await PageObjects.share.closeShareModal(); // close modal
          return await testSubjects.exists('shareTopNavButton');
        });
      });
      after(async () => {
        await security.role.delete('global_discover_all_role');
        await security.user.delete('global_discover_all_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link) => link.text)).to.eql([
          'Discover',
          'Stack Management', // because `global_discover_all_role` enables search sessions and reporting
        ]);
      });

      it('shows save button', async () => {
        await testSubjects.existOrFail('discoverSaveButton', { timeout: 20000 });
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it('shows CSV reports', async () => {
        await PageObjects.share.clickShareTopNavButton();
        await testSubjects.existOrFail('sharePanel-CSVReports');
        await PageObjects.share.clickShareTopNavButton();
      });

      savedQuerySecurityUtils.shouldAllowSavingQueries();
    });

    describe('global discover read-only privileges', () => {
      before(async () => {
        await security.role.create('global_discover_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_discover_read_user', {
          password: 'global_discover_read_user-password',
          roles: ['global_discover_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_read_user',
          'global_discover_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });
      afterEach(async () => {
        retry.waitFor('close share modal', async () => {
          await PageObjects.share.closeShareModal(); // close modal
          return await testSubjects.exists('shareTopNavButton');
        });
      });
      after(async () => {
        await security.role.delete('global_discover_read_role');
        await security.user.delete('global_discover_read_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.common.waitForTopNavToBeVisible();
        await testSubjects.existOrFail('discoverNewButton', { timeout: 10000 });
        await testSubjects.missingOrFail('discoverSaveButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`doesn't show visualize button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.common.waitForTopNavToBeVisible();
        await PageObjects.discover.selectIndexPattern('logstash-*');
        await setDiscoverTimeRange();
        await PageObjects.unifiedFieldList.clickFieldListItem('bytes');
        await PageObjects.unifiedFieldList.expectMissingFieldListItemVisualize('bytes');
      });

      savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
    });

    describe('discover read-only privileges with url_create', () => {
      before(async () => {
        await security.role.create('global_discover_read_url_create_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read', 'url_create'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_discover_read_url_create_user', {
          password: 'global_discover_read_url_create_user-password',
          roles: ['global_discover_read_url_create_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_read_url_create_user',
          'global_discover_read_url_create_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });
      afterEach(async () => {
        retry.waitFor('close share modal', async () => {
          await PageObjects.share.closeShareModal(); // close modal
          return await testSubjects.exists('shareTopNavButton');
        });
      });

      after(async () => {
        await security.user.delete('global_discover_read_url_create_user');
        await security.role.delete('global_discover_read_url_create_role');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.common.waitForTopNavToBeVisible();
        await testSubjects.existOrFail('discoverNewButton', { timeout: 10000 });
        await testSubjects.missingOrFail('discoverSaveButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`doesn't show visualize button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.common.waitForTopNavToBeVisible();
        await setDiscoverTimeRange();
        await PageObjects.unifiedFieldList.clickFieldListItem('bytes');
        await PageObjects.unifiedFieldList.expectMissingFieldListItemVisualize('bytes');
      });

      savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
    });

    describe('discover and visualize privileges', () => {
      before(async () => {
        await security.role.create('global_discover_visualize_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_discover_visualize_read_user', {
          password: 'global_discover_visualize_read_user-password',
          roles: ['global_discover_visualize_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_visualize_read_user',
          'global_discover_visualize_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });
      afterEach(async () => {
        retry.waitFor('close share modal', async () => {
          await PageObjects.share.closeShareModal(); // close modal
          return await testSubjects.exists('shareTopNavButton');
        });
      });
      after(async () => {
        await security.role.delete('global_discover_visualize_read_role');
        await security.user.delete('global_discover_visualize_read_user');
      });

      it(`shows the visualize button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.common.waitForTopNavToBeVisible();
        await setDiscoverTimeRange();
        await PageObjects.unifiedFieldList.clickFieldListItem('bytes');
        await PageObjects.unifiedFieldList.expectFieldListItemVisualize('bytes');
      });
    });

    describe('no discover privileges', () => {
      before(async () => {
        await security.role.create('no_discover_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_discover_privileges_user', {
          password: 'no_discover_privileges_user-password',
          roles: ['no_discover_privileges_role'],
          full_name: 'test user',
        });

        // Navigate home before attempting to login or we may get redirected to
        // Discover with a forbidden error, which hides the chrome and causes
        // PageObjects.security.login to fail when checking for the logout button
        await PageObjects.common.navigateToUrl('home', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        await PageObjects.security.login(
          'no_discover_privileges_user',
          'no_discover_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      afterEach(async () => {
        retry.waitFor('close share modal', async () => {
          await PageObjects.share.closeShareModal(); // close modal
          return await testSubjects.exists('shareTopNavButton');
        });
      });

      after(async () => {
        await security.role.delete('no_discover_privileges_role');
        await security.user.delete('no_discover_privileges_user');
      });

      it('shows 403', async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await retry.try(async () => {
          await PageObjects.error.expectForbidden();
        });
      });
    });

    describe('when has privileges to read data views but no privileges to read index', () => {
      before(async () => {
        await esSupertest
          .post('/_aliases')
          .send({
            actions: [
              {
                add: { index: logstashIndexName, alias: 'alias-logstash-discover' },
              },
            ],
          })
          .expect(200);

        await indexPatterns.create(
          { title: 'alias-logstash-discover', timeFieldName: '@timestamp' },
          { override: true }
        );

        await security.role.create('discover_only_data_views_role', {
          elasticsearch: {
            indices: [
              { names: ['alias-logstash-discover'], privileges: ['read', 'view_index_metadata'] },
            ],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('discover_only_data_views_user', {
          password: 'discover_only_data_views_user-password',
          roles: ['discover_only_data_views_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'discover_only_data_views_user',
          'discover_only_data_views_user-password',
          {
            expectSpaceSelector: false,
          }
        );

        await PageObjects.common.navigateToApp('discover');
      });

      afterEach(async () => {
        retry.waitFor('close share modal', async () => {
          await PageObjects.share.closeShareModal(); // close modal
          return await testSubjects.exists('shareTopNavButton');
        });
      });
      after(async () => {
        await kibanaServer.uiSettings.unset('defaultIndex');
        await esSupertest
          .post('/_aliases')
          .send({
            actions: [
              {
                remove: { index: logstashIndexName, alias: 'alias-logstash-discover' },
              },
            ],
          })
          .expect(200);

        await security.role.delete('discover_only_data_views_role');
        await security.user.delete('discover_only_data_views_user');
      });

      it('allows to access only via a permitted index alias', async () => {
        await globalNav.badgeExistsOrFail('Read only');

        // can't access logstash index directly
        await PageObjects.discover.selectIndexPattern('logstash-*');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('discoverNoResultsCheckIndices');

        // but can access via a permitted alias for the logstash index
        await PageObjects.discover.selectIndexPattern('alias-logstash-discover');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await setDiscoverTimeRange();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('discoverNoResultsCheckIndices');
        await PageObjects.discover.waitForDocTableLoadingComplete();

        // expand a row
        await dataGrid.clickRowToggle();

        // check the fields tab
        await retry.waitForWithTimeout(
          'index in flyout fields tab is matching the logstash index',
          5000,
          async () => {
            return (
              (await testSubjects.getVisibleText('tableDocViewRow-_index-value')) ===
              logstashIndexName
            );
          }
        );

        // check the JSON tab
        await find.clickByCssSelectorWhenNotDisabledWithoutRetry(
          '#kbn_doc_viewer_tab_doc_view_source'
        );
        await retry.waitForWithTimeout(
          'index in flyout JSON tab is matching the logstash index',
          5000,
          async () => {
            const text = await monacoEditor.getCodeEditorValue();
            return JSON.parse(text)._index === logstashIndexName;
          }
        );
      });
    });
  });
}
