/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NoIndicesMeteringError,
  NoPrivilegeMeteringError,
} from '@kbn/data-usage-plugin/server/common/errors';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlManagementPage', 'common']);
  const testSubjects = getService('testSubjects');
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');
  const es = getService('es');
  const dataUsageAppUrl = 'management/data/data_usage';
  const toasts = getService('toasts');

  const navigateAndVerify = async (expectedVisible: boolean) => {
    await pageObjects.common.navigateToApp('management');
    await retry.waitFor('page to be visible', async () =>
      testSubjects.exists('cards-navigation-page')
    );

    if (expectedVisible) {
      await pageObjects.svlManagementPage.assertDataUsageManagementCardExists();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await testSubjects.exists('DataUsagePage');
    } else {
      await pageObjects.svlManagementPage.assertDataUsageManagementCardDoesNotExist();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await testSubjects.missingOrFail('DataUsagePage');
    }
  };

  describe('privileges', function () {
    before(async () => {
      await es.indices.putIndexTemplate({
        name: 'test-datastream',
        body: {
          index_patterns: ['test-datastream'],
          data_stream: {},
          priority: 200,
        },
      });

      await es.indices.createDataStream({ name: 'test-datastream' });
      await es.indices.putIndexTemplate({
        name: 'no-permission-test-datastream',
        body: {
          index_patterns: ['no-permission-test-datastream'],
          data_stream: {},
          priority: 200,
        },
      });

      await es.indices.createDataStream({ name: 'no-permission-test-datastream' });
    });
    after(async () => {
      await es.indices.deleteDataStream({ name: 'test-datastream' });
      await es.indices.deleteDataStream({ name: 'no-permission-test-datastream' });
    });
    it('renders for the admin role', async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      await navigateAndVerify(true);
    });
    it('does not render for viewer', async () => {
      await pageObjects.svlCommonPage.loginAsViewer();
      await navigateAndVerify(false);
    });
    describe('with editor role', function () {
      // editor role does not exist in search solution
      this.tags(['skipSvlSearch']);
      it('does not render for default (editor) role', async () => {
        await pageObjects.svlCommonPage.loginAsEditor();
        await navigateAndVerify(false);
      });
    });
    describe('with developer role', function () {
      // developer role only exists in ecs solution
      this.tags(['skipSvlOblt', 'skipSvlSec']);
      it('renders for developer role', async () => {
        await pageObjects.svlCommonPage.loginAsDeveloper();
        await navigateAndVerify(true);
      });
    });
    describe('with custom role', function () {
      // skipSvlOblt: custom roles aren't available in observability yet
      // skipMKI: custom roles aren't available in MKI testing yet
      this.tags(['skipSvlOblt', 'skipMKI']);
      afterEach(async () => {
        await samlAuth.deleteCustomRole();
      });
      it('renders with a custom role that has the privileges cluster: monitor and indices all', async () => {
        await samlAuth.setCustomRole({
          elasticsearch: {
            cluster: ['monitor'],
            indices: [{ names: ['*'], privileges: ['all'] }],
          },
          kibana: [
            {
              base: ['all'],
              feature: {},
              spaces: ['*'],
            },
          ],
        });
        await pageObjects.svlCommonPage.loginWithCustomRole();
        await navigateAndVerify(true);
      });

      it('does not render with a custom role that does not have the monitor cluster privilege', async () => {
        await samlAuth.setCustomRole({
          elasticsearch: {
            indices: [{ names: ['*'], privileges: ['all'] }],
          },
          kibana: [
            {
              base: ['all'],
              feature: {},
              spaces: ['*'],
            },
          ],
        });
        await pageObjects.svlCommonPage.loginWithCustomRole();
        await navigateAndVerify(false);
      });

      describe.skip('with custom role and data streams', function () {
        // skip in all environments.  requires a code change to the data_streams route
        // to allow zero storage data streams to not be filtered out, but useful for testing.
        // the api integration tests can pass a flag to get around this case but we can't in the UI.
        // metering api requires one of: monitor,view_index_metadata,manage,all
        it('does not load data streams without necessary index privilege for any index', async () => {
          await samlAuth.setCustomRole({
            elasticsearch: {
              cluster: ['monitor'],
              indices: [{ names: ['*'], privileges: ['read'] }],
            },
            kibana: [
              {
                base: ['all'],
                feature: {},
                spaces: ['*'],
              },
            ],
          });
          await pageObjects.svlCommonPage.loginWithCustomRole();
          await navigateAndVerify(true);
          const toastContent = await toasts.getContentByIndex(1);
          expect(toastContent).to.contain(NoPrivilegeMeteringError);
        });

        it('does load data streams with necessary index privilege for some indices', async () => {
          await samlAuth.setCustomRole({
            elasticsearch: {
              cluster: ['monitor'],
              indices: [
                { names: ['test-datastream*'], privileges: ['all'] },
                { names: ['.*'], privileges: ['read'] },
              ],
            },
            kibana: [
              {
                base: ['all'],
                feature: {},
                spaces: ['*'],
              },
            ],
          });
          await pageObjects.svlCommonPage.loginWithCustomRole();
          await navigateAndVerify(true);
        });
        it('handles error when no data streams that it has permission to exist (index_not_found_exception)', async () => {
          await samlAuth.setCustomRole({
            elasticsearch: {
              cluster: ['monitor'],
              indices: [{ names: ['none*'], privileges: ['all'] }],
            },
            kibana: [
              {
                base: ['all'],
                feature: {},
                spaces: ['*'],
              },
            ],
          });
          await pageObjects.svlCommonPage.loginWithCustomRole();
          await navigateAndVerify(true);
          const toastContent = await toasts.getContentByIndex(1);
          expect(toastContent).to.contain(NoIndicesMeteringError);
        });
      });
    });
  });
};
