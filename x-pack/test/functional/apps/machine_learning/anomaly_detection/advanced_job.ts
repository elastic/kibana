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
  description?: string;
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
const isDetectorWithDescription = (arg: any): arg is Required<Pick<Detector, 'description'>> => {
  return arg.hasOwnProperty('description');
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
      get jobIdClone(): string {
        return `${this.jobId}_clone`;
      },
      jobDescription: 'Create advanced job from farequote dataset with a by field detector',
      jobGroups: ['automated', 'farequote', 'advanced'],
      get jobGroupsClone(): string[] {
        return [...this.jobGroups, 'clone'];
      },
      detectors: [
        {
          identifier: 'count',
          function: 'count',
          description: 'count detector without split',
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
      queryDelay: '55s',
      frequency: '350s',
      scrollSize: '999',
      expected: {
        wizard: {
          datafeedQuery: `{
  "bool": {
    "must": [
      {
        "match_all": {}
      }
    ]
  }
}`,
          timeField: '@timestamp',
        },
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
      describe(`${testData.suiteTitle}`, function() {
        it('job creation loads the job management page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();
        });

        it('job creation loads the new job source selection page', async () => {
          await ml.jobManagement.navigateToNewJobSourceSelection();
        });

        it('job creation loads the job type selection page', async () => {
          await ml.jobSourceSelection.selectSource(testData.jobSource);
        });

        it('job creation loads the advanced job wizard page', async () => {
          await ml.jobTypeSelection.selectAdvancedJob();
        });

        it('job creation displays the configure datafeed step', async () => {
          await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
        });

        it('job creation pre-fills the datafeed query editor', async () => {
          await ml.jobWizardAdvanced.assertDatafeedQueryEditorExists();
          await ml.jobWizardAdvanced.assertDatafeedQueryEditorValue(
            testData.expected.wizard.datafeedQuery
          );
        });

        it('job creation inputs the query delay', async () => {
          await ml.jobWizardAdvanced.assertQueryDelayInputExists();
          await ml.jobWizardAdvanced.setQueryDelay(testData.queryDelay);
        });

        it('job creation inputs the frequency', async () => {
          await ml.jobWizardAdvanced.assertFrequencyInputExists();
          await ml.jobWizardAdvanced.setFrequency(testData.frequency);
        });

        it('job creation inputs the scroll size', async () => {
          await ml.jobWizardAdvanced.assertScrollSizeInputExists();
          await ml.jobWizardAdvanced.setScrollSize(testData.scrollSize);
        });

        it('job creation pre-fills the time field', async () => {
          await ml.jobWizardAdvanced.assertTimeFieldInputExists();
          await ml.jobWizardAdvanced.assertTimeFieldSelection(testData.expected.wizard.timeField);
        });

        it('job creation displays the pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
        });

        it('job creation adds detectors', async () => {
          for (const detector of testData.detectors) {
            await ml.jobWizardAdvanced.openCreateDetectorModal();
            await ml.jobWizardAdvanced.assertDetectorFunctionInputExists();
            await ml.jobWizardAdvanced.assertDetectorFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorByFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorOverFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorPartitionFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorExcludeFrequentInputExists();
            await ml.jobWizardAdvanced.assertDetectorDescriptionInputExists();

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
              await ml.jobWizardAdvanced.selectDetectorPartitionField(detector.partitionField);
            }
            if (isDetectorWithExcludeFrequent(detector)) {
              await ml.jobWizardAdvanced.selectDetectorExcludeFrequent(detector.excludeFrequent);
            }
            if (isDetectorWithDescription(detector)) {
              await ml.jobWizardAdvanced.setDetectorDescription(detector.description);
            }

            await ml.jobWizardAdvanced.confirmAddDetectorModal();
          }
        });

        it('job creation displays detector entries', async () => {
          for (const detector of testData.detectors) {
            await ml.jobWizardAdvanced.assertDetectorEntryExists(
              detector.identifier,
              isDetectorWithDescription(detector) ? detector.description : undefined
            );
          }
        });

        it('job creation inputs the bucket span', async () => {
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.setBucketSpan(testData.bucketSpan);
        });

        it('job creation inputs influencers', async () => {
          await ml.jobWizardCommon.assertInfluencerInputExists();
          await ml.jobWizardCommon.assertInfluencerSelection([]);
          for (const influencer of testData.influencers) {
            await ml.jobWizardCommon.addInfluencer(influencer);
          }
        });

        it('job creation inputs the model memory limit', async () => {
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
            withAdvancedSection: false,
          });
          await ml.jobWizardCommon.setModelMemoryLimit(testData.memoryLimit, {
            withAdvancedSection: false,
          });
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

        it('job creation displays the model plot switch', async () => {
          await ml.jobWizardCommon.assertModelPlotSwitchExists({ withAdvancedSection: false });
        });

        it('job creation enables the dedicated index switch', async () => {
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists({ withAdvancedSection: false });
          await ml.jobWizardCommon.activateDedicatedIndexSwitch({ withAdvancedSection: false });
        });

        it('job creation displays the validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
        });

        it('job creation displays the summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
        });

        it('job creation creates the job and finishes processing', async () => {
          await ml.jobWizardCommon.assertCreateJobButtonExists();
          await ml.jobWizardAdvanced.createJob();
          await ml.jobManagement.assertStartDatafeedModalExists();
          await ml.jobManagement.confirmStartDatafeedModal();
          await ml.jobManagement.waitForJobCompletion(testData.jobId);
        });

        it('job creation displays the created job in the job list', async () => {
          await ml.jobTable.refreshJobList();
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

        it('job creation has detector results', async () => {
          for (let i = 0; i < testData.detectors.length; i++) {
            await ml.api.assertDetectorResultsExist(testData.jobId, i);
          }
        });

        it('job cloning clicks the clone action and loads the advanced wizard', async () => {
          await ml.jobTable.clickCloneJobAction(testData.jobId);
          await ml.jobTypeSelection.assertAdvancedJobWizardOpen();
        });

        it('job cloning displays the configure datafeed step', async () => {
          await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
        });

        it('job cloning pre-fills the datafeed query editor', async () => {
          await ml.jobWizardAdvanced.assertDatafeedQueryEditorExists();
          await ml.jobWizardAdvanced.assertDatafeedQueryEditorValue(
            testData.expected.wizard.datafeedQuery
          );
        });

        it('job cloning pre-fills the query delay', async () => {
          await ml.jobWizardAdvanced.assertQueryDelayInputExists();
          await ml.jobWizardAdvanced.assertQueryDelayValue(testData.queryDelay);
        });

        it('job cloning pre-fills the frequency', async () => {
          await ml.jobWizardAdvanced.assertFrequencyInputExists();
          await ml.jobWizardAdvanced.assertFrequencyValue(testData.frequency);
        });

        it('job cloning pre-fills the scroll size', async () => {
          await ml.jobWizardAdvanced.assertScrollSizeInputExists();
          await ml.jobWizardAdvanced.assertScrollSizeValue(testData.scrollSize);
        });

        it('job creation pre-fills the time field', async () => {
          await ml.jobWizardAdvanced.assertTimeFieldInputExists();
          await ml.jobWizardAdvanced.assertTimeFieldSelection(testData.expected.wizard.timeField);
        });

        it('job cloning displays the pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
        });

        it('job cloning pre-fills detectors', async () => {
          for (const detector of testData.detectors) {
            await ml.jobWizardAdvanced.assertDetectorEntryExists(
              detector.identifier,
              isDetectorWithDescription(detector) ? detector.description : undefined
            );
            await ml.jobWizardAdvanced.clickEditDetector(detector.identifier);

            await ml.jobWizardAdvanced.assertDetectorFunctionInputExists();
            await ml.jobWizardAdvanced.assertDetectorFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorByFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorOverFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorPartitionFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorExcludeFrequentInputExists();
            await ml.jobWizardAdvanced.assertDetectorDescriptionInputExists();

            await ml.jobWizardAdvanced.assertDetectorFunctionSelection(detector.function);
            await ml.jobWizardAdvanced.assertDetectorFieldSelection(
              isDetectorWithField(detector) ? detector.field : ''
            );
            await ml.jobWizardAdvanced.assertDetectorByFieldSelection(
              isDetectorWithByField(detector) ? detector.byField : ''
            );
            await ml.jobWizardAdvanced.assertDetectorOverFieldSelection(
              isDetectorWithOverField(detector) ? detector.overField : ''
            );
            await ml.jobWizardAdvanced.assertDetectorPartitionFieldSelection(
              isDetectorWithPartitionField(detector) ? detector.partitionField : ''
            );
            await ml.jobWizardAdvanced.assertDetectorExcludeFrequentSelection(
              isDetectorWithExcludeFrequent(detector) ? detector.excludeFrequent : ''
            );
            await ml.jobWizardAdvanced.assertDetectorDescriptionValue(
              isDetectorWithDescription(detector) ? detector.description : detector.identifier
            );

            await ml.jobWizardAdvanced.cancelAddDetectorModal();
          }
        });

        it('job cloning pre-fills the bucket span', async () => {
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.assertBucketSpanValue(testData.bucketSpan);
        });

        it('job cloning pre-fills influencers', async () => {
          await ml.jobWizardCommon.assertInfluencerInputExists();
          await ml.jobWizardCommon.assertInfluencerSelection(testData.influencers);
        });

        it('job cloning pre-fills the model memory limit', async () => {
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
            withAdvancedSection: false,
          });
          await ml.jobWizardCommon.assertModelMemoryLimitValue(testData.memoryLimit, {
            withAdvancedSection: false,
          });
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
          await ml.jobWizardCommon.addJobGroup('clone');
          await ml.jobWizardCommon.assertJobGroupSelection(testData.jobGroupsClone);
        });

        it('job cloning pre-fills the model plot switch', async () => {
          await ml.jobWizardCommon.assertModelPlotSwitchExists({ withAdvancedSection: false });
          await ml.jobWizardCommon.assertModelPlotSwitchCheckedState(false, {
            withAdvancedSection: false,
          });
        });

        it('job cloning pre-fills the dedicated index switch', async () => {
          await ml.jobWizardCommon.assertDedicatedIndexSwitchExists({ withAdvancedSection: false });
          await ml.jobWizardCommon.assertDedicatedIndexSwitchCheckedState(true, {
            withAdvancedSection: false,
          });
        });

        it('job cloning displays the validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
        });

        it('job cloning displays the summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
        });

        it('job cloning creates the job and finishes processing', async () => {
          await ml.jobWizardCommon.assertCreateJobButtonExists();
          await ml.jobWizardAdvanced.createJob();
          await ml.jobManagement.assertStartDatafeedModalExists();
          await ml.jobManagement.confirmStartDatafeedModal();
          await ml.jobManagement.waitForJobCompletion(testData.jobIdClone);
        });

        it('job cloning displays the created job in the job list', async () => {
          await ml.jobTable.refreshJobList();
          await ml.jobTable.filterWithSearchString(testData.jobIdClone);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter(row => row.id === testData.jobIdClone)).to.have.length(1);
        });

        it('job creation displays details for the created job in the job list', async () => {
          await ml.jobTable.assertJobRowFields(testData.jobIdClone, {
            id: testData.jobIdClone,
            description: testData.jobDescription,
            jobGroups: [...new Set(testData.jobGroupsClone)].sort(),
            recordCount: testData.expected.row.recordCount,
            memoryStatus: testData.expected.row.memoryStatus,
            jobState: testData.expected.row.jobState,
            datafeedState: testData.expected.row.datafeedState,
            latestTimestamp: testData.expected.row.latestTimestamp,
          });

          await ml.jobTable.assertJobRowDetailsCounts(
            testData.jobIdClone,
            {
              job_id: testData.jobIdClone,
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
              job_id: testData.jobIdClone,
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

        it('job creation has detector results', async () => {
          for (let i = 0; i < testData.detectors.length; i++) {
            await ml.api.assertDetectorResultsExist(testData.jobIdClone, i);
          }
        });
      });
    }
  });
}
