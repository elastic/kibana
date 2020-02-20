/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const testDataList = [
    {
      suiteTitle: 'with filter',
      jobSource: 'farequote_filter',
      jobId: `fq_saved_search_1_${Date.now()}`,
      jobDescription: 'Create multi metric job based on a saved search with filter',
      jobGroups: ['automated', 'farequote', 'multi-metric', 'saved-search'],
      aggAndFieldIdentifiers: ['Mean(responsetime)'],
      splitField: 'airline',
      bucketSpan: '15m',
      memoryLimit: '20mb',
      expected: {
        wizard: {
          numberOfBackCards: 0,
          frontCardTitle: 'ASA',
        },
        row: {
          recordCount: '5,675',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        },
        counts: {
          processed_record_count: '5,675',
          processed_field_count: '11,350',
          input_bytes: '430.9 KB',
          input_field_count: '11,350',
          invalid_date_count: '0',
          missing_field_count: '0',
          out_of_order_timestamp_count: '0',
          empty_bucket_count: '0',
          sparse_bucket_count: '0',
          bucket_count: '479',
          earliest_record_timestamp: '2016-02-07 00:00:00',
          latest_record_timestamp: '2016-02-11 23:59:54',
          input_record_count: '5,675',
          latest_bucket_timestamp: '2016-02-11 23:45:00',
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0.0 B',
          model_bytes_memory_limit: '20.0 MB',
          total_by_field_count: '3',
          total_over_field_count: '0',
          total_partition_field_count: '2',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2016-02-11 23:30:00',
        },
      },
    },
    {
      suiteTitle: 'with lucene query',
      jobSource: 'farequote_lucene',
      jobId: `fq_saved_search_2_${Date.now()}`,
      jobDescription: 'Create multi metric job based on a saved search with lucene query',
      jobGroups: ['automated', 'farequote', 'multi-metric', 'saved-search'],
      aggAndFieldIdentifiers: ['Mean(responsetime)'],
      splitField: 'airline',
      bucketSpan: '15m',
      memoryLimit: '20mb',
      expected: {
        wizard: {
          numberOfBackCards: 4,
          frontCardTitle: 'AAL',
        },
        row: {
          recordCount: '34,416',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        },
        counts: {
          processed_record_count: '34,416',
          processed_field_count: '68,832',
          input_bytes: '2.6 MB',
          input_field_count: '68,832',
          invalid_date_count: '0',
          missing_field_count: '0',
          out_of_order_timestamp_count: '0',
          empty_bucket_count: '0',
          sparse_bucket_count: '0',
          bucket_count: '479',
          earliest_record_timestamp: '2016-02-07 00:00:00',
          latest_record_timestamp: '2016-02-11 23:59:54',
          input_record_count: '34,416',
          latest_bucket_timestamp: '2016-02-11 23:45:00',
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0.0 B',
          model_bytes_memory_limit: '20.0 MB',
          total_by_field_count: '7',
          total_over_field_count: '0',
          total_partition_field_count: '6',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2016-02-11 23:30:00',
        },
      },
    },
    {
      suiteTitle: 'with kuery query',
      jobSource: 'farequote_kuery',
      jobId: `fq_saved_search_3_${Date.now()}`,
      jobDescription: 'Create multi metric job based on a saved search with kuery query',
      jobGroups: ['automated', 'farequote', 'multi-metric', 'saved-search'],
      aggAndFieldIdentifiers: ['Mean(responsetime)'],
      splitField: 'airline',
      bucketSpan: '15m',
      memoryLimit: '20mb',
      expected: {
        wizard: {
          numberOfBackCards: 4,
          frontCardTitle: 'AAL',
        },
        row: {
          recordCount: '34,415',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        },
        counts: {
          processed_record_count: '34,415',
          processed_field_count: '68,830',
          input_bytes: '2.6 MB',
          input_field_count: '68,830',
          invalid_date_count: '0',
          missing_field_count: '0',
          out_of_order_timestamp_count: '0',
          empty_bucket_count: '0',
          sparse_bucket_count: '0',
          bucket_count: '479',
          earliest_record_timestamp: '2016-02-07 00:00:00',
          latest_record_timestamp: '2016-02-11 23:59:54',
          input_record_count: '34,415',
          latest_bucket_timestamp: '2016-02-11 23:45:00',
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0.0 B',
          model_bytes_memory_limit: '20.0 MB',
          total_by_field_count: '7',
          total_over_field_count: '0',
          total_partition_field_count: '6',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2016-02-11 23:30:00',
        },
      },
    },
    {
      suiteTitle: 'with filter and lucene query',
      jobSource: 'farequote_filter_and_lucene',
      jobId: `fq_saved_search_4_${Date.now()}`,
      jobDescription:
        'Create multi metric job based on a saved search with filter and lucene query',
      jobGroups: ['automated', 'farequote', 'multi-metric', 'saved-search'],
      aggAndFieldIdentifiers: ['Mean(responsetime)'],
      splitField: 'airline',
      bucketSpan: '15m',
      memoryLimit: '20mb',
      expected: {
        wizard: {
          numberOfBackCards: 0,
          frontCardTitle: 'ASA',
        },
        row: {
          recordCount: '5,673',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        },
        counts: {
          processed_record_count: '5,673',
          processed_field_count: '11,346',
          input_bytes: '430.7 KB',
          input_field_count: '11,346',
          invalid_date_count: '0',
          missing_field_count: '0',
          out_of_order_timestamp_count: '0',
          empty_bucket_count: '0',
          sparse_bucket_count: '0',
          bucket_count: '479',
          earliest_record_timestamp: '2016-02-07 00:00:00',
          latest_record_timestamp: '2016-02-11 23:59:54',
          input_record_count: '5,673',
          latest_bucket_timestamp: '2016-02-11 23:45:00',
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0.0 B',
          model_bytes_memory_limit: '20.0 MB',
          total_by_field_count: '3',
          total_over_field_count: '0',
          total_partition_field_count: '2',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2016-02-11 23:30:00',
        },
      },
    },
    {
      suiteTitle: 'with filter and kuery query',
      jobSource: 'farequote_filter_and_kuery',
      jobId: `fq_saved_search_5_${Date.now()}`,
      jobDescription: 'Create multi metric job based on a saved search with filter and kuery query',
      jobGroups: ['automated', 'farequote', 'multi-metric', 'saved-search'],
      aggAndFieldIdentifiers: ['Mean(responsetime)'],
      splitField: 'airline',
      bucketSpan: '15m',
      memoryLimit: '20mb',
      expected: {
        wizard: {
          numberOfBackCards: 0,
          frontCardTitle: 'ASA',
        },
        row: {
          recordCount: '5,674',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        },
        counts: {
          processed_record_count: '5,674',
          processed_field_count: '11,348',
          input_bytes: '430.8 KB',
          input_field_count: '11,348',
          invalid_date_count: '0',
          missing_field_count: '0',
          out_of_order_timestamp_count: '0',
          empty_bucket_count: '0',
          sparse_bucket_count: '0',
          bucket_count: '479',
          earliest_record_timestamp: '2016-02-07 00:00:00',
          latest_record_timestamp: '2016-02-11 23:59:54',
          input_record_count: '5,674',
          latest_bucket_timestamp: '2016-02-11 23:45:00',
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0.0 B',
          model_bytes_memory_limit: '20.0 MB',
          total_by_field_count: '3',
          total_over_field_count: '0',
          total_partition_field_count: '2',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2016-02-11 23:30:00',
        },
      },
    },
  ];

  describe('saved search', function() {
    this.tags(['smoke', 'mlqa']);
    before(async () => {
      await esArchiver.load('ml/farequote');
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(` ${testData.suiteTitle}`, function() {
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
          for (const [index, aggAndFieldIdentifier] of testData.aggAndFieldIdentifiers.entries()) {
            await ml.jobWizardCommon.assertAggAndFieldInputExists();
            await ml.jobWizardCommon.selectAggAndField(aggAndFieldIdentifier, false);
            await ml.jobWizardCommon.assertDetectorPreviewExists(
              aggAndFieldIdentifier,
              index,
              'LINE'
            );
          }
        });

        it('job creation inputs the split field and displays split cards', async () => {
          await ml.jobWizardMultiMetric.assertSplitFieldInputExists();
          await ml.jobWizardMultiMetric.selectSplitField(testData.splitField);

          await ml.jobWizardMultiMetric.assertDetectorSplitExists(testData.splitField);
          await ml.jobWizardMultiMetric.assertDetectorSplitFrontCardTitle(
            testData.expected.wizard.frontCardTitle
          );
          await ml.jobWizardMultiMetric.assertDetectorSplitNumberOfBackCards(
            testData.expected.wizard.numberOfBackCards
          );

          await ml.jobWizardCommon.assertInfluencerSelection([testData.splitField]);
        });

        it('job creation displays the influencer field', async () => {
          await ml.jobWizardCommon.assertInfluencerInputExists();
          await ml.jobWizardCommon.assertInfluencerSelection([testData.splitField]);
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
            recordCount: testData.expected.row.recordCount,
            memoryStatus: testData.expected.row.memoryStatus,
            jobState: testData.expected.row.jobState,
            datafeedState: testData.expected.row.datafeedState,
            latestTimestamp: testData.expected.row.latestTimestamp,
          });

          await ml.jobTable.assertJobRowDetailsCounts(
            testData.jobId,
            {
              job_id: testData.jobId,
              processed_record_count: testData.expected.counts.processed_record_count,
              processed_field_count: testData.expected.counts.processed_field_count,
              input_bytes: testData.expected.counts.input_bytes,
              input_field_count: testData.expected.counts.input_field_count,
              invalid_date_count: testData.expected.counts.invalid_date_count,
              missing_field_count: testData.expected.counts.missing_field_count,
              out_of_order_timestamp_count: testData.expected.counts.out_of_order_timestamp_count,
              empty_bucket_count: testData.expected.counts.empty_bucket_count,
              sparse_bucket_count: testData.expected.counts.sparse_bucket_count,
              bucket_count: testData.expected.counts.bucket_count,
              earliest_record_timestamp: testData.expected.counts.earliest_record_timestamp,
              latest_record_timestamp: testData.expected.counts.latest_record_timestamp,
              input_record_count: testData.expected.counts.input_record_count,
              latest_bucket_timestamp: testData.expected.counts.latest_bucket_timestamp,
            },
            {
              job_id: testData.jobId,
              result_type: testData.expected.modelSizeStats.result_type,
              model_bytes_exceeded: testData.expected.modelSizeStats.model_bytes_exceeded,
              model_bytes_memory_limit: testData.expected.modelSizeStats.model_bytes_memory_limit,
              total_by_field_count: testData.expected.modelSizeStats.total_by_field_count,
              total_over_field_count: testData.expected.modelSizeStats.total_over_field_count,
              total_partition_field_count:
                testData.expected.modelSizeStats.total_partition_field_count,
              bucket_allocation_failures_count:
                testData.expected.modelSizeStats.bucket_allocation_failures_count,
              memory_status: testData.expected.modelSizeStats.memory_status,
              timestamp: testData.expected.modelSizeStats.timestamp,
            }
          );
        });

        it('has detector results', async () => {
          for (let i = 0; i < testData.aggAndFieldIdentifiers.length; i++) {
            await ml.api.assertDetectorResultsExist(testData.jobId, i);
          }
        });
      });
    }
  });
}
