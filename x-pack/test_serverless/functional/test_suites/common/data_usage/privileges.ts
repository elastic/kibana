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
      // custom roles aren't available in observability yet
      this.tags(['skipSvlOblt']);
      afterEach(async () => {
        await samlAuth.deleteCustomRole();
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
    });
  });
};
