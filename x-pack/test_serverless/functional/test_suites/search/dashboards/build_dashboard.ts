/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'timePicker',
    'dashboard',
    'visualize',
    'common',
    'header',
    'lens',
    'svlCommonPage',
  ]);

  const pieChart = getService('pieChart');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('Building a new dashboard', function () {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await PageObjects.common.navigateToApp('dashboards');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await elasticChart.setNewChartUiDebugFlag(true);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('can add a lens panel by value', async () => {
      await PageObjects.lens.createAndAddLensFromDashboard({});
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.eql(1);
    });

    it('can edit a Lens panel by value and save changes', async () => {
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();
      await PageObjects.lens.switchToVisualization('donut');
      await PageObjects.lens.saveAndReturn();
      await PageObjects.dashboard.waitForRenderComplete();

      const partitionVisExists = await testSubjects.exists('partitionVisChart');
      expect(partitionVisExists).to.be(true);
    });

    it('can add a filter pill by clicking on the Lens chart', async () => {
      await pieChart.filterOnPieSlice('97.220.3.248');
      await PageObjects.dashboard.waitForRenderComplete();
      await pieChart.expectPieSliceCount(1);
    });

    it('can access a new Dashboard from the unsaved changes section of the listing page', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.expectUnsavedChangesListingExists('New Dashboard');
      await PageObjects.dashboard.clickUnsavedChangesContinueEditing('New Dashboard');
      await PageObjects.dashboard.waitForRenderComplete();

      // Test that the panel loads and the filter is properly applied
      await pieChart.expectPieSliceCount(1);
    });

    it('can save the Dashboard successfully', async () => {
      await PageObjects.dashboard.expectUnsavedChangesBadge();
      await PageObjects.dashboard.saveDashboard('Super Serverless');
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.expectMissingUnsavedChangesBadge();
    });

    it('loads the saved Dashboard', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.expectUnsavedChangesListingDoesNotExist('New Dashboard');

      await PageObjects.dashboard.loadSavedDashboard('Super Serverless');
      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.expectMissingUnsavedChangesBadge();
      // Test that the panel loads and the filter is properly applied
      await pieChart.expectPieSliceCount(1);
    });
  });
}
