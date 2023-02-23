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
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  const dashboardTitle = 'lens_to_ml';
  const dashboardArchive =
    'x-pack/test/functional/fixtures/kbn_archiver/ml/lens_to_ml_dashboard.json';

  async function setFarequoteTimerange() {
    await PageObjects.timePicker.setAbsoluteRange(
      'Feb 7, 2016 @ 00:00:00.000',
      'Feb 11, 2016 @ 23:59:54.000'
    );
  }

  async function dashboardPreparation(selectedPanelTitle: string) {
    await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
    await ml.dashboardEmbeddables.assertDashboardPanelExists(selectedPanelTitle);

    await setFarequoteTimerange();

    const header = await dashboardPanelActions.getPanelHeading(selectedPanelTitle);
    await dashboardPanelActions.openContextMenuMorePanel(header);
  }

  describe('create jobs from lens', function () {
    this.tags(['ml']);
    let jobId: string;

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
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

    it('can create a single metric job from vis with single layer', async () => {
      const selectedPanelTitle = 'panel2';
      jobId = 'job_from_lens_1';
      const numberOfCompatibleLayers = 1;
      const layerIndex = 0;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.setJobId(jobId, layerIndex);

      await ml.lensVisualizations.clickCreateJob(layerIndex);
      await ml.lensVisualizations.assertJobHasBeenCreated(layerIndex);

      await ml.lensVisualizations.clickViewResults(layerIndex);

      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('Single metric page loaded');
      await ml.lensVisualizations.singleMetricViewerPageLoaded();

      await ml.testExecution.logTestStep('pre-fills the job selection');
      await ml.jobSelection.assertJobSelection([jobId]);

      await ml.api.assertModelMemoryLimitForJob(jobId, '11mb');
    });

    it('can create multi metric job from vis with single layer', async () => {
      const selectedPanelTitle = 'panel1';
      jobId = 'job_from_lens_2';
      const numberOfCompatibleLayers = 1;
      const layerIndex = 0;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.setJobId(jobId, layerIndex);

      await ml.lensVisualizations.clickCreateJob(layerIndex);
      await ml.lensVisualizations.assertJobHasBeenCreated(layerIndex);

      await ml.lensVisualizations.clickViewResults(layerIndex);

      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('Anomaly explorer page loaded');
      await ml.lensVisualizations.anomalyExplorerPageLoaded();

      await ml.testExecution.logTestStep('pre-fills the job selection');
      await ml.jobSelection.assertJobSelection([jobId]);

      await ml.api.assertModelMemoryLimitForJob(jobId, '12mb');
    });
  });
}
