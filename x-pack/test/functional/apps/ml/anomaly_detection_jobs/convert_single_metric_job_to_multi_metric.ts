/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');
  const ml = getService('ml');

  const calendarId = `wizard-test-calendar_${Date.now()}`;
  const remoteName = 'ftr-remote:';
  const esIndexPatternName = 'ft_farequote';
  const esIndexPatternString = config.get('esTestCluster.ccs')
    ? remoteName + esIndexPatternName
    : esIndexPatternName;

  describe('single metric job conversion to multi-metric job', function () {
    this.tags(['ml']);
    before(async () => {
      await esNode.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded(esIndexPatternString, '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createCalendar(calendarId);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle(esIndexPatternString);
    });

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

    it('loads the single metric wizard for the source data', async () => {
      await ml.testExecution.logTestStep('loads the job management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('loads the new job source selection page');
      await ml.jobManagement.navigateToNewJobSourceSelection();

      await ml.testExecution.logTestStep('loads the job type selection page');
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(esIndexPatternString);

      await ml.testExecution.logTestStep('loads the single metric job wizard page');
      await ml.jobTypeSelection.selectSingleMetricJob();
    });

    it('navigates through the single metric wizard and sets all needed fields', async () => {
      await ml.testExecution.logTestStep('displays the time range step');
      await ml.jobWizardCommon.assertTimeRangeSectionExists();

      await ml.testExecution.logTestStep('sets the time range');
      await ml.jobWizardCommon.clickUseFullDataButton(
        'Feb 7, 2016 @ 00:00:00.000',
        'Feb 11, 2016 @ 23:59:54.000'
      );

      await ml.testExecution.logTestStep('displays the event rate chart');
      await ml.jobWizardCommon.assertEventRateChartExists();
      await ml.jobWizardCommon.assertEventRateChartHasData();

      await ml.testExecution.logTestStep('displays the pick fields step');
      await ml.jobWizardCommon.advanceToPickFieldsSection();

      await ml.testExecution.logTestStep('selects field and aggregation');
      await ml.jobWizardCommon.selectAggAndField(smAggAndFieldIdentifier, true);
      await ml.jobWizardCommon.assertAnomalyChartExists('LINE');

      await ml.testExecution.logTestStep('inputs the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan(bucketSpan);

      await ml.testExecution.logTestStep('displays the job details step');
      await ml.jobWizardCommon.advanceToJobDetailsSection();

      await ml.testExecution.logTestStep('inputs the job id');
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.setJobId(jobId);

      await ml.testExecution.logTestStep('inputs the job description');
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.setJobDescription(jobDescription);

      await ml.testExecution.logTestStep('inputs job groups');
      await ml.jobWizardCommon.assertJobGroupInputExists();
      for (const jobGroup of jobGroups) {
        await ml.jobWizardCommon.addJobGroup(jobGroup);
      }
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

      await ml.testExecution.logTestStep('opens the additional settings section');
      await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

      await ml.testExecution.logTestStep('adds a new custom url');
      await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });

      await ml.testExecution.logTestStep('assigns calendars');
      await ml.jobWizardCommon.addCalendar(calendarId);
    });

    it('converts to multi-metric job creation wizard and retains all previously set fields', async () => {
      await ml.testExecution.logTestStep(
        'navigates to previous page and converts to multi-metric job wizard'
      );
      await ml.jobWizardCommon.navigateToPreviousJobWizardPage(
        'mlJobWizardButtonConvertToMultiMetric'
      );
      await ml.jobWizardCommon.convertToMultiMetricJobWizard();
      await ml.jobWizardCommon.assertPickFieldsSectionExists();

      await ml.testExecution.logTestStep(
        'multi-metric job wizard selects detectors and displays detector previews'
      );
      for (const [index, aggAndFieldIdentifier] of mmAggAndFieldIdentifiers.entries()) {
        await ml.jobWizardCommon.assertAggAndFieldInputExists();
        await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, false);
        await ml.jobWizardCommon.assertDetectorPreviewExists(
          aggAndFieldIdentifier,
          // +1 to account for the one detector set from single metric job wizard
          index + 1,
          'LINE'
        );
      }

      await ml.jobWizardMultiMetric.selectSplitField(splitField);

      await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
      await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle('AAL');
      await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(9);

      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);

      await ml.testExecution.logTestStep('multi-metric job wizard retains the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.assertBucketSpanValue(bucketSpan);

      await ml.testExecution.logTestStep('multi-metric job wizard displays the job details step');
      await ml.jobWizardCommon.advanceToJobDetailsSection();

      await ml.testExecution.logTestStep('multi-metric job wizard retains job id');
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.assertJobIdValue(jobId);

      await ml.testExecution.logTestStep('multi-metric job wizard retains the job description');
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.assertJobDescriptionValue(jobDescription);

      await ml.testExecution.logTestStep('multi-metric job wizard retains job groups');
      await ml.jobWizardCommon.assertJobGroupInputExists();
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

      await ml.testExecution.logTestStep(
        'multi-metric job wizard opens the additional settings section'
      );
      await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

      await ml.testExecution.logTestStep('multi-metric job wizard retains calendar and custom url');
      await ml.jobWizardCommon.assertCalendarsSelection([calendarId]);
      await ml.jobWizardCommon.assertCustomUrlLabel(0, { label: 'check-kibana-dashboard' });

      await ml.testExecution.logTestStep('multi-metric job wizard displays the validation step');
      await ml.jobWizardCommon.advanceToValidationSection();

      await ml.testExecution.logTestStep('multi-metric job wizard displays the summary step');
      await ml.jobWizardCommon.advanceToSummarySection();
    });

    it('runs the converted job and displays it correctly in the job list', async () => {
      await ml.testExecution.logTestStep(
        'multi-metric job wizard creates the job and finishes processing'
      );
      await ml.jobWizardCommon.assertCreateJobButtonExists();
      await ml.jobWizardCommon.createJobAndWaitForCompletion();

      await ml.testExecution.logTestStep(
        'multi-metric job wizard displays the created job in the job list'
      );
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.jobTable.filterWithSearchString(jobId, 1);

      await ml.testExecution.logTestStep(
        'job list displays details for the created job in the job list'
      );

      await ml.testExecution.logTestStep('job has detector results');
      for (let i = 0; i < mmAggAndFieldIdentifiers.length; i++) {
        await ml.api.assertDetectorResultsExist(jobId, i);
      }
    });
  });
}
