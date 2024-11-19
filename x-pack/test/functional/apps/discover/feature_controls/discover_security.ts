/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import expect from '@kbn/expect';
import { decompressFromBase64 } from 'lz-string';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSavedQuerySecurityUtils } from '../../saved_query_management/utils/saved_query_security';

export default function (ctx: FtrProviderContext) {
  const { getPageObjects, getService } = ctx;
  const savedQuerySecurityUtils = getSavedQuerySecurityUtils(ctx);
  const esArchiver = getService('esArchiver');
  const esSupertest = getService('esSupertest');
  const dataGrid = getService('dataGrid');
  const indexPatterns = getService('indexPatterns');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');
  const securityService = getService('security');
  const globalNav = getService('globalNav');
  const { common, error, discover, timePicker, security, share, header, unifiedFieldList } =
    getPageObjects([
      'common',
      'error',
      'discover',
      'timePicker',
      'security',
      'share',
      'header',
      'unifiedFieldList',
    ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const kibanaServer = getService('kibanaServer');
  const deployment = getService('deployment');
  const logstashIndexName = 'logstash-2015.09.22';

  async function setDiscoverTimeRange() {
    await timePicker.setDefaultAbsoluteRange();
  }

  // more tests are in x-pack/test/functional/apps/saved_query_management/feature_controls/security.ts

  describe('discover feature controls security', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/security'
      );
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');

      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await security.forceLogout();

      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/feature_controls/security'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('global discover all privileges', () => {
      before(async () => {
        await securityService.role.create('global_discover_all_role', {
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

        await securityService.user.create('global_discover_all_user', {
          password: 'global_discover_all_user-password',
          roles: ['global_discover_all_role'],
          full_name: 'test user',
        });

        await security.login('global_discover_all_user', 'global_discover_all_user-password', {
          expectSpaceSelector: false,
        });
        await common.navigateToApp('discover');
        await discover.selectIndexPattern('logstash-*');
      });

      after(async () => {
        await securityService.role.delete('global_discover_all_role');
        await securityService.user.delete('global_discover_all_user');
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

      it('Shows short urls for users with the right privileges', async () => {
        let actualUrl: string = '';
        await share.clickShareTopNavButton();
        const re = new RegExp(
          deployment.getHostPort().replace(':80', '').replace(':443', '') + '/app/r.*$'
        );
        await retry.try(async () => {
          actualUrl = await share.getSharedUrl();
          expect(actualUrl).to.match(re);
          await share.closeShareModal();
        });
      });

      it('shows CSV reports', async () => {
        await share.clickShareTopNavButton();
        await share.clickTab('Export');
        await testSubjects.existOrFail('generateReportButton');
        await share.closeShareModal();
      });

      savedQuerySecurityUtils.shouldAllowSavingQueries();
    });

    describe('global discover read-only privileges', () => {
      before(async () => {
        await securityService.role.create('global_discover_read_role', {
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

        await securityService.user.create('global_discover_read_user', {
          password: 'global_discover_read_user-password',
          roles: ['global_discover_read_role'],
          full_name: 'test user',
        });

        await security.login('global_discover_read_user', 'global_discover_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('global_discover_read_role');
        await securityService.user.delete('global_discover_read_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`doesn't show save button`, async () => {
        await common.navigateToApp('discover');
        await common.waitForTopNavToBeVisible();
        await testSubjects.existOrFail('discoverNewButton', { timeout: 10000 });
        await testSubjects.missingOrFail('discoverSaveButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`doesn't show visualize button`, async () => {
        await common.navigateToApp('discover');
        await common.waitForTopNavToBeVisible();
        await discover.selectIndexPattern('logstash-*');
        await setDiscoverTimeRange();
        await unifiedFieldList.clickFieldListItem('bytes');
        await unifiedFieldList.expectMissingFieldListItemVisualize('bytes');
      });

      it('should allow for copying the snapshot URL', async function () {
        await share.clickShareTopNavButton();
        const actualUrl = await share.getSharedUrl();
        expect(actualUrl).to.contain(`?l=${DISCOVER_APP_LOCATOR}`);
        const urlSearchParams = new URLSearchParams(actualUrl);
        expect(JSON.parse(decompressFromBase64(urlSearchParams.get('lz')!)!)).to.eql({
          query: {
            language: 'kuery',
            query: '',
          },
          sort: [['@timestamp', 'desc']],
          columns: [],
          interval: 'auto',
          filters: [],
          dataViewId: 'logstash-*',
          timeRange: {
            from: '2015-09-19T06:31:44.000Z',
            to: '2015-09-23T18:31:44.000Z',
          },
          refreshInterval: {
            value: 60000,
            pause: true,
          },
        });
        await share.closeShareModal();
      });

      it(`Doesn't show short urls for users without those privileges`, async () => {
        await share.clickShareTopNavButton();
        let actualUrl: string = '';

        await retry.try(async () => {
          actualUrl = await share.getSharedUrl();
          // only shows in long urls
          expect(actualUrl).to.contain(DISCOVER_APP_LOCATOR);
          await share.closeShareModal();
        });
      });
      savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
    });

    describe('discover read-only privileges with url_create', () => {
      before(async () => {
        await securityService.role.create('global_discover_read_url_create_role', {
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

        await securityService.user.create('global_discover_read_url_create_user', {
          password: 'global_discover_read_url_create_user-password',
          roles: ['global_discover_read_url_create_role'],
          full_name: 'test user',
        });

        await security.login(
          'global_discover_read_url_create_user',
          'global_discover_read_url_create_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await securityService.user.delete('global_discover_read_url_create_user');
        await securityService.role.delete('global_discover_read_url_create_role');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`doesn't show save button`, async () => {
        await common.navigateToApp('discover');
        await common.waitForTopNavToBeVisible();
        await testSubjects.existOrFail('discoverNewButton', { timeout: 10000 });
        await testSubjects.missingOrFail('discoverSaveButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`doesn't show visualize button`, async () => {
        await common.navigateToApp('discover');
        await common.waitForTopNavToBeVisible();
        await setDiscoverTimeRange();
        await unifiedFieldList.clickFieldListItem('bytes');
        await unifiedFieldList.expectMissingFieldListItemVisualize('bytes');
      });

      it('Shows short urls for users with the right privileges', async () => {
        await share.clickShareTopNavButton();
        let actualUrl: string = '';
        const re = new RegExp(
          deployment.getHostPort().replace(':80', '').replace(':443', '') + '/app/r.*$'
        );
        await retry.try(async () => {
          actualUrl = await share.getSharedUrl();
          expect(actualUrl).to.match(re);
          await share.closeShareModal();
        });
      });

      savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
    });

    describe('discover and visualize privileges', () => {
      before(async () => {
        await securityService.role.create('global_discover_visualize_read_role', {
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

        await securityService.user.create('global_discover_visualize_read_user', {
          password: 'global_discover_visualize_read_user-password',
          roles: ['global_discover_visualize_read_role'],
          full_name: 'test user',
        });

        await security.login(
          'global_discover_visualize_read_user',
          'global_discover_visualize_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await securityService.role.delete('global_discover_visualize_read_role');
        await securityService.user.delete('global_discover_visualize_read_user');
      });

      it(`shows the visualize button`, async () => {
        await common.navigateToApp('discover');
        await common.waitForTopNavToBeVisible();
        await setDiscoverTimeRange();
        await unifiedFieldList.clickFieldListItem('bytes');
        await unifiedFieldList.expectFieldListItemVisualize('bytes');
      });
    });

    describe('no discover privileges', () => {
      before(async () => {
        await securityService.role.create('no_discover_privileges_role', {
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

        await securityService.user.create('no_discover_privileges_user', {
          password: 'no_discover_privileges_user-password',
          roles: ['no_discover_privileges_role'],
          full_name: 'test user',
        });

        // Navigate home before attempting to login or we may get redirected to
        // Discover with a forbidden error, which hides the chrome and causes
        // security.login to fail when checking for the logout button
        await common.navigateToUrl('home', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        await security.login(
          'no_discover_privileges_user',
          'no_discover_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await securityService.role.delete('no_discover_privileges_role');
        await securityService.user.delete('no_discover_privileges_user');
      });

      it('shows 403', async () => {
        await common.navigateToUrl('discover', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await retry.try(async () => {
          await error.expectForbidden();
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

        await securityService.role.create('discover_only_data_views_role', {
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

        await securityService.user.create('discover_only_data_views_user', {
          password: 'discover_only_data_views_user-password',
          roles: ['discover_only_data_views_role'],
          full_name: 'test user',
        });

        await security.login(
          'discover_only_data_views_user',
          'discover_only_data_views_user-password',
          {
            expectSpaceSelector: false,
          }
        );

        await common.navigateToApp('discover');
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

        await securityService.role.delete('discover_only_data_views_role');
        await securityService.user.delete('discover_only_data_views_user');
      });

      it('allows to access only via a permitted index alias', async () => {
        await globalNav.badgeExistsOrFail('Read only');

        // can't access logstash index directly
        await discover.selectIndexPattern('logstash-*');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('discoverNoResultsCheckIndices');

        // but can access via a permitted alias for the logstash index
        await discover.selectIndexPattern('alias-logstash-discover');
        await header.waitUntilLoadingHasFinished();
        await setDiscoverTimeRange();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('discoverNoResultsCheckIndices');
        await discover.waitForDocTableLoadingComplete();

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
        await dataGrid.clickDocViewerTab('doc_view_source');
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
