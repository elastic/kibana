/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This test imports a dashboard saved with controls from 8.0.0, because that is the earliest version
 * with the dashboard controls integration in place.
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const pieChart = getService('pieChart');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  const { common, settings, savedObjects, dashboard, dashboardControls } = getPageObjects([
    'common',
    'settings',
    'dashboard',
    'savedObjects',
    'dashboardControls',
  ]);

  describe('Export import saved objects between versions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/test/functional/es_archives/getting_started/shakespeare'
      );
      await kibanaServer.uiSettings.replace({});
      await settings.navigateTo();
      await settings.clickKibanaSavedObjects();
      await savedObjects.importFile(
        path.join(__dirname, 'exports', 'controls_dashboard_migration_test_8_0_0.ndjson')
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/getting_started/shakespeare');
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('should be able to import dashboard with controls from 8.0.0', async () => {
      // this will catch cases where there is an error in the migrations.
      await savedObjects.checkImportSucceeded();
      await savedObjects.clickImportDone();
    });

    it('should render all panels on the dashboard', async () => {
      await dashboardControls.enableControlsLab();
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('[8.0.0] Controls Dashboard');

      // dashboard should load properly
      await dashboard.expectOnDashboard('[8.0.0] Controls Dashboard');
      await dashboard.waitForRenderComplete();

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });

    it('loads all controls from the saved dashboard', async () => {
      expect(await dashboardControls.getControlsCount()).to.be(2);
      expect(await dashboardControls.getAllControlTitles()).to.eql(['Speaker Name', 'Play Name']);

      const ids = await dashboardControls.getAllControlIds();

      await dashboardControls.optionsListOpenPopover(ids[0]);
      await retry.try(async () => {
        expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(10);
      });
      await dashboardControls.optionsListEnsurePopoverIsClosed(ids[0]);

      await dashboardControls.optionsListOpenPopover(ids[1]);
      await retry.try(async () => {
        // the second control should only have 5 available options because the previous control has HAMLET ROMEO JULIET and BRUTUS selected
        expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(5);
      });
      await dashboardControls.optionsListEnsurePopoverIsClosed(ids[1]);
    });

    it('applies default selected options list options to control', async () => {
      const controlIds = await dashboardControls.getAllControlIds();
      const selectionString = await dashboardControls.optionsListGetSelectionsString(controlIds[0]);
      expect(selectionString).to.be('HAMLET, ROMEO, JULIET, BRUTUS');
    });

    it('applies default selected options list options to dashboard', async () => {
      // because 4 selections are made on the control, the pie chart should only show 4 slices.
      expect(await pieChart.getPieSliceCount()).to.be(4);
    });
  });
}
