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

  const jobId = `fq_single_1_${Date.now()}`;
  const jobDescription =
    'Create single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)';
  const jobGroups = ['automated', 'farequote', 'single-metric'];
  const aggAndFieldIdentifier = 'Mean(responsetime)';
  const bucketSpan = '30m';
  const memoryLimit = '15MB';

  describe('single metric job creation', function() {
    this.tags('smoke');
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

    it('loads the single metric job wizard page', async () => {
      await ml.jobTypeSelection.selectSingleMetricJob();
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

    it('selects field and aggregation', async () => {
      await ml.jobWizardCommon.assertAggAndFieldInputExists();
      await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier);
      await ml.jobWizardCommon.assertAggAndFieldSelection(aggAndFieldIdentifier);
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
      const rows = await ml.jobTable.parseJobTable();
      const job = rows.filter(row => row.id === jobId)[0];
      expect(job.description).to.eql(jobDescription);
      expect(job.jobGroups).to.eql(jobGroups);
      expect(job.recordCount).to.eql('2,399');
      expect(job.memoryStatus).to.eql('ok');
      expect(job.jobState).to.eql('closed');
      expect(job.datafeedState).to.eql('stopped');
      expect(job.latestTimestamp).to.eql('2016-02-11 23:56:59');

      const countDetails = await ml.jobTable.parseJobCounts(jobId);
      const counts = countDetails.counts;
      expect(counts.job_id).to.eql(jobId);
      expect(counts.processed_record_count).to.eql('2,399');
      expect(counts.processed_field_count).to.eql('4,798');
      expect(counts.input_bytes).to.eql('180.6 KB');
      expect(counts.input_field_count).to.eql('4,798');
      expect(counts.invalid_date_count).to.eql('0');
      expect(counts.missing_field_count).to.eql('0');
      expect(counts.out_of_order_timestamp_count).to.eql('0');
      expect(counts.empty_bucket_count).to.eql('0');
      expect(counts.sparse_bucket_count).to.eql('0');
      expect(counts.bucket_count).to.eql('239');
      expect(counts.earliest_record_timestamp).to.eql('2016-02-07 00:02:50');
      expect(counts.latest_record_timestamp).to.eql('2016-02-11 23:56:59');
      expect(counts).to.have.property('last_data_time');
      expect(counts.input_record_count).to.eql('2,399');
      expect(counts.latest_bucket_timestamp).to.eql('2016-02-11 23:30:00');

      const modelSizeStats = countDetails.modelSizeStats;
      expect(modelSizeStats.job_id).to.eql(jobId);
      expect(modelSizeStats.result_type).to.eql('model_size_stats');
      expect(modelSizeStats.model_bytes).to.eql('47.6 KB');
      expect(modelSizeStats.model_bytes_exceeded).to.eql('0');
      expect(modelSizeStats.model_bytes_memory_limit).to.eql('15728640');
      expect(modelSizeStats.total_by_field_count).to.eql('3');
      expect(modelSizeStats.total_over_field_count).to.eql('0');
      expect(modelSizeStats.total_partition_field_count).to.eql('2');
      expect(modelSizeStats.bucket_allocation_failures_count).to.eql('0');
      expect(modelSizeStats.memory_status).to.eql('ok');
      expect(modelSizeStats).to.have.property('log_time');
      expect(modelSizeStats.timestamp).to.eql('2016-02-11 23:00:00');
    });
  });
}
