/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlManagementPage', 'common']);
  const testSubjects = getService('testSubjects');
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');
  const dataUsageAppUrl = 'management/data/data_usage';

  describe('privileges', function () {
    // - plugin needs to be anbled in serverless
    // - observability needs to support custom roles otherwise we'll need to seprate the custom role test out
    // which is being enabled by feature flag config not available in MKI (x-pack/test_serverless/functional/test_suites/observability/config.feature_flags.ts)
    this.tags(['skipMKI']);
    it('renders for the admin role', async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardExists();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('DataUsagePage');
      });
    });

    it('does not render for viewer', async () => {
      await pageObjects.svlCommonPage.loginAsViewer();
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardDoesNotExist();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await testSubjects.missingOrFail('DataUsagePage');
    });
    it('does not render for default (editor/developer) role', async () => {
      await pageObjects.svlCommonPage.loginWithPrivilegedRole();
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardDoesNotExist();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await testSubjects.missingOrFail('DataUsagePage');
    });
    it('renders with a custom role that has the monitor cluster privilege', async () => {
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
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardExists();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await testSubjects.exists('DataUsagePage');
      await samlAuth.deleteCustomRole();
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
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardDoesNotExist();
      await pageObjects.common.navigateToApp(dataUsageAppUrl);
      await testSubjects.missingOrFail('DataUsagePage');
      await samlAuth.deleteCustomRole();
    });
  });
};
