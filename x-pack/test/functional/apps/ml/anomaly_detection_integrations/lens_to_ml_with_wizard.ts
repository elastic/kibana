/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObject, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const browser = getService('browser');
  const retry = getService('retry');
  const headerPage = getPageObject('header');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  const dashboardTitle = 'lens_to_ml';
  const dashboardArchive =
    'x-pack/test/functional/fixtures/kbn_archiver/ml/lens_to_ml_dashboard.json';

  async function retrySwitchTab(tabIndex: number, seconds: number) {
    await retry.tryForTime(seconds * 1000, async () => {
      await browser.switchTab(tabIndex);
    });
    await browser.setWindowSize(1920, 1080);
  }

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

  async function createJobInWizard(
    jobId: string,
    splitField?: string,
    aggAndFieldIdentifier?: string
  ) {
    await headerPage.waitUntilLoadingHasFinished();

    if (splitField !== undefined) {
      await ml.jobTypeSelection.assertMultiMetricJobWizardOpen();
      await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);
    } else if (aggAndFieldIdentifier !== undefined) {
      await ml.jobTypeSelection.assertSingleMetricJobWizardOpen();
      await ml.jobWizardCommon.assertAggAndFieldInputExists();
      await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, true);
      await ml.jobWizardCommon.assertAnomalyChartExists('LINE');
    }

    await ml.testExecution.logTestStep('job creation displays the job details step');
    await ml.jobWizardCommon.advanceToJobDetailsSection();

    await ml.testExecution.logTestStep('job creation inputs the job id');
    await ml.jobWizardCommon.assertJobIdInputExists();
    await ml.jobWizardCommon.setJobId(jobId);

    await ml.testExecution.logTestStep('job creation displays the validation step');
    await ml.jobWizardCommon.advanceToValidationSection();

    await ml.testExecution.logTestStep('job creation displays the summary step');
    await ml.jobWizardCommon.advanceToSummarySection();

    await ml.testExecution.logTestStep('job creation creates the job and finishes processing');
    await ml.jobWizardCommon.assertCreateJobButtonExists();
    await ml.jobWizardCommon.createJobAndWaitForCompletion();

    await ml.testExecution.logTestStep('job creation displays the created job in the job list');
    await ml.navigation.navigateToMl();
    await ml.navigation.navigateToJobManagement();

    await ml.jobTable.filterWithSearchString(jobId, 1);

    await ml.jobTable.assertJobRowJobId(jobId);
  }

  describe('create jobs from lens with wizard', function () {
    this.tags(['ml']);

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

    let tabsCount = 1;

    afterEach(async () => {
      if (tabsCount > 1) {
        await browser.closeCurrentWindow();
        await retrySwitchTab(0, 10);
        tabsCount--;
      }
    });

    it('can create multi metric job from vis with single layer', async () => {
      const selectedPanelTitle = 'panel1';
      const jobId = 'job_from_lens_1';
      const splitField = 'airline';
      const numberOfCompatibleLayers = 1;
      const numberOfIncompatibleLayers = 0;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.assertNumberOfIncompatibleLensLayers(numberOfIncompatibleLayers);

      ml.lensVisualizations.clickCreateJobFromLayerWithWizard(0);

      await retrySwitchTab(1, 10);
      tabsCount++;

      await createJobInWizard(jobId, splitField, undefined);
    });

    it('can create single metric job from vis with single layer', async () => {
      const selectedPanelTitle = 'panel2';
      const aggAndFieldIdentifier = 'Count(Event rate)';
      const jobId = 'job_from_lens_2';
      const numberOfCompatibleLayers = 1;
      const numberOfIncompatibleLayers = 0;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.assertNumberOfIncompatibleLensLayers(numberOfIncompatibleLayers);

      ml.lensVisualizations.clickCreateJobFromLayerWithWizard(0);

      await retrySwitchTab(1, 10);
      tabsCount++;

      await createJobInWizard(jobId, undefined, aggAndFieldIdentifier);
    });

    it('can create multi metric job from vis with multiple compatible layers and single incompatible layer', async () => {
      const selectedPanelTitle = 'panel3';
      const aggAndFieldIdentifier = 'Mean(responsetime)';
      const jobId = 'job_from_lens_3';
      const numberOfCompatibleLayers = 2;
      const numberOfIncompatibleLayers = 1;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.assertNumberOfIncompatibleLensLayers(numberOfIncompatibleLayers);

      ml.lensVisualizations.clickCreateJobFromLayerWithWizard(1);

      await retrySwitchTab(1, 10);
      tabsCount++;

      await createJobInWizard(jobId, undefined, aggAndFieldIdentifier);
    });

    it('shows flyout for job from vis with no compatible layers', async () => {
      const selectedPanelTitle = 'panel4';
      const numberOfCompatibleLayers = 0;
      const numberOfIncompatibleLayers = 1;

      await dashboardPreparation(selectedPanelTitle);

      await ml.lensVisualizations.clickCreateMLJobMenuAction();

      await ml.lensVisualizations.assertLayerSelectorExists();

      await ml.lensVisualizations.assertNumberOfCompatibleLensLayers(numberOfCompatibleLayers);

      await ml.lensVisualizations.assertNumberOfIncompatibleLensLayers(numberOfIncompatibleLayers);
    });

    it('does not show link to ml with vis with only incompatible layer types', async () => {
      const selectedPanelTitle = 'panel5';

      await dashboardPreparation(selectedPanelTitle);

      ml.lensVisualizations.assertMLJobMenuActionDoesNotExist();
    });
  });
}
