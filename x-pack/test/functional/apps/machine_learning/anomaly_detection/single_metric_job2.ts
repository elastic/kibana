/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { testDataList } from './single_metric_job2_testdata';
import { FtrProviderContext } from '../../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('single metric', function() {
    this.tags(['smoke', 'mlqa', 'ro']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote_data_only');
      await ml.testResources.createIndexPatternIfNeeded('farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteFilterIfNeeded();

      await ml.api.createCalendar('wizard-test-calendar');
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function() {
        it('job creation loads the job management page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();
        });

        it('job creation loads the new job source selection page', async () => {
          await ml.jobManagement.navigateToNewJobSourceSelection();
        });

        it('job creation loads the job type selection page', async () => {
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(testData.jobSource);
        });

        it('job creation loads the single metric job wizard page', async () => {
          await ml.jobTypeSelection.selectSingleMetricJob();
        });

        it('job creation displays the time range step', async () => {
          await ml.jobWizardCommon.assertTimeRangeSectionExists();
        });

        it('job creation sets the timerange', async () => {
          await ml.jobWizardCommon.clickUseFullDataButton(
            testData.expected.wizard.fullTimeRangStart,
            testData.expected.wizard.fullTimeRangeEnd
          );
        });

        it('job creation displays the event rate chart', async () => {
          await ml.jobWizardCommon.assertEventRateChartExists();
          await ml.jobWizardCommon.assertEventRateChartHasData();
        });

        it('job creation displays the pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
        });

        it('job creation selects field and aggregation', async () => {
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.selectAggAndField(testData.aggAndFieldIdentifier, true);
          await ml.jobWizardCommon.assertAnomalyChartExists('LINE');
        });

        it('job creation inputs the bucket span', async () => {
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.setBucketSpan(testData.bucketSpan);
        });

        it('job creation displays the job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
        });

        it('job creation inputs the job id', async () => {
          await ml.jobWizardCommon.assertJobIdInputExists();
          await ml.jobWizardCommon.setJobId(testData.jobId);
        });

        it('job creation inputs the job description', async () => {
          await ml.jobWizardCommon.assertJobDescriptionInputExists();
          await ml.jobWizardCommon.setJobDescription(testData.jobDescription);
        });

        it('job creation inputs job groups', async () => {
          await ml.jobWizardCommon.assertJobGroupInputExists();
          for (const jobGroup of testData.jobGroups) {
            await ml.jobWizardCommon.addJobGroup(jobGroup);
          }
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroups);
        });

        it('job creation opens the additional settings section', async () => {
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
        });

        it('job creation adds a new custom url', async () => {
          await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });
        });

        it('job creation assigns calendars', async () => {
          await ml.jobWizardCommon.addCalendar('wizard-test-calendar');
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
          await ml.jobWizardCommon.setModelMemoryLimit(testData.memoryLimit);
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
          await ml.jobTable.filterWithSearchString(testData.jobId);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobId)).to.have.length(1);
        });

        it('job creation displays details for the created job in the job list', async () => {
          await ml.jobTable.assertJobRowFields(testData.jobId, {
            id: testData.jobId,
            description: testData.jobDescription,
            jobGroups: [...new Set(testData.jobGroups)].sort(),
            ...testData.expected.row,
          });

          await ml.jobTable.assertJobRowDetailsCounts(
            testData.jobId,
            { job_id: testData.jobId, ...testData.expected.counts },
            { job_id: testData.jobId, ...testData.expected.modelSizeStats }
          );
        });

        it('job creation has detector results', async () => {
          await ml.api.assertDetectorResultsExist(testData.jobId, 0);
        });
      });
    }
  });
}
