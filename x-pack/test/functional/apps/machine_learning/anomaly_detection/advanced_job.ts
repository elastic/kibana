/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

interface Detector {
  identifier: string;
  function: string;
  field?: string;
  byField?: string;
  overField?: string;
  partitionField?: string;
  excludeFrequent?: string;
}

// type guards
const isDetectorWithField = (arg: any): arg is Required<Pick<Detector, 'field'>> => {
  return arg.hasOwnProperty('field');
};
const isDetectorWithByField = (arg: any): arg is Required<Pick<Detector, 'byField'>> => {
  return arg.hasOwnProperty('byField');
};
const isDetectorWithOverField = (arg: any): arg is Required<Pick<Detector, 'overField'>> => {
  return arg.hasOwnProperty('overField');
};
const isDetectorWithPartitionField = (
  arg: any
): arg is Required<Pick<Detector, 'partitionField'>> => {
  return arg.hasOwnProperty('partitionField');
};
const isDetectorWithExcludeFrequent = (
  arg: any
): arg is Required<Pick<Detector, 'excludeFrequent'>> => {
  return arg.hasOwnProperty('excludeFrequent');
};

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const testDataList = [
    {
      suiteTitle: 'with by field detector',
      jobSource: 'farequote',
      jobId: `fq_advanced_1_${Date.now()}`,
      jobDescription: 'Create advanced job from farequote dataset with a by field detector',
      jobGroups: ['automated', 'farequote', 'advanced'],
      detectors: [
        {
          identifier: 'count',
          function: 'count',
        } as Detector,
        {
          identifier: 'mean(responsetime) by airline',
          function: 'mean',
          field: 'responsetime',
          byField: 'airline',
        } as Detector,
      ],
      influencers: ['airline'],
      bucketSpan: '15m',
      memoryLimit: '20mb',
      expected: {
        row: {
          recordCount: '86,274',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-02-11 23:59:54',
        },
        counts: {
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
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0',
          model_bytes_memory_limit: '20971520',
          total_by_field_count: '22',
          total_over_field_count: '0',
          total_partition_field_count: '3',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2016-02-11 23:30:00',
        },
      },
    },
  ];

  describe('advanced job', function() {
    this.tags(['smoke', 'mlqa']);

    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
    });

    after(async () => {
      await esArchiver.unload('ml/farequote');
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(`job creation ${testData.suiteTitle}`, function() {
        it('loads the job management page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();
        });

        it('loads the new job source selection page', async () => {
          await ml.jobManagement.navigateToNewJobSourceSelection();
        });

        it('loads the job type selection page', async () => {
          await ml.jobSourceSelection.selectSource(testData.jobSource);
        });

        it('loads the advanced job wizard page', async () => {
          await ml.jobTypeSelection.selectAdvancedJob();
        });

        it('displays the configure datafeed step', async () => {
          await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
        });

        it('displays the pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
        });

        it('adds detectors', async () => {
          for (const detector of testData.detectors) {
            await ml.jobWizardAdvanced.openCreateDetectorModal();
            await ml.jobWizardAdvanced.assertDetectorFunctionInputExists();
            await ml.jobWizardAdvanced.assertDetectorFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorByFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorOverFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorPartitionFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorExcludeFrequentInputExists();

            await ml.jobWizardAdvanced.selectDetectorFunction(detector.function);
            if (isDetectorWithField(detector)) {
              await ml.jobWizardAdvanced.selectDetectorField(detector.field);
            }
            if (isDetectorWithByField(detector)) {
              await ml.jobWizardAdvanced.selectDetectorByField(detector.byField);
            }
            if (isDetectorWithOverField(detector)) {
              await ml.jobWizardAdvanced.selectDetectorOverField(detector.overField);
            }
            if (isDetectorWithPartitionField(detector)) {
              await ml.jobWizardAdvanced.selectDetectorField(detector.partitionField);
            }
            if (isDetectorWithExcludeFrequent(detector)) {
              await ml.jobWizardAdvanced.selectDetectorExcludeFrequent(detector.excludeFrequent);
            }

            await ml.jobWizardAdvanced.confirmAddDetectorModal();
          }
        });

        it('displays detector entries', async () => {
          for (const detector of testData.detectors) {
            await ml.jobWizardAdvanced.assertDetectorEntryExists(detector.identifier);
          }
        });

        it('inputs the bucket span', async () => {
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.setBucketSpan(testData.bucketSpan);
        });

        it('inputs influencers', async () => {
          await ml.jobWizardCommon.assertInfluencerInputExists();
          await ml.jobWizardCommon.assertInfluencerSelection([]);
          for (const influencer of testData.influencers) {
            await ml.jobWizardCommon.addInfluencer(influencer);
          }
        });

        it('inputs the model memory limit', async () => {
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
            withAdvancedSection: false,
          });
          await ml.jobWizardCommon.setModelMemoryLimit(testData.memoryLimit, {
            withAdvancedSection: false,
          });
        });

        it('displays the job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
        });

        it('inputs the job id', async () => {
          await ml.jobWizardCommon.assertJobIdInputExists();
          await ml.jobWizardCommon.setJobId(testData.jobId);
        });

        it('inputs the job description', async () => {
          await ml.jobWizardCommon.assertJobDescriptionInputExists();
          await ml.jobWizardCommon.setJobDescription(testData.jobDescription);
        });

        it('inputs job groups', async () => {
          await ml.jobWizardCommon.assertJobGroupInputExists();
          for (const jobGroup of testData.jobGroups) {
            await ml.jobWizardCommon.addJobGroup(jobGroup);
          }
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroups);
        });

        it('displays the model plot switch', async () => {
          await ml.jobWizardCommon.assertModelPlotSwitchExists({ withAdvancedSection: false });
        });

        it('enables the dedicated index switch', async () => {
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists({ withAdvancedSection: false });
          await ml.jobWizardCommon.activateDedicatedIndexSwitch({ withAdvancedSection: false });
        });

        it('displays the validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
        });

        it('displays the summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
        });

        it('creates the job and finishes processing', async () => {
          await ml.jobWizardCommon.assertCreateJobButtonExists();
          await ml.jobWizardAdvanced.createJob();
          await ml.jobManagement.assertStartDatafeedModalExists();
          await ml.jobManagement.confirmStartDatafeedModal();
          await ml.jobManagement.waitForJobCompletion(testData.jobId);
        });

        it('displays the created job in the job list', async () => {
          await ml.jobTable.refreshJobList();
          await ml.jobTable.filterWithSearchString(testData.jobId);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobId)).to.have.length(1);
        });

        it('displays details for the created job in the job list', async () => {
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
          for (let i = 0; i < testData.detectors.length; i++) {
            await ml.api.assertDetectorResultsExist(testData.jobId, i);
          }
        });
      });
    }
  });
}
