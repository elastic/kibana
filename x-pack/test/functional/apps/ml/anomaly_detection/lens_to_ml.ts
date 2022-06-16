/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { Datafeed, Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';
// import { JOB_CONFIG, DATAFEED_CONFIG, ML_EMBEDDABLE_TYPES } from './constants';

// const testDataList = [
//   {
//     type: 'testData',
//     suiteSuffix: 'with multi metric job',
//     panelTitle: `ML anomaly charts for ${JOB_CONFIG.job_id}`,
//     jobConfig: JOB_CONFIG,
//     datafeedConfig: DATAFEED_CONFIG,
//     dashboardTitle: `ML anomaly charts for fq_multi_1_ae ${Date.now()}`,
//     expected: {
//       influencers: [
//         {
//           field: 'airline',
//           count: 10,
//           labelsContained: ['AAL'],
//         },
//       ],
//     },
//   },
// ];
//

export default function ({ getService, getPageObject, getPageObjects }: FtrProviderContext) {
  // const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const headerPage = getPageObject('header');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);

  async function retrySwitchTab(tabIndex: number, seconds: number) {
    await retry.tryForTime(seconds * 1000, async () => {
      await browser.switchTab(tabIndex);
    });
  }

  describe('anomaly charts in dashboard', function () {
    this.tags(['ml']);

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
      await ml.testResources.installKibanaSampleData('flights');
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.removeKibanaSampleData('flights');
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('dashboard');
    });

    describe('tests create job from lens', () => {
      let tabsCount = 1;

      afterEach(async () => {
        if (tabsCount > 1) {
          await browser.closeCurrentWindow();
          await retrySwitchTab(0, 3);
          tabsCount--;
        }
      });

      it('can create multi metric job from vis', async () => {
        const dashboardTitle = '[Flights] Global Flight Dashboard';
        const selectedPanelTitle = '[Flights] Delay Type';
        const jobId = 'testest4';
        const splitField = 'FlightDelayType';

        await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
        await ml.dashboardEmbeddables.assertDashboardPanelExists(selectedPanelTitle);
        const header = await dashboardPanelActions.getPanelHeading(selectedPanelTitle);
        await dashboardPanelActions.openContextMenuMorePanel(header);
        await testSubjects.click('embeddablePanelAction-create-ml-ad-job-action');

        await retrySwitchTab(1, 3);
        tabsCount++;

        await headerPage.waitUntilLoadingHasFinished();
        await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
        await ml.jobWizardCommon.assertInfluencerSelection([splitField]);

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
      });

      it('can create singel metric job from vis', async () => {
        const dashboardTitle = '[Flights] Global Flight Dashboard';
        const selectedPanelTitle = '[Flights] Flight count';
        const aggAndFieldIdentifier = 'Count(Event rate)';
        const jobId = 'testest52';

        await PageObjects.dashboard.loadSavedDashboard(dashboardTitle);
        await ml.dashboardEmbeddables.assertDashboardPanelExists(selectedPanelTitle);
        const header = await dashboardPanelActions.getPanelHeading(selectedPanelTitle);
        await dashboardPanelActions.openContextMenuMorePanel(header);
        await testSubjects.click('embeddablePanelAction-create-ml-ad-job-action');

        await retrySwitchTab(1, 3);
        tabsCount++;

        await headerPage.waitUntilLoadingHasFinished();
        await ml.jobWizardCommon.assertAggAndFieldInputExists();
        await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, true);
        await ml.jobWizardCommon.assertAnomalyChartExists('LINE');

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
      });
    });

    // for (const testData of testDataList) {
    //   describe(testData.suiteSuffix, function () {
    //     before(async () => {
    //       await ml.api.createAndRunAnomalyDetectionLookbackJob(
    //         testData.jobConfig,
    //         testData.datafeedConfig
    //       );
    //       await PageObjects.common.navigateToApp('dashboard');
    //     });

    //     after(async () => {
    //       await ml.testResources.deleteDashboardByTitle(testData.dashboardTitle);
    //     });

    //     it('can open job selection flyout', async () => {
    //       // await PageObjects.dashboard.clickNewDashboard();
    //       // await ml.dashboardEmbeddables.assertDashboardIsEmpty();
    //       // await ml.dashboardEmbeddables.openAnomalyJobSelectionFlyout(
    //       //   ML_EMBEDDABLE_TYPES.ANOMALY_CHARTS
    //       // );
    //     });

    //     it('can select jobs', async () => {
    //       await ml.dashboardJobSelectionTable.setRowCheckboxState(testData.jobConfig.job_id, true);
    //       await ml.dashboardJobSelectionTable.applyJobSelection();
    //       await ml.dashboardEmbeddables.assertAnomalyChartsEmbeddableInitializerExists();
    //       await ml.dashboardEmbeddables.assertSelectMaxSeriesToPlotValue(6);
    //     });

    //     it('create new anomaly charts panel', async () => {
    //       await ml.dashboardEmbeddables.clickInitializerConfirmButtonEnabled();
    //       await ml.dashboardEmbeddables.assertDashboardPanelExists(testData.panelTitle);

    //       await ml.dashboardEmbeddables.assertNoMatchingAnomaliesMessageExists();

    //       await PageObjects.timePicker.setAbsoluteRange(
    //         'Feb 7, 2016 @ 00:00:00.000',
    //         'Feb 11, 2016 @ 00:00:00.000'
    //       );
    //       await PageObjects.timePicker.pauseAutoRefresh();
    //       await ml.dashboardEmbeddables.assertAnomalyChartsSeverityThresholdControlExists();
    //       await ml.dashboardEmbeddables.assertAnomalyChartsExists();
    //       await PageObjects.dashboard.saveDashboard(testData.dashboardTitle);
    //     });
    //   });
    // }
  });
}
