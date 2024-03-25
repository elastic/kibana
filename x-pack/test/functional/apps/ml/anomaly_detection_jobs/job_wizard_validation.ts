/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { FieldStatsType } from '../common/types';

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');
  const ml = getService('ml');

  const jobId = `fq_single_1_${Date.now()}`;
  const jobDescription =
    'Create single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)';
  const jobGroups = ['automated', 'farequote', 'single-metric'];
  const aggAndFieldIdentifier = 'Mean(responsetime)';
  const bucketSpan = '30m';

  const remoteName = 'ftr-remote:';
  const esIndexPatternName = 'ft_farequote';
  const esIndexPatternString = config.get('esTestCluster.ccs')
    ? remoteName + esIndexPatternName
    : esIndexPatternName;

  const fieldStatsEntries = [
    {
      fieldName: '@version.keyword',
      type: 'keyword' as FieldStatsType,
      expectedValues: ['1'],
    },
  ];

  describe('job wizard validation', function () {
    this.tags(['ml']);
    before(async () => {
      await esNode.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded(esIndexPatternString, '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();

      await ml.testExecution.logTestStep('job creation loads the job management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('job creation loads the new job source selection page');
      await ml.jobManagement.navigateToNewJobSourceSelection();

      await ml.testExecution.logTestStep('job creation loads the job type selection page');
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(esIndexPatternString);

      await ml.testExecution.logTestStep('job creation loads the single metric job wizard page');
      await ml.jobTypeSelection.selectSingleMetricJob();
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

      await ml.testExecution.logTestStep('job creation opens field stats flyout from agg input');
      await ml.jobWizardCommon.assertAggAndFieldInputExists();
      for (const { fieldName, type: fieldType, expectedValues } of fieldStatsEntries) {
        await ml.jobWizardCommon.assertFieldStatFlyoutContentFromAggSelectionInputTrigger(
          fieldName,
          fieldType,
          expectedValues
        );
      }

      await ml.testExecution.logTestStep('job creation selects field and aggregation');
      await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, true);
      await ml.jobWizardCommon.assertAnomalyChartExists('LINE');

      await ml.testExecution.logTestStep('job creation inputs the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan(bucketSpan);

      await ml.testExecution.logTestStep('job creation displays the job details step');
      await ml.jobWizardCommon.advanceToJobDetailsSection();

      await ml.testExecution.logTestStep('job creation inputs the job id');
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.setJobId(jobId);

      await ml.testExecution.logTestStep('job creation inputs job groups');
      await ml.jobWizardCommon.assertJobGroupInputExists();
      for (const jobGroup of jobGroups) {
        await ml.jobWizardCommon.addJobGroup(jobGroup);
      }
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);

      await ml.testExecution.logTestStep('job creation opens the additional settings section');
      await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();

      await ml.testExecution.logTestStep('job creation opens the advanced section');
      await ml.jobWizardCommon.ensureAdvancedSectionOpen();

      await ml.testExecution.logTestStep('job creation displays the model plot switch');
      await ml.jobWizardCommon.assertModelPlotSwitchExists();

      await ml.testExecution.logTestStep('job creation enables the dedicated index switch');
      await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
      await ml.jobWizardCommon.activateDedicatedIndexSwitch();

      await ml.testExecution.logTestStep('job creation inputs the model memory limit');
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle(esIndexPatternString);
    });

    it('job creation and toggling model change annotation triggers enable annotation recommendation callout', async () => {
      await ml.jobWizardCommon.togglingModelChangeAnnotationsShowsCalloutAndRemovesCallout();
    });

    it('too short of a job creation time range results in validation callouts', async () => {
      await ml.jobWizardCommon.goBackToTimeRange();

      const tooShort = 'Feb 7, 2016 @ 00:01:00.000';
      await ml.jobWizardCommon.setEndDate(tooShort);

      await ml.testExecution.logTestStep('job creation displays the validation step');
      await ml.jobWizardCommon.goBackToJobDetailsSection();
      await ml.jobWizardCommon.advanceToValidationSection();
      await ml.jobWizardCommon.assertValidationCallouts([
        'Time range\nThe selected or available time range might be too short. The recommended minimum time range should be at least 2 hours and 25 times the bucket span.',
        'The datafeed preview failed. This may be due to an error in the job or datafeed configurations.',
        'Job validation has failed, but you can still continue and create the job. Please be aware the job may encounter problems when running.',
      ]);

      await ml.jobWizardCommon.goBackToTimeRange();
      await ml.jobWizardCommon.clickUseFullDataButton(
        'Feb 7, 2016 @ 00:00:00.000',
        'Feb 11, 2016 @ 23:59:54.000'
      );
      await ml.jobWizardCommon.advanceToValidationSection();
      await ml.jobWizardCommon.assertValidationCallouts([
        'Time range\nValid and long enough to model patterns in the data.',
        'Model memory limit\nValid and within the estimated model memory limit. Learn more',
      ]);
    });

    it('job creation memory limit too large results in validation callout', async () => {
      await ml.jobWizardCommon.goBackToJobDetailsSection();

      const tooLarge = '100000000MB';
      await ml.jobWizardCommon.setModelMemoryLimit(tooLarge);

      await ml.jobWizardCommon.clickNextButton();
      await ml.jobWizardCommon.assertValidationCallouts([
        'Job will not be able to run in the current cluster because model memory limit is higher than 9790MB.',
      ]);
    });
  });
}
