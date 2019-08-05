/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const mlNavigation = getService('mlNavigation');
  const mlJobManagement = getService('mlJobManagement');
  const mlJobSourceSelection = getService('mlJobSourceSelection');
  const mlJobTypeSelection = getService('mlJobTypeSelection');
  const mlJobWizardCommon = getService('mlJobWizardCommon');

  const jobId = `fq_single_1_${Date.now()}`;

  describe('single metric job creation', function() {
    this.tags('smoke');
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
    });

    it('loads the job management page', async () => {
      await mlNavigation.navigateToMl();
      await mlNavigation.navigateToJobManagement();
    });

    it('loads the new job source selection page', async () => {
      await mlJobManagement.navigateToNewJobSourceSelection();
    });

    it('loads the job type selection page', async () => {
      await mlJobSourceSelection.selectSourceIndexPattern('farequote');
    });

    it('loads the single metric job wizard page', async () => {
      await mlJobTypeSelection.selectSingleMetricJob();
    });

    it('displays the time range step', async () => {
      await mlJobWizardCommon.assertTimeRangeSectionExists();
    });

    it('displays the event rate chart', async () => {
      await mlJobWizardCommon.clickUseFullDataButton();
      await mlJobWizardCommon.assertEventRateChartExists();
    });

    it('displays the pick fields step', async () => {
      await mlJobWizardCommon.clickNextButton();
      await mlJobWizardCommon.assertPickFieldsSectionExists();
    });

    it('selects field and aggregation', async () => {
      const identifier = 'Mean(responsetime)';
      await mlJobWizardCommon.assertAggAndFieldInputExists();
      await mlJobWizardCommon.selectAggAndField(identifier);
      await mlJobWizardCommon.assertAggAndFieldSelection(identifier);
    });

    it('inputs the bucket span', async () => {
      const bucketSpan = '30m';
      await mlJobWizardCommon.assertBucketSpanInputExists();
      await mlJobWizardCommon.setBucketSpan(bucketSpan);
      await mlJobWizardCommon.assertBucketSpanValue(bucketSpan);
    });

    it('displays the job details step', async () => {
      await mlJobWizardCommon.clickNextButton();
      await mlJobWizardCommon.assertJobDetailsSectionExists();
    });

    it('inputs the job id', async () => {
      await mlJobWizardCommon.assertJobIdInputExists();
      await mlJobWizardCommon.setJobId(jobId);
      await mlJobWizardCommon.assertJobIdValue(jobId);
    });

    it('inputs the job description', async () => {
      const jobDescription =
        'Create single metric job based on the farequote dataset with 30m bucketspan and mean(responsetime)';
      await mlJobWizardCommon.assertJobDescriptionInputExists();
      await mlJobWizardCommon.setJobDescription(jobDescription);
      await mlJobWizardCommon.assertJobDescriptionValue(jobDescription);
    });

    it('inputs job groups', async () => {
      const jobGroups = ['automated', 'farequote', 'single-metric'];
      await mlJobWizardCommon.assertJobGroupInputExists();
      for (const jobGroup of jobGroups) {
        await mlJobWizardCommon.addJobGroup(jobGroup);
      }
      await mlJobWizardCommon.assertJobGroupSelection(jobGroups);
    });

    it('opens the advanced section', async () => {
      await mlJobWizardCommon.ensureAdvancedSectionOpen();
    });

    it('displays the model plot switch', async () => {
      await mlJobWizardCommon.assertModelPlotSwitchExists();
    });

    it('enables the dedicated index switch', async () => {
      await mlJobWizardCommon.assertDedicatedIndexSwitchExists();
      await mlJobWizardCommon.activateDedicatedIndexSwitch();
      await mlJobWizardCommon.assertDedicatedIndexSwitchCheckedState(true);
    });

    it('inputs the model memory limit', async () => {
      const memoryLimit = '15MB';
      await mlJobWizardCommon.assertModelMemortyLimitInputExists();
      await mlJobWizardCommon.setModelMemoryLimit(memoryLimit);
      await mlJobWizardCommon.assertModelMemoryLimitValue(memoryLimit);
    });

    it('displays the validation step', async () => {
      await mlJobWizardCommon.clickNextButton();
      await mlJobWizardCommon.assertValidationSectionExists();
    });

    it('displays the summary step', async () => {
      await mlJobWizardCommon.clickNextButton();
      await mlJobWizardCommon.assertSummarySectionExists();
    });

    it('creates and finishes the job', async () => {
      await mlJobWizardCommon.assertCreateJobButtonExists();
      await mlJobWizardCommon.createJobAndWaitForCompletion();
    });

    it('loads the job management page', async () => {
      await mlNavigation.navigateToMl();
      await mlNavigation.navigateToJobManagement();
    });

    it('displays the created job in the job list', async () => {
      await mlJobManagement.filterJobsTable(jobId);
      const jobRow = await mlJobManagement.getJobRowByJobId(jobId);
      expect(jobRow).to.not.be(null);
    });
  });
}
