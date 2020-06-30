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

interface DatafeedConfig {
  queryDelay?: string;
  frequency?: string;
  scrollSize?: string;
}

interface PickFieldsConfig {
  detectors: Detector[];
  influencers: string[];
  bucketSpan: string;
  memoryLimit: string;
  summaryCountField?: string;
}

// type guards
// Detector
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

// DatafeedConfig
const isDatafeedConfigWithQueryDelay = (
  arg: any
): arg is Required<Pick<DatafeedConfig, 'queryDelay'>> => {
  return arg.hasOwnProperty('queryDelay');
};
const isDatafeedConfigWithFrequency = (
  arg: any
): arg is Required<Pick<DatafeedConfig, 'frequency'>> => {
  return arg.hasOwnProperty('frequency');
};
const isDatafeedConfigWithScrollSize = (
  arg: any
): arg is Required<Pick<DatafeedConfig, 'scrollSize'>> => {
  return arg.hasOwnProperty('scrollSize');
};

// PickFieldsConfig
const isPickFieldsConfigWithSummaryCountField = (
  arg: any
): arg is Required<Pick<PickFieldsConfig, 'summaryCountField'>> => {
  return arg.hasOwnProperty('summaryCountField');
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const defaultValues = {
    datafeedQuery: `{
  "bool": {
    "must": [
      {
        "match_all": {}
      }
    ]
  }
}`,
    queryDelay: '60s',
    frequency: '450s',
    scrollSize: '1000',
  };

  const testDataList = [
    {
      suiteTitle: 'with count detector and model plot disabled',
      jobSource: 'ft_event_rate_gen_trend_nanos',
      jobId: `event_rate_nanos_count_1_${Date.now()}`,
      jobDescription:
        'Create advanced job based on the event rate dataset with a date_nanos time field, 30m bucketspan and count',
      jobGroups: ['automated', 'event-rate', 'date-nanos'],
      pickFieldsConfig: {
        detectors: [
          {
            identifier: 'count',
            function: 'count',
            description: 'event rate',
          } as Detector,
        ],
        summaryCountField: 'count',
        influencers: [],
        bucketSpan: '30m',
        memoryLimit: '10mb',
      } as PickFieldsConfig,
      datafeedConfig: {} as DatafeedConfig,
      expected: {
        wizard: {
          timeField: '@timestamp',
        },
        row: {
          recordCount: '105,120',
          memoryStatus: 'ok',
          jobState: 'closed',
          datafeedState: 'stopped',
          latestTimestamp: '2016-01-01 00:00:00',
        },
        counts: {
          processed_record_count: '105,120',
          processed_field_count: '105,120',
          input_bytes: '4.2 MB',
          input_field_count: '105,120',
          invalid_date_count: '0',
          missing_field_count: '0',
          out_of_order_timestamp_count: '0',
          empty_bucket_count: '0',
          sparse_bucket_count: '0',
          bucket_count: '17,520',
          earliest_record_timestamp: '2015-01-01 00:10:00',
          latest_record_timestamp: '2016-01-01 00:00:00',
          input_record_count: '105,120',
          latest_bucket_timestamp: '2016-01-01 00:00:00',
        },
        modelSizeStats: {
          result_type: 'model_size_stats',
          model_bytes_exceeded: '0.0 B',
          total_by_field_count: '3',
          total_over_field_count: '0',
          total_partition_field_count: '2',
          bucket_allocation_failures_count: '0',
          memory_status: 'ok',
          timestamp: '2015-12-31 23:30:00',
        },
      },
    },
  ];

  describe('job on data set with date_nanos time field', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/event_rate_nanos');
      await ml.testResources.createIndexPatternIfNeeded(
        'ft_event_rate_gen_trend_nanos',
        '@timestamp'
      );
      await ml.testResources.setKibanaTimeZoneToUTC();

      await esArchiver.loadIfNeeded('ml/event_rate_nanos');
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
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

        it('job creation loads the advanced job wizard page', async () => {
          await ml.jobTypeSelection.selectAdvancedJob();
        });

        it('job creation displays the configure datafeed step', async () => {
          await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
        });

        it('job creation pre-fills the datafeed query editor', async () => {
          await ml.jobWizardAdvanced.assertDatafeedQueryEditorExists();
          await ml.jobWizardAdvanced.assertDatafeedQueryEditorValue(defaultValues.datafeedQuery);
        });

        it('job creation inputs the query delay', async () => {
          await ml.jobWizardAdvanced.assertQueryDelayInputExists();
          await ml.jobWizardAdvanced.assertQueryDelayValue(defaultValues.queryDelay);
          if (isDatafeedConfigWithQueryDelay(testData.datafeedConfig)) {
            await ml.jobWizardAdvanced.setQueryDelay(testData.datafeedConfig.queryDelay);
          }
        });

        it('job creation inputs the frequency', async () => {
          await ml.jobWizardAdvanced.assertFrequencyInputExists();
          await ml.jobWizardAdvanced.assertFrequencyValue(defaultValues.frequency);
          if (isDatafeedConfigWithFrequency(testData.datafeedConfig)) {
            await ml.jobWizardAdvanced.setFrequency(testData.datafeedConfig.frequency);
          }
        });

        it('job creation inputs the scroll size', async () => {
          await ml.jobWizardAdvanced.assertScrollSizeInputExists();
          await ml.jobWizardAdvanced.assertScrollSizeValue(defaultValues.scrollSize);
          if (isDatafeedConfigWithScrollSize(testData.datafeedConfig)) {
            await ml.jobWizardAdvanced.setScrollSize(testData.datafeedConfig.scrollSize);
          }
        });

        it('job creation pre-fills the time field', async () => {
          await ml.jobWizardAdvanced.assertTimeFieldInputExists();
          await ml.jobWizardAdvanced.assertTimeFieldSelection([testData.expected.wizard.timeField]);
        });

        it('job creation displays the pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
        });

        it('job creation selects the summary count field', async () => {
          await ml.jobWizardAdvanced.assertSummaryCountFieldInputExists();
          if (isPickFieldsConfigWithSummaryCountField(testData.pickFieldsConfig)) {
            await ml.jobWizardAdvanced.selectSummaryCountField(
              testData.pickFieldsConfig.summaryCountField
            );
          } else {
            await ml.jobWizardAdvanced.assertSummaryCountFieldSelection([]);
          }
        });

        it('job creation adds detectors', async () => {
          for (const detector of testData.pickFieldsConfig.detectors) {
            await ml.jobWizardAdvanced.openCreateDetectorModal();
            await ml.jobWizardAdvanced.assertDetectorFunctionInputExists();
            await ml.jobWizardAdvanced.assertDetectorFunctionSelection([]);
            await ml.jobWizardAdvanced.assertDetectorFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorFieldSelection([]);
            await ml.jobWizardAdvanced.assertDetectorByFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorByFieldSelection([]);
            await ml.jobWizardAdvanced.assertDetectorOverFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorOverFieldSelection([]);
            await ml.jobWizardAdvanced.assertDetectorPartitionFieldInputExists();
            await ml.jobWizardAdvanced.assertDetectorPartitionFieldSelection([]);
            await ml.jobWizardAdvanced.assertDetectorExcludeFrequentInputExists();
            await ml.jobWizardAdvanced.assertDetectorExcludeFrequentSelection([]);
            await ml.jobWizardAdvanced.assertDetectorDescriptionInputExists();
            await ml.jobWizardAdvanced.assertDetectorDescriptionValue('');

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
          for (const [index, detector] of testData.pickFieldsConfig.detectors.entries()) {
            await ml.jobWizardAdvanced.assertDetectorEntryExists(
              index,
              detector.identifier,
              isDetectorWithDescription(detector) ? detector.description : undefined
            );
          }
        });

        it('job creation inputs the bucket span', async () => {
          await ml.jobWizardCommon.assertBucketSpanInputExists();
          await ml.jobWizardCommon.setBucketSpan(testData.pickFieldsConfig.bucketSpan);
        });

        it('job creation inputs influencers', async () => {
          await ml.jobWizardCommon.assertInfluencerInputExists();
          await ml.jobWizardCommon.assertInfluencerSelection([]);
          for (const influencer of testData.pickFieldsConfig.influencers) {
            await ml.jobWizardCommon.addInfluencer(influencer);
          }
        });

        it('job creation inputs the model memory limit', async () => {
          await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
            withAdvancedSection: false,
          });
          await ml.jobWizardCommon.setModelMemoryLimit(testData.pickFieldsConfig.memoryLimit, {
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

        it('job creation opens the additional settings section', async () => {
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
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
          expect(rows.filter((row) => row.id === testData.jobId)).to.have.length(1);
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
          for (let i = 0; i < testData.pickFieldsConfig.detectors.length; i++) {
            await ml.api.assertDetectorResultsExist(testData.jobId, i);
          }
        });
      });
    }
  });
}
