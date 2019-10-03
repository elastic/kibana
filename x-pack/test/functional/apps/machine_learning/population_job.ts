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

  const jobId = `ec_population_1_${Date.now()}`;
  const jobIdClone = `${jobId}_clone`;
  const jobDescription =
    'Create population job based on the ecommerce sample dataset with 2h bucketspan over customer_id' +
    ' - detectors: (Mean(products.base_price) by customer_gender), (Mean(products.quantity) by category.leyword)';
  const jobGroups = ['automated', 'ecommerce', 'population'];
  const jobGroupsClone = [...jobGroups, 'clone'];
  const populationField = 'customer_id';
  const detectors = [
    {
      identifier: 'Mean(products.base_price)',
      splitField: 'customer_gender',
      frontCardTitle: 'FEMALE',
      numberOfBackCards: 1,
    },
    {
      identifier: 'Mean(products.quantity)',
      splitField: 'category.keyword',
      frontCardTitle: "Men's Clothing",
      numberOfBackCards: 5,
    },
  ];
  const bucketSpan = '2h';
  const memoryLimit = '8mb';

  function getExpectedRow(expectedJobId: string, expectedJobGroups: string[]) {
    return {
      id: expectedJobId,
      description: jobDescription,
      jobGroups: [...new Set(expectedJobGroups)].sort(),
      recordCount: '4,675',
      memoryStatus: 'ok',
      jobState: 'closed',
      datafeedState: 'stopped',
      latestTimestamp: '2019-07-12 23:45:36',
    };
  }

  function getExpectedCounts(expectedJobId: string) {
    return {
      job_id: expectedJobId,
      processed_record_count: '4,675',
      processed_field_count: '23,375',
      input_bytes: '867.7 KB',
      input_field_count: '23,375',
      invalid_date_count: '0',
      missing_field_count: '0',
      out_of_order_timestamp_count: '0',
      empty_bucket_count: '0',
      sparse_bucket_count: '0',
      bucket_count: '371',
      earliest_record_timestamp: '2019-06-12 00:04:19',
      latest_record_timestamp: '2019-07-12 23:45:36',
      input_record_count: '4,675',
      latest_bucket_timestamp: '2019-07-12 22:00:00',
    };
  }

  function getExpectedModelSizeStats(expectedJobId: string) {
    return {
      job_id: expectedJobId,
      result_type: 'model_size_stats',
      model_bytes_exceeded: '0',
      model_bytes_memory_limit: '8388608',
      total_by_field_count: '25',
      total_over_field_count: '92',
      total_partition_field_count: '3',
      bucket_allocation_failures_count: '0',
      memory_status: 'ok',
      timestamp: '2019-07-12 20:00:00',
    };
  }

  describe('population', function() {
    this.tags(['smoke', 'mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
      await ml.api.cleanMlIndices();
      await ml.api.cleanDataframeIndices();
    });

    describe('job creation', function() {
      it('loads the job management page', async () => {
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();
      });

      it('loads the new job source selection page', async () => {
        await ml.jobManagement.navigateToNewJobSourceSelection();
      });

      it('loads the job type selection page', async () => {
        await ml.jobSourceSelection.selectSourceIndexPattern('ecommerce');
      });

      it('loads the population job wizard page', async () => {
        await ml.jobTypeSelection.selectPopulationJob();
      });

      it('displays the time range step', async () => {
        await ml.jobWizardCommon.assertTimeRangeSectionExists();
      });

      it('displays the event rate chart', async () => {
        await ml.jobWizardCommon.clickUseFullDataButton(
          'Jun 12, 2019 @ 00:04:19.000',
          'Jul 12, 2019 @ 23:45:36.000'
        );
        await ml.jobWizardCommon.assertEventRateChartExists();
        await ml.jobWizardCommon.assertEventRateChartHasData();
      });

      it('displays the pick fields step', async () => {
        await ml.jobWizardCommon.advanceToPickFieldsSection();
      });

      it('selects the population field', async () => {
        await ml.jobWizardPopulation.assertPopulationFieldInputExists();
        await ml.jobWizardPopulation.selectPopulationField(populationField);
      });

      it('selects detectors and displays detector previews', async () => {
        for (const [index, detector] of detectors.entries()) {
          await ml.jobWizardCommon.assertAggAndFieldInputExists();
          await ml.jobWizardCommon.selectAggAndField(detector.identifier, false);
          await ml.jobWizardCommon.assertDetectorPreviewExists(
            detector.identifier,
            index,
            'SCATTER'
          );
        }
      });

      it('inputs detector split fields and displays split cards', async () => {
        for (const [index, detector] of detectors.entries()) {
          await ml.jobWizardPopulation.assertDetectorSplitFieldInputExists(index);
          await ml.jobWizardPopulation.selectDetectorSplitField(index, detector.splitField);

          await ml.jobWizardPopulation.assertDetectorSplitExists(index);
          await ml.jobWizardPopulation.assertDetectorSplitFrontCardTitle(
            index,
            detector.frontCardTitle
          );
          await ml.jobWizardPopulation.assertDetectorSplitNumberOfBackCards(
            index,
            detector.numberOfBackCards
          );
        }
      });

      it('displays the influencer field', async () => {
        await ml.jobWizardCommon.assertInfluencerInputExists();
        await ml.jobWizardCommon.assertInfluencerSelection(
          [populationField].concat(detectors.map(detector => detector.splitField))
        );
      });

      it('inputs the bucket span', async () => {
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.setBucketSpan(bucketSpan);
      });

      it('displays the job details step', async () => {
        await ml.jobWizardCommon.advanceToJobDetailsSection();
      });

      it('inputs the job id', async () => {
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.setJobId(jobId);
      });

      it('inputs the job description', async () => {
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.setJobDescription(jobDescription);
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
      });

      it('inputs the model memory limit', async () => {
        await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
        await ml.jobWizardCommon.setModelMemoryLimit(memoryLimit);
      });

      it('displays the validation step', async () => {
        await ml.jobWizardCommon.advanceToValidationSection();
      });

      it('displays the summary step', async () => {
        await ml.jobWizardCommon.advanceToSummarySection();
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
        await ml.jobTable.assertJobRowFields(jobId, getExpectedRow(jobId, jobGroups));

        await ml.jobTable.assertJobRowDetailsCounts(
          jobId,
          getExpectedCounts(jobId),
          getExpectedModelSizeStats(jobId)
        );
      });
    });

    describe('job cloning', function() {
      it('clicks the clone action and loads the population wizard', async () => {
        await ml.jobTable.clickCloneJobAction(jobId);
        await ml.jobTypeSelection.assertPopulationJobWizardOpen();
      });

      it('displays the time range step', async () => {
        await ml.jobWizardCommon.assertTimeRangeSectionExists();
      });

      it('displays the event rate chart', async () => {
        await ml.jobWizardCommon.clickUseFullDataButton(
          'Jun 12, 2019 @ 00:04:19.000',
          'Jul 12, 2019 @ 23:45:36.000'
        );
        await ml.jobWizardCommon.assertEventRateChartExists();
        await ml.jobWizardCommon.assertEventRateChartHasData();
      });

      it('displays the pick fields step', async () => {
        await ml.jobWizardCommon.advanceToPickFieldsSection();
      });

      it('pre-fills the population field', async () => {
        await ml.jobWizardPopulation.assertPopulationFieldInputExists();
        await ml.jobWizardPopulation.assertPopulationFieldSelection(populationField);
      });

      it('pre-fills detectors and shows preview with split cards', async () => {
        for (const [index, detector] of detectors.entries()) {
          await ml.jobWizardCommon.assertDetectorPreviewExists(
            detector.identifier,
            index,
            'SCATTER'
          );

          await ml.jobWizardPopulation.assertDetectorSplitFieldSelection(
            index,
            detector.splitField
          );
          await ml.jobWizardPopulation.assertDetectorSplitExists(index);
          await ml.jobWizardPopulation.assertDetectorSplitFrontCardTitle(
            index,
            detector.frontCardTitle
          );
          await ml.jobWizardPopulation.assertDetectorSplitNumberOfBackCards(
            index,
            detector.numberOfBackCards
          );
        }
      });

      it('pre-fills influencers', async () => {
        await ml.jobWizardCommon.assertInfluencerInputExists();
        await ml.jobWizardCommon.assertInfluencerSelection(
          [populationField].concat(detectors.map(detector => detector.splitField))
        );
      });

      it('pre-fills the bucket span', async () => {
        await ml.jobWizardCommon.assertBucketSpanInputExists();
        await ml.jobWizardCommon.assertBucketSpanValue(bucketSpan);
      });

      it('displays the job details step', async () => {
        await ml.jobWizardCommon.advanceToJobDetailsSection();
      });

      it('does not pre-fill the job id', async () => {
        await ml.jobWizardCommon.assertJobIdInputExists();
        await ml.jobWizardCommon.assertJobIdValue('');
      });

      it('inputs the clone job id', async () => {
        await ml.jobWizardCommon.setJobId(jobIdClone);
      });

      it('pre-fills the job description', async () => {
        await ml.jobWizardCommon.assertJobDescriptionInputExists();
        await ml.jobWizardCommon.assertJobDescriptionValue(jobDescription);
      });

      it('pre-fills job groups', async () => {
        await ml.jobWizardCommon.assertJobGroupInputExists();
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroups);
      });

      it('inputs the clone job group', async () => {
        await ml.jobWizardCommon.assertJobGroupInputExists();
        await ml.jobWizardCommon.addJobGroup('clone');
        await ml.jobWizardCommon.assertJobGroupSelection(jobGroupsClone);
      });

      it('opens the advanced section', async () => {
        await ml.jobWizardCommon.ensureAdvancedSectionOpen();
      });

      it('pre-fills the model plot switch', async () => {
        await ml.jobWizardCommon.assertModelPlotSwitchExists();
        await ml.jobWizardCommon.assertModelPlotSwitchCheckedState(false);
      });

      it('pre-fills the dedicated index switch', async () => {
        await ml.jobWizardCommon.assertDedicatedIndexSwitchExists();
        await ml.jobWizardCommon.assertDedicatedIndexSwitchCheckedState(true);
      });

      it('pre-fills the model memory limit', async () => {
        await ml.jobWizardCommon.assertModelMemoryLimitInputExists();
        await ml.jobWizardCommon.assertModelMemoryLimitValue(memoryLimit);
      });

      it('displays the validation step', async () => {
        await ml.jobWizardCommon.advanceToValidationSection();
      });

      it('displays the summary step', async () => {
        await ml.jobWizardCommon.advanceToSummarySection();
      });

      it('creates the job and finishes processing', async () => {
        await ml.jobWizardCommon.assertCreateJobButtonExists();
        await ml.jobWizardCommon.createJobAndWaitForCompletion();
      });

      it('displays the created job in the job list', async () => {
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.jobTable.waitForJobsToLoad();
        await ml.jobTable.filterWithSearchString(jobIdClone);
        const rows = await ml.jobTable.parseJobTable();
        expect(rows.filter(row => row.id === jobIdClone)).to.have.length(1);
      });

      it('displays details for the created job in the job list', async () => {
        await ml.jobTable.assertJobRowFields(
          jobIdClone,
          getExpectedRow(jobIdClone, jobGroupsClone)
        );

        await ml.jobTable.assertJobRowDetailsCounts(
          jobIdClone,
          getExpectedCounts(jobIdClone),
          getExpectedModelSizeStats(jobIdClone)
        );
      });
    });
  });
}
