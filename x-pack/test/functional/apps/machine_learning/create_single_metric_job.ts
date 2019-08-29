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

  // FAILING: https://github.com/elastic/kibana/issues/44337
  describe.skip('single metric job creation', function() {
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
      const identifier = 'Mean(responsetime)';
      await ml.jobWizardCommon.assertAggAndFieldInputExists();
      await ml.jobWizardCommon.selectAggAndField(identifier);
      await ml.jobWizardCommon.assertAggAndFieldSelection(identifier);
    });

    it('inputs the bucket span', async () => {
      const bucketSpan = '30m';
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
      const jobDescription =
        'Create single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)';
      await ml.jobWizardCommon.assertJobDescriptionInputExists();
      await ml.jobWizardCommon.setJobDescription(jobDescription);
      await ml.jobWizardCommon.assertJobDescriptionValue(jobDescription);
    });

    it('inputs job groups', async () => {
      const jobGroups = ['automated', 'farequote', 'single-metric'];
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
      const memoryLimit = '15MB';
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
      await ml.jobManagement.filterJobsTable(jobId);
      const jobRow = await ml.jobManagement.getJobRowByJobId(jobId);
      expect(jobRow).to.not.be(null);
    });
  });
}
