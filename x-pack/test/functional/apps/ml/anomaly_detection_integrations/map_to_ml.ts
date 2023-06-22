/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'dashboard']);
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  const dashboardTitle = 'map_to_ml';
  const dashboardArchive =
    'x-pack/test/functional/fixtures/kbn_archiver/ml/map_to_ml_dashboard.json';

  async function dashboardPreparation(selectedPanelTitle: string) {
    await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
    await ml.dashboardEmbeddables.assertDashboardPanelExists(selectedPanelTitle);

    const header = await dashboardPanelActions.getPanelHeading(selectedPanelTitle);
    await dashboardPanelActions.openContextMenuMorePanel(header);
  }

  describe('create jobs from dashboard map', function () {
    this.tags(['ml']);
    let jobId: string;

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await kibanaServer.importExport.load(dashboardArchive);
      await browser.setWindowSize(1920, 1080);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await kibanaServer.importExport.unload(dashboardArchive);
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('dashboard');
    });

    afterEach(async () => {
      await ml.api.deleteAnomalyDetectionJobES(jobId);
    });

    it('can create a geo job from map with single layer', async () => {
      const selectedPanelTitle = 'ecommerce-map';
      jobId = 'job_from_map_1';
      const numberOfCompatibleLayers = 1;
      const layerIndex = 0;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleMapLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.setJobId(jobId, layerIndex);

      await ml.lensVisualizations.clickCreateJob(layerIndex);
      await ml.lensVisualizations.assertJobHasBeenCreated(layerIndex);

      await ml.lensVisualizations.clickViewResults(layerIndex);

      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('Exploror page loaded');
      await ml.lensVisualizations.anomalyExplorerPageLoaded();

      await ml.testExecution.logTestStep('pre-fills the job selection');
      await ml.jobSelection.assertJobSelection([jobId]);

      await ml.api.assertModelMemoryLimitForJob(jobId, '11mb');
    });
  });
}
