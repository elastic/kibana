/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test is importing saved objects from 7.13.0 to 8.0 and the backported version
 * will import from 6.8.x to 7.x.x
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  const PageObjects = getPageObjects([
    'common',
    'settings',
    'header',
    'savedObjects',
    'dashboard',
    'svlCommonPage',
  ]);

  describe('Importing an existing dashboard', () => {
    before(async () => {
      await PageObjects.svlCommonPage.login();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.uiSettings.replace({});
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.svlCommonPage.forceLogout();
    });

    it('should be able to import dashboard created in 8.11', async () => {
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-objects');
      await PageObjects.savedObjects.waitTableIsLoaded();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', 'serverless_dashboard_8_11.ndjson')
      );

      // this will catch cases where there is an error in the migrations.
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
    });

    it('should render all panels on the dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboards');
      await PageObjects.dashboard.loadSavedDashboard('Super Saved Serverless');

      // dashboard should load properly
      await PageObjects.dashboard.expectOnDashboard('Super Saved Serverless');
      await PageObjects.dashboard.waitForRenderComplete();

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });

    it('does not show the unsaved changes badge in edit mode', async () => {
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.expectMissingUnsavedChangesBadge();
    });
  });
}
