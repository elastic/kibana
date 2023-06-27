/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * @TODO
 * Single metric -> Multi-metric
 * Multi-metric to advanced job
 */
export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');
  const ml = getService('ml');

  const calendarId = `wizard-test-calendar_${Date.now()}`;
  const remoteName = 'ftr-remote:';
  const indexPatternName = 'ft_farequote';
  const indexPatternString = config.get('esTestCluster.ccs')
    ? remoteName + indexPatternName
    : indexPatternName;

  describe('job wizard conversions', function () {
    this.tags(['ml']);
    before(async () => {
      await esNode.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded(indexPatternString, '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createCalendar(calendarId);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle(indexPatternString);
    });

    describe('single metric conversion to multi-metric job', function () {
      const jobId = `fq_single_to_multi_${Date.now()}`;
      const jobDescription = 'Create multi metric job from single metric job';
      const jobGroups = ['automated', 'farequote', 'multi-metric'];
      const smAggAndFieldIdentifier = 'Mean(responsetime)';
      const bucketSpan = '30m';

      const mmAggAndFieldIdentifiers = [
        'Min(responsetime)',
        'Max(responsetime)',
        'High mean(responsetime)',
      ];
      const splitField = 'airline';

      function getExpectedRow(expectedJobId: string) {
        return {
          id: expectedJobId,
          description: 'Create multi metric job fromsingle metric job',
          jobGroups: ['automated', 'farequote', 'multi-metric'],
          recordCount: '86,274',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        };
      }

      it('job creation loads the single metric wizard for the source data', async () => {
        await ml.testExecution.logTestStep('job creation loads the job management page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep('job creation loads the new job source selection page');
        await ml.jobManagement.navigateToNewJobSourceSelection();

        await ml.testExecution.logTestStep('job creation loads the job type selection page');
        await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(indexPatternString);

        await ml.testExecution.logTestStep('job creation loads the single metric job wizard page');
        await ml.jobTypeSelection.selectSingleMetricJob();
      });

      it('job creation navigates through the single metric wizard and sets all needed fields', async () => {
        await ml.testExecution.logTestStep('job creation displays the time range step');
        await ml.jobWizardCommon.assertTimeRangeSectionExists();

        await ml.testExecution.logTestStep('job creation sets the time range');
        await ml.jobWizardCommon.clickUseFullDataButton(
          'Feb 7, 2016 @ 00:00:00.000',
          'Feb 11, 2016 @ 23:59:54.000'
        );

        await ml.testExecution.logTestStep('job creation displays the event rate chart');
        await ml.jobWizardCommon.assertEventRateChartExists();
        await ml.jobWizardCommon.assertEventRateChartHasData();

        await ml.testExecution.logTestStep('job creation displays the pick fields step');
        await ml.jobWizardCommon.advanceToPickFieldsSection();

        await ml.testExecution.logTestStep(
          'single metric job creation selects field and aggregation'
        );
        await ml.jobWizardCommon.selectAggAndField(smAggAndFieldIdentifier, true);
        await ml.jobWizardCommon.assertAnomalyChartExists('LINE');

        await ml.testExecution.logTestStep('single metric job creation inputs the bucket span');
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.setBucketSpan(bucketSpan);

        await ml.testExecution.logTestStep(
          'single metric job creation displays the job details step'
        );
        await ml.jobWizardCommon.advanceToJobDetailsSection();

        await ml.testExecution.logTestStep('single metric job creation inputs the job id');
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.setJobId(jobId);

        await ml.testExecution.logTestStep('single metric job creation inputs the job description');
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.setJobDescription(jobDescription);

        await ml.testExecution.logTestStep('single metric job creation inputs job groups');
        await ml.jobWizardCommon.assertJobGroupInputExists();
        for (const jobGroup of jobGroups) {
          await ml.jobWizardCommon.addJobGroup(jobGroup);
        }
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

        await ml.testExecution.logTestStep(
          'single metric job creation opens the additional settings section'
        );
        await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

        await ml.testExecution.logTestStep('single metric job creation adds a new custom url');
        await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });

        await ml.testExecution.logTestStep('single metric job creation assigns calendars');
        await ml.jobWizardCommon.addCalendar(calendarId);
      });

      it('job creation converts to multi-metric wizard and retains all previously set fields', async () => {
        await ml.testExecution.logTestStep(
          'single metric job creation navigates to previous page and converts to multi-metric job wizard'
        );
        await ml.jobWizardCommon.navigateToPreviousJobWizardPage(
          'mlJobWizardConvertToMultiMetricButton'
        );
        await ml.jobWizardCommon.clickConvertToMultiMetricButton();
        await ml.jobWizardCommon.assertPickFieldsSectionExists();

        await ml.testExecution.logTestStep(
          'multi-metric job creation selects detectors and displays detector previews'
        );
        for (const [index, aggAndFieldIdentifier] of mmAggAndFieldIdentifiers.entries()) {
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, false);
          await ml.jobWizardCommon.assertDetectorPreviewExists(
            aggAndFieldIdentifier,
            index + 1,
            'LINE'
          );
        }

        await ml.jobWizardMultiMetric.selectSplitField(splitField);

        await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
        await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle('AAL');
        await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(9);

        await ml.jobWizardCommon.assertInfluencerSelection([splitField]);

        await ml.testExecution.logTestStep('multi-metric job creation retains the bucket span');
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.assertBucketSpanValue(bucketSpan);

        await ml.testExecution.logTestStep(
          'multi-metric job creation displays the job details step'
        );
        await ml.jobWizardCommon.advanceToJobDetailsSection();

        await ml.testExecution.logTestStep('multi-metric job creation retains job id');
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.assertJobIdValue(jobId);

        await ml.testExecution.logTestStep('multi-metric job creation retains the job description');
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.assertJobDescriptionValue(jobDescription);

        await ml.testExecution.logTestStep('multi-metric job creation retains job groups');
        await ml.jobWizardCommon.assertJobGroupInputExists();
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

        await ml.testExecution.logTestStep(
          'multi-metric job creation opens the additional settings section'
        );
        await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

        await ml.testExecution.logTestStep(
          'multi-metric job creation retains calendar and custom url'
        );
        await ml.jobWizardCommon.assertCalendarsSelection([calendarId]);
        await ml.jobWizardCommon.assertCustomUrlLabel(0, { label: 'check-kibana-dashboard' });

        await ml.testExecution.logTestStep('job creation displays the validation step');
        await ml.jobWizardCommon.advanceToValidationSection();

        await ml.testExecution.logTestStep('job creation displays the summary step');
        await ml.jobWizardCommon.advanceToSummarySection();
      });

      it('job creation runs the converted job and displays it correctly in the job list', async () => {
        await ml.testExecution.logTestStep('job creation creates the job and finishes processing');
        await ml.jobWizardCommon.assertCreateJobButtonExists();
        await ml.jobWizardCommon.createJobAndWaitForCompletion();

        await ml.testExecution.logTestStep('job creation displays the created job in the job list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.jobTable.filterWithSearchString(jobId, 1);

        await ml.testExecution.logTestStep(
          'job creation displays details for the created job in the job list'
        );

        await ml.testExecution.logTestStep('job creation has detector results');
        for (let i = 0; i < mmAggAndFieldIdentifiers.length; i++) {
          await ml.api.assertDetectorResultsExist(jobId, i);
        }
      });
    });
  });
}
