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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'savedObjects',
    'dashboard',
    'timePicker',
  ]);

  const renderService = getService('renderable');

  describe('Export import saved objects between versions', function () {
    before(async function () {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/getting_started/shakespeare'
      );
      await kibanaServer.uiSettings.replace({});
    });

    beforeEach(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.waitTableIsLoaded();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.unload('test/functional/fixtures/es_archiver/getting_started/shakespeare');
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('should be able to import 7.13 saved objects into 8.0.0 and verfiy the rendering of two dashboards', async function () {
      const initialObjectCount = await PageObjects.savedObjects.getExportCount();

      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.13_import_saved_objects.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      const newObjectCount = await PageObjects.savedObjects.getExportCount();
      expect(newObjectCount - initialObjectCount).to.eql(86);
      // logstash by reference dashboard with drilldowns

      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('by_reference_drilldown');

      // dashboard should load properly
      await PageObjects.dashboard.expectOnDashboard('by_reference_drilldown');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      // count of panels rendered completely
      await renderService.waitForRender(4);
      // There should be 0 error embeddables on the dashboard
      await PageObjects.dashboard.verifyNoRenderErrors();

      // combined shakespeare and logstash dashboard
      await PageObjects.dashboard.loadSavedDashboard('lens_combined_dashboard');
      await PageObjects.dashboard.expectOnDashboard('lens_combined_dashboard');
      // count of panels rendered completely
      await renderService.waitForRender(2);
      // There should be 0 error embeddables on the dashboard
      await PageObjects.dashboard.verifyNoRenderErrors();
    });

    it('should be able to import alerts and actions saved objects from 7.14 into 8.0.0', async function () {
      const initialObjectCount = await PageObjects.savedObjects.getExportCount();

      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_7.14_import_alerts_actions.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      const newObjectCount = await PageObjects.savedObjects.getExportCount();
      expect(newObjectCount - initialObjectCount).to.eql(23);
    });
  });
}
