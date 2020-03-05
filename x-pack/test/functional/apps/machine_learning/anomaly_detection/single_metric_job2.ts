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

  describe('single metric job', function() {
    this.tags(['smoke', 'mlqa', 'prototype']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote_data_only');
      await ml.testResources.createIndexPatternIfNeeded('farequote', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteFilterIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createCalendar('wizard-test-calendar');
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteSuffix}`, function() {
        it('can be created using the wizard', async () => {
          // navigate to the single metric job wizard
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.jobManagement.navigateToNewJobSourceSelection();
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(testData.jobSource);
          await ml.jobTypeSelection.selectSingleMetricJob();

          // navigate through the wizard and set values
          await ml.jobWizardCommon.assertTimeRangeSectionExists();
          await ml.jobWizardCommon.clickUseFullDataButton(
            testData.expected.wizard.fullTimeRangStart,
            testData.expected.wizard.fullTimeRangeEnd
          );
          await ml.jobWizardCommon.assertEventRateChartExists();
          await ml.jobWizardCommon.assertEventRateChartHasData();

          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.selectAggAndField(testData.aggAndFieldIdentifier, true);
          await ml.jobWizardCommon.assertAnomalyChartExists('LINE');
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.setBucketSpan(testData.bucketSpan);

          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.jobWizardCommon.assertJobIdInputExists();
          await ml.jobWizardCommon.setJobId(testData.jobId);
          await ml.jobWizardCommon.assertJobDescriptionInputExists();
          await ml.jobWizardCommon.setJobDescription(testData.jobDescription);
          await ml.jobWizardCommon.assertJobGroupInputExists();
          for (const jobGroup of testData.jobGroups) {
            await ml.jobWizardCommon.addJobGroup(jobGroup);
          }
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroups);
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.jobWizardCommon.addCustomUrl({ label: 'check-kibana-dashboard' });
          await ml.jobWizardCommon.addCalendar('wizard-test-calendar');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await ml.jobWizardCommon.assertModelPlotSwitchExists();
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
          await ml.jobWizardCommon.activateDedicatedIndexSwitch();
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
          await ml.jobWizardCommon.setModelMemoryLimit(testData.memoryLimit);

          await ml.jobWizardCommon.advanceToValidationSection();

          await ml.jobWizardCommon.advanceToSummarySection();

          // create the job
          await ml.jobWizardCommon.assertCreateJobButtonExists();
          await ml.jobWizardCommon.createJobAndWaitForCompletion();

          // validate job creation and job details in the job list
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.jobTable.waitForJobsToLoad();
          await ml.jobTable.filterWithSearchString(testData.jobId);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobId)).to.have.length(1);

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

          // validate job results exist
          await ml.api.assertDetectorResultsExist(testData.jobId, 0);
        });

        it('can be cloned using the wizard', async () => {
          // start the cloning process
          await ml.jobTable.clickCloneJobAction(testData.jobId);
          await ml.jobTypeSelection.assertSingleMetricJobWizardOpen();

          // navigate through the wizard, validate pre-filled fields and set values
          await ml.jobWizardCommon.assertTimeRangeSectionExists();
          await ml.jobWizardCommon.clickUseFullDataButton(
            testData.expected.wizard.fullTimeRangStart,
            testData.expected.wizard.fullTimeRangeEnd
          );
          await ml.jobWizardCommon.assertEventRateChartExists();
          await ml.jobWizardCommon.assertEventRateChartHasData();

          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.assertAggAndFieldSelection([testData.aggAndFieldIdentifier]);
          await ml.jobWizardCommon.assertAnomalyChartExists('LINE');
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.assertBucketSpanValue(testData.bucketSpan);

          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.jobWizardCommon.assertJobIdInputExists();
          await ml.jobWizardCommon.assertJobIdValue('');
          await ml.jobWizardCommon.setJobId(testData.jobIdClone);
          await ml.jobWizardCommon.assertJobDescriptionInputExists();
          await ml.jobWizardCommon.assertJobDescriptionValue(testData.jobDescription);
          await ml.jobWizardCommon.assertJobGroupInputExists();
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroups);
          await ml.jobWizardCommon.assertJobGroupInputExists();
          await ml.jobWizardCommon.addJobGroup('clone');
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroupsClone);
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.customUrls.assertCustomUrlItem(0, 'check-kibana-dashboard');
          await ml.jobWizardCommon.assertCalendarsSelection(['wizard-test-calendar']);
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await ml.jobWizardCommon.assertModelPlotSwitchExists();
          await ml.jobWizardCommon.assertModelPlotSwitchCheckedState(true);
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
          await ml.jobWizardCommon.assertDedicatedIndexSwitchCheckedState(true);
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
          await ml.jobWizardCommon.assertModelMemoryLimitValue(testData.memoryLimit);

          await ml.jobWizardCommon.advanceToValidationSection();

          await ml.jobWizardCommon.advanceToSummarySection();

          // create the job
          await ml.jobWizardCommon.assertCreateJobButtonExists();
          await ml.jobWizardCommon.createJobAndWaitForCompletion();

          // validate job creation and job details in the job list
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.jobTable.waitForJobsToLoad();
          await ml.jobTable.filterWithSearchString(testData.jobIdClone);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobIdClone)).to.have.length(1);
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

          // validate job results exist
          await ml.api.assertDetectorResultsExist(testData.jobId, 0);
        });

        it('can be deleted from the job list', async () => {
          await ml.api.assertJobResultsExist(testData.jobIdClone);

          await ml.jobTable.clickDeleteJobAction(testData.jobIdClone);
          await ml.jobTable.confirmDeleteJobModal();

          await ml.jobTable.waitForJobsToLoad();
          await ml.jobTable.filterWithSearchString(testData.jobIdClone);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobIdClone)).to.have.length(0);

          await ml.api.assertNoJobResultsExist(testData.jobIdClone);
        });
      });
    }
  });
}
