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
      await esArchiver.load('ml/farequote');
      await ml.api.createCalendar('wizard-test-calendar');
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
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
          // TODO: create `assertAnomalyLineChartExists` method
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
          // TODO: move to testData
          await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });
        });

        it('job creation assigns calendars', async () => {
          // TODO: move to testData
          await ml.jobWizardCommon.addCalendar('wizard-test-calendar');
        });

        it('job creation opens the advanced section', async () => {
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
        });

        it('job creation displays the model plot switch', async () => {
          await ml.jobWizardCommon.assertModelPlotSwitchExists();
          // TODO: assert default value (read from testData)
        });

        it('job creation enables the dedicated index switch', async () => {
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
          // TODO: assert default value (read from testData)
          // TODO: read desired switch state from testData
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

        it('job cloning clicks the clone action and loads the single metric wizard', async () => {
          await ml.jobTable.clickCloneJobAction(testData.jobId);
          await ml.jobTypeSelection.assertSingleMetricJobWizardOpen();
        });

        it('job cloning displays the time range step', async () => {
          await ml.jobWizardCommon.assertTimeRangeSectionExists();
        });

        it('job cloning sets the timerange', async () => {
          await ml.jobWizardCommon.clickUseFullDataButton(
            testData.expected.wizard.fullTimeRangStart,
            testData.expected.wizard.fullTimeRangeEnd
          );
        });

        it('job cloning displays the event rate chart', async () => {
          await ml.jobWizardCommon.assertEventRateChartExists();
          await ml.jobWizardCommon.assertEventRateChartHasData();
        });

        it('job cloning displays the pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
        });

        it('job cloning pre-fills field and aggregation', async () => {
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.assertAggAndFieldSelection([testData.aggAndFieldIdentifier]);
          // TODO: see above
          await ml.jobWizardCommon.assertAnomalyChartExists('LINE');
        });

        it('job cloning pre-fills the bucket span', async () => {
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.assertBucketSpanValue(testData.bucketSpan);
        });

        it('job cloning displays the job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
        });

        it('job cloning does not pre-fill the job id', async () => {
          await ml.jobWizardCommon.assertJobIdInputExists();
          await ml.jobWizardCommon.assertJobIdValue('');
        });

        it('job cloning inputs the clone job id', async () => {
          await ml.jobWizardCommon.setJobId(testData.jobIdClone);
        });

        it('job cloning pre-fills the job description', async () => {
          await ml.jobWizardCommon.assertJobDescriptionInputExists();
          await ml.jobWizardCommon.assertJobDescriptionValue(testData.jobDescription);
        });

        it('job cloning pre-fills job groups', async () => {
          await ml.jobWizardCommon.assertJobGroupInputExists();
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroups);
        });

        it('job cloning inputs the clone job group', async () => {
          await ml.jobWizardCommon.assertJobGroupInputExists();
          // TODO: move to testData
          await ml.jobWizardCommon.addJobGroup('clone');
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroupsClone);
        });

        it('job cloning opens the additional settings section', async () => {
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
        });

        it('job cloning persists custom urls', async () => {
          // TODO: read from testData
          await ml.customUrls.assertCustomUrlItem(0, 'check-kibana-dashboard');
        });

        it('job cloning persists assigned calendars', async () => {
          // TODO: read from testData
          await ml.jobWizardCommon.assertCalendarsSelection(['wizard-test-calendar']);
        });

        it('job cloning opens the advanced section', async () => {
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
        });

        it('job cloning pre-fills the model plot switch', async () => {
          await ml.jobWizardCommon.assertModelPlotSwitchExists();
          await ml.jobWizardCommon.assertModelPlotSwitchCheckedState(true);
          // TODO: see above
        });

        it('job cloning pre-fills the dedicated index switch', async () => {
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
          // TODO: read from testData
          await ml.jobWizardCommon.assertDedicatedIndexSwitchCheckedState(true);
        });

        it('job cloning pre-fills the model memory limit', async () => {
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
          await ml.jobWizardCommon.assertModelMemoryLimitValue(testData.memoryLimit);
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
          await ml.jobTable.filterWithSearchString(testData.jobIdClone);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobIdClone)).to.have.length(1);
        });

        it('job cloning displays details for the created job in the job list', async () => {
          await ml.jobTable.assertJobRowFields(testData.jobIdClone, {
            id: testData.jobIdClone,
            description: testData.jobDescription,
            jobGroups: [...new Set(testData.jobGroupsClone)].sort(),
            ...testData.expected.row,
          });

          await ml.jobTable.assertJobRowDetailsCounts(
            testData.jobIdClone,
            { job_id: testData.jobIdClone, ...testData.expected.counts },
            { job_id: testData.jobIdClone, ...testData.expected.modelSizeStats }
          );
        });

        it('job cloning has detector results', async () => {
          await ml.api.assertDetectorResultsExist(testData.jobId, 0);
        });

        it('job deletion has results for the job before deletion', async () => {
          await ml.api.assertJobResultsExist(testData.jobIdClone);
        });

        it('job deletion triggers the delete action', async () => {
          await ml.jobTable.clickDeleteJobAction(testData.jobIdClone);
        });

        it('job deletion confirms the delete modal', async () => {
          await ml.jobTable.confirmDeleteJobModal();
        });

        it('job deletion does not display the deleted job in the job list any more', async () => {
          await ml.jobTable.waitForJobsToLoad();
          await ml.jobTable.filterWithSearchString(testData.jobIdClone);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobIdClone)).to.have.length(0);
        });

        it('job deletion does not have results for the deleted job any more', async () => {
          await ml.api.assertNoJobResultsExist(testData.jobIdClone);
        });
      });
    }
  });
}
