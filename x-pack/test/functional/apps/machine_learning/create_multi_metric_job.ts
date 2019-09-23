/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const jobId = `fq_multi_1_${Date.now()}`;
  const jobDescription =
    'Create multi metric job based on the farequote dataset with 15m bucketspan and min/max/mean(responsetime) split by airline';
  const jobGroups = ['automated', 'farequote', 'multi-metric'];
  const aggAndFieldIdentifiers = ['Min(responsetime)', 'Max(responsetime)', 'Mean(responsetime)'];
  const splitField = 'airline';
  const bucketSpan = '15m';
  const memoryLimit = '20MB';

  describe('multi metric job creation', function() {
    this.tags(['smoke', 'mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
      await ml.api.cleanMlIndices();
      await ml.api.cleanDataframeIndices();
    });

    it('loads the job management page', async () => {
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();
    });

    it('loads the new job source selection page', async () => {
      await ml.jobManagement.navigateToNewJobSourceSelection();
    });

    it('loads the job type selection page', async () => {
      await ml.jobSourceSelection.selectSourceIndexPattern('farequote');
    });

    it('loads the multi metric job wizard page', async () => {
      await ml.jobTypeSelection.selectMultiMetricJob();
    });

    it('displays the time range step', async () => {
      await ml.jobWizardCommon.assertTimeRangeSectionExists();
    });

    it('displays the event rate chart', async () => {
      await ml.jobWizardCommon.clickUseFullDataButton();
      await ml.jobWizardCommon.assertEventRateChartExists();
    });

    it('displays the pick fields step', async () => {
      await ml.jobWizardCommon.clickNextButton();
      await ml.jobWizardCommon.assertPickFieldsSectionExists();
    });

    it('selects detectors and displays detector previews', async () => {
      for (const [index, aggAndFieldIdentifier] of aggAndFieldIdentifiers.entries()) {
        await ml.jobWizardCommon.assertAggAndFieldInputExists();
        await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier);
        await ml.jobWizardCommon.assertDetectorPreviewExists(aggAndFieldIdentifier, index, 'LINE');
      }
    });

    it('inputs the split field and displays split cards', async () => {
      await ml.jobWizardMultiMetric.assertSplitFieldInputExists();
      await ml.jobWizardMultiMetric.selectSplitField(splitField);
      await ml.jobWizardMultiMetric.assertSplitFieldSelection(splitField);

      await ml.jobWizardMultiMetric.assertDetectorSplitExists(splitField);
      await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle('AAL');
      await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(9);

      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);
    });

    it('displays the influencer field', async () => {
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([splitField]);
    });

    it('inputs the bucket span', async () => {
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan(bucketSpan);
      await ml.jobWizardCommon.assertBucketSpanValue(bucketSpan);
    });

    it('displays the job details step', async () => {
      await ml.jobWizardCommon.clickNextButton();
      await ml.jobWizardCommon.assertJobDetailsSectionExists();
    });

    it('inputs the job id', async () => {
      await ml.jobWizardCommon.assertJobIdInputExists();
      await ml.jobWizardCommon.setJobId(jobId);
      await ml.jobWizardCommon.assertJobIdValue(jobId);
    });

    it('inputs the job description', async () => {
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.setJobDescription(jobDescription);
      await ml.jobWizardCommon.assertJobDescriptionValue(jobDescription);
    });

    it('inputs job groups', async () => {
      await ml.jobWizardCommon.assertJobGroupInputExists();
      for (const jobGroup of jobGroups) {
        await ml.jobWizardCommon.addJobGroup(jobGroup);
      }
      await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);
    });

    it('opens the advanced section', async () => {
      await ml.jobWizardCommon.ensureAdvancedSectionOpen();
    });

    it('displays the model plot switch', async () => {
      await ml.jobWizardCommon.assertModelPlotSwitchExists();
    });

    it('enables the dedicated index switch', async () => {
      await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
      await ml.jobWizardCommon.activateDedicatedIndexSwitch();
      await ml.jobWizardCommon.assertDedicatedIndexSwitchCheckedState(true);
    });

    it('inputs the model memory limit', async () => {
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
      await ml.jobWizardCommon.setModelMemoryLimit(memoryLimit);
      await ml.jobWizardCommon.assertModelMemoryLimitValue(memoryLimit);
    });

    it('displays the validation step', async () => {
      await ml.jobWizardCommon.clickNextButton();
      await ml.jobWizardCommon.assertValidationSectionExists();
    });

    it('displays the summary step', async () => {
      await ml.jobWizardCommon.clickNextButton();
      await ml.jobWizardCommon.assertSummarySectionExists();
    });

    it('creates the job and finishes processing', async () => {
      await ml.jobWizardCommon.assertCreateJobButtonExists();
      await ml.jobWizardCommon.createJobAndWaitForCompletion();
    });

    it('displays the created job in the job list', async () => {
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.jobTable.waitForJobsToLoad();
      await ml.jobTable.filterWithSearchString(jobId);
      const rows = await ml.jobTable.parseJobTable();
      expect(rows.filter(row => row.id === jobId)).to.have.length(1);
    });

    it('displays details for the created job in the job list', async () => {
      const expectedRow = {
        id: jobId,
        description: jobDescription,
        jobGroups,
        recordCount: '86,274',
        memoryStatus: 'ok',
        jobState: 'closed',
        datafeedState: 'stopped',
        latestTimestamp: '2016-02-11 23:59:54',
      };
      await ml.jobTable.assertJobRowFields(jobId, expectedRow);

      const expectedCounts = {
        job_id: jobId,
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
      const expectedModelSizeStats = {
        job_id: jobId,
        result_type: 'model_size_stats',
        model_bytes_exceeded: '0',
        model_bytes_memory_limit: '20971520',
        total_by_field_count: '59',
        total_over_field_count: '0',
        total_partition_field_count: '58',
        bucket_allocation_failures_count: '0',
        memory_status: 'ok',
        timestamp: '2016-02-11 23:30:00',
      };
      await ml.jobTable.assertJobRowDetailsCounts(jobId, expectedCounts, expectedModelSizeStats);
    });
  });
}
