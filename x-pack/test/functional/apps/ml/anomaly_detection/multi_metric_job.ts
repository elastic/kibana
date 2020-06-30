/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const jobId = `fq_multi_1_${Date.now()}`;
  const jobIdClone = `${jobId}_clone`;
  const jobDescription =
    'Create multi metric job based on the farequote dataset with 15m bucketspan and min/max/mean(responsetime) split by airline';
  const jobGroups = ['automated', 'farequote', 'multi-metric'];
  const jobGroupsClone = [...jobGroups, 'clone'];
  const aggAndFieldIdentifiers = ['Min(responsetime)', 'Max(responsetime)', 'Mean(responsetime)'];
  const splitField = 'airline';
  const bucketSpan = '15m';
  const memoryLimit = '20mb';

  function getExpectedRow(expectedJobId: string, expectedJobGroups: string[]) {
    return {
      id: expectedJobId,
      description: jobDescription,
      jobGroups: [...new Set(expectedJobGroups)].sort(),
      recordCount: '86,274',
      memoryStatus: 'ok',
      jobState: 'closed',
      datafeedState: 'stopped',
      latestTimestamp: '2016-02-11 23:59:54',
    };
  }

  function getExpectedCounts(expectedJobId: string) {
    return {
      job_id: expectedJobId,
      processed_record_count: '86,274',
      processed_field_count: '172,548',
      input_bytes: '6.4 MB',
      input_field_count: '172,548',
      invalid_date_count: '0',
      missing_field_count: '0',
      out_of_order_timestamp_count: '0',
      empty_bucket_count: '0',
      sparse_bucket_count: '0',
      bucket_count: '479',
      earliest_record_timestamp: '2016-02-07 00:00:00',
      latest_record_timestamp: '2016-02-11 23:59:54',
      input_record_count: '86,274',
      latest_bucket_timestamp: '2016-02-11 23:45:00',
    };
  }

  function getExpectedModelSizeStats(expectedJobId: string) {
    return {
      job_id: expectedJobId,
      result_type: 'model_size_stats',
      model_bytes_exceeded: '0.0 B',
      total_by_field_count: '59',
      total_over_field_count: '0',
      total_partition_field_count: '58',
      bucket_allocation_failures_count: '0',
      memory_status: 'ok',
      timestamp: '2016-02-11 23:30:00',
    };
  }

  const calendarId = `wizard-test-calendar_${Date.now()}`;

  describe('multi metric', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createCalendar(calendarId);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('job creation loads the job management page', async () => {
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();
    });

    it('job creation loads the new job source selection page', async () => {
      await ml.jobManagement.navigateToNewJobSourceSelection();
    });

    it('job creation loads the job type selection page', async () => {
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob('ft_farequote');
    });

    it('job creation loads the multi metric job wizard page', async () => {
      await ml.jobTypeSelection.selectMultiMetricJob();
    });

    it('job creation displays the time range step', async () => {
      await ml.jobWizardCommon.assertTimeRangeSectionExists();
    });

    it('job creation sets the timerange', async () => {
      await ml.jobWizardCommon.clickUseFullDataButton(
        'Feb 7, 2016 @ 00:00:00.000',
        'Feb 11, 2016 @ 23:59:54.000'
      );
    });

    it('job creation displays the event rate chart', async () => {
      await ml.jobWizardCommon.assertEventRateChartExists();
      await ml.jobWizardCommon.assertEventRateChartHasData();
    });

    it('job creation displays the pick fields step', async () => {
      await ml.jobWizardCommon.advanceToPickFieldsSection();
    });

    it('job creation selects detectors and displays detector previews', async () => {
      for (const [index, aggAndFieldIdentifier] of aggAndFieldIdentifiers.entries()) {
        await ml.jobWizardCommon.assertAggAndFieldInputExists();
        await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, false);
        await ml.jobWizardCommon.assertDetectorPreviewExists(aggAndFieldIdentifier, index, 'LINE');
      }
    });

    it('job creation inputs the split field and displays split cards', async () => {
      await ml.jobWizardMultiMetric.assertSplitFieldInputExists();
      await ml.jobWizardMultiMetric.selectSplitField(splitField);

      await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
      await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle('AAL');
      await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(9);

      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);
    });

    it('job creation displays the influencer field', async () => {
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);
    });

    it('job creation inputs the bucket span', async () => {
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan(bucketSpan);
    });

    it('job creation displays the job details step', async () => {
      await ml.jobWizardCommon.advanceToJobDetailsSection();
    });

    it('job creation inputs the job id', async () => {
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.setJobId(jobId);
    });

    it('job creation inputs the job description', async () => {
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.setJobDescription(jobDescription);
    });

    it('job creation inputs job groups', async () => {
      await ml.jobWizardCommon.assertJobGroupInputExists();
      for (const jobGroup of jobGroups) {
        await ml.jobWizardCommon.addJobGroup(jobGroup);
      }
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);
    });

    it('job creation opens the additional settings section', async () => {
      await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
    });

    it('job creation adds a new custom url', async () => {
      await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });
    });

    it('job creation assigns calendars', async () => {
      await ml.jobWizardCommon.addCalendar(calendarId);
    });

    it('job creation opens the advanced section', async () => {
      await ml.jobWizardCommon.ensureAdvancedSectionOpen();
    });

    it('job creation displays the model plot switch', async () => {
      await ml.jobWizardCommon.assertModelPlotSwitchExists();
    });

    it('job creation enables the dedicated index switch', async () => {
      await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
      await ml.jobWizardCommon.activateDedicatedIndexSwitch();
    });

    it('job creation inputs the model memory limit', async () => {
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
      await ml.jobWizardCommon.setModelMemoryLimit(memoryLimit);
    });

    it('job creation displays the validation step', async () => {
      await ml.jobWizardCommon.advanceToValidationSection();
    });

    it('job creation displays the summary step', async () => {
      await ml.jobWizardCommon.advanceToSummarySection();
    });

    it('job creation creates the job and finishes processing', async () => {
      await ml.jobWizardCommon.assertCreateJobButtonExists();
      await ml.jobWizardCommon.createJobAndWaitForCompletion();
    });

    it('job creation displays the created job in the job list', async () => {
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.jobTable.waitForJobsToLoad();
      await ml.jobTable.filterWithSearchString(jobId);
      const rows = await ml.jobTable.parseJobTable();
      expect(rows.filter((row) => row.id === jobId)).to.have.length(1);
    });

    it('job creation displays details for the created job in the job list', async () => {
      await ml.jobTable.assertJobRowFields(jobId, getExpectedRow(jobId, jobGroups));

      await ml.jobTable.assertJobRowDetailsCounts(
        jobId,
        getExpectedCounts(jobId),
        getExpectedModelSizeStats(jobId)
      );
    });

    it('job creation has detector results', async () => {
      for (let i = 0; i < aggAndFieldIdentifiers.length; i++) {
        await ml.api.assertDetectorResultsExist(jobId, i);
      }
    });

    it('job cloning clicks the clone action and loads the multi metric wizard', async () => {
      await ml.jobTable.clickCloneJobAction(jobId);
      await ml.jobTypeSelection.assertMultiMetricJobWizardOpen();
    });

    it('job cloning displays the time range step', async () => {
      await ml.jobWizardCommon.assertTimeRangeSectionExists();
    });

    it('job cloning sets the timerange', async () => {
      await ml.jobWizardCommon.clickUseFullDataButton(
        'Feb 7, 2016 @ 00:00:00.000',
        'Feb 11, 2016 @ 23:59:54.000'
      );
    });

    it('job cloning displays the event rate chart', async () => {
      await ml.jobWizardCommon.assertEventRateChartExists();
      await ml.jobWizardCommon.assertEventRateChartHasData();
    });

    it('job cloning displays the pick fields step', async () => {
      await ml.jobWizardCommon.advanceToPickFieldsSection();
    });

    it('job cloning pre-fills detectors and shows preview with split cards', async () => {
      for (const [index, aggAndFieldIdentifier] of aggAndFieldIdentifiers.entries()) {
        await ml.jobWizardCommon.assertDetectorPreviewExists(aggAndFieldIdentifier, index, 'LINE');
      }

      await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
      await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle('AAL');
      await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(9);
    });

    it('job cloning pre-fills the split field', async () => {
      await ml.jobWizardMultiMetric.assertSplitFieldInputExists();
      await ml.jobWizardMultiMetric.assertSplitFieldSelection([splitField]);
    });

    it('job cloning pre-fills influencers', async () => {
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);
    });

    it('job cloning pre-fills the bucket span', async () => {
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.assertBucketSpanValue(bucketSpan);
    });

    it('job cloning displays the job details step', async () => {
      await ml.jobWizardCommon.advanceToJobDetailsSection();
    });

    it('job cloning does not pre-fill the job id', async () => {
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.assertJobIdValue('');
    });

    it('job cloning inputs the clone job id', async () => {
      await ml.jobWizardCommon.setJobId(jobIdClone);
    });

    it('job cloning pre-fills the job description', async () => {
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.assertJobDescriptionValue(jobDescription);
    });

    it('job cloning pre-fills job groups', async () => {
      await ml.jobWizardCommon.assertJobGroupInputExists();
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);
    });

    it('job cloning inputs the clone job group', async () => {
      await ml.jobWizardCommon.assertJobGroupInputExists();
      await ml.jobWizardCommon.addJobGroup('clone');
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroupsClone);
    });

    it('job cloning opens the additional settings section', async () => {
      await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
    });

    it('job cloning persists custom urls', async () => {
      await ml.customUrls.assertCustomUrlItem(0, 'check-kibana-dashboard');
    });

    it('job cloning persists assigned calendars', async () => {
      await ml.jobWizardCommon.assertCalendarsSelection([calendarId]);
    });

    it('job cloning opens the advanced section', async () => {
      await ml.jobWizardCommon.ensureAdvancedSectionOpen();
    });

    it('job cloning pre-fills the model plot switch', async () => {
      await ml.jobWizardCommon.assertModelPlotSwitchExists();
      await ml.jobWizardCommon.assertModelPlotSwitchCheckedState(false);
    });

    it('job cloning pre-fills the dedicated index switch', async () => {
      await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
      await ml.jobWizardCommon.assertDedicatedIndexSwitchCheckedState(true);
    });

    // MML during clone has changed in #61589
    // TODO: adjust test code to reflect the new behavior
    it.skip('job cloning pre-fills the model memory limit', async () => {
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
      await ml.jobWizardCommon.assertModelMemoryLimitValue(memoryLimit);
    });

    it('job cloning displays the validation step', async () => {
      await ml.jobWizardCommon.advanceToValidationSection();
    });

    it('job cloning displays the summary step', async () => {
      await ml.jobWizardCommon.advanceToSummarySection();
    });

    it('job cloning creates the job and finishes processing', async () => {
      await ml.jobWizardCommon.assertCreateJobButtonExists();
      await ml.jobWizardCommon.createJobAndWaitForCompletion();
    });

    it('job cloning displays the created job in the job list', async () => {
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.jobTable.waitForJobsToLoad();
      await ml.jobTable.filterWithSearchString(jobIdClone);
      const rows = await ml.jobTable.parseJobTable();
      expect(rows.filter((row) => row.id === jobIdClone)).to.have.length(1);
    });

    it('job cloning displays details for the created job in the job list', async () => {
      await ml.jobTable.assertJobRowFields(jobIdClone, getExpectedRow(jobIdClone, jobGroupsClone));

      await ml.jobTable.assertJobRowDetailsCounts(
        jobIdClone,
        getExpectedCounts(jobIdClone),
        getExpectedModelSizeStats(jobIdClone)
      );
    });

    it('job cloning has detector results', async () => {
      for (let i = 0; i < aggAndFieldIdentifiers.length; i++) {
        await ml.api.assertDetectorResultsExist(jobId, i);
      }
    });
  });
}
