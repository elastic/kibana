/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Datafeed, Job } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  const ts = Date.now();
  const supportedTestSuites = [
    {
      suiteTitle: 'supported job with aggregation field',
      jobConfig: {
        job_id: `fq_supported_aggs_${ts}`,
        job_type: 'anomaly_detector',
        description: '',
        analysis_config: {
          bucket_span: '30m',
          summary_count_field_name: 'doc_count',
          detectors: [
            {
              function: 'mean',
              field_name: 'responsetime_avg',
              detector_description: 'mean(responsetime_avg)',
            },
          ],
          influencers: ['airline'],
        },

        analysis_limits: {
          model_memory_limit: '11MB',
        },
        data_description: {
          time_field: '@timestamp',
          time_format: 'epoch_ms',
        },
        model_plot_config: {
          enabled: false,
          annotations_enabled: false,
        },
        model_snapshot_retention_days: 1,
        results_index_name: 'shared',
        allow_lazy_open: false,
        groups: [],
      } as Job,
      datafeedConfig: {
        datafeed_id: `datafeed-fq_supported_aggs_${ts}`,
        job_id: `fq_supported_aggs_${ts}`,
        chunking_config: {
          mode: 'manual',
          time_span: '900000000ms',
        },
        indices_options: {
          expand_wildcards: ['open'],
          ignore_unavailable: false,
          allow_no_indices: true,
          ignore_throttled: true,
        },
        query: {
          match_all: {},
        },
        indices: ['ft_farequote'],
        aggregations: {
          buckets: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '15m',
            },
            aggregations: {
              '@timestamp': {
                max: {
                  field: '@timestamp',
                },
              },
              airline: {
                terms: {
                  field: 'airline',
                  size: 100,
                },
                aggregations: {
                  responsetime_avg: {
                    avg: {
                      field: 'responsetime',
                    },
                  },
                },
              },
            },
          },
        },
        scroll_size: 1000,
        delayed_data_check_config: {
          enabled: true,
        },
      } as unknown as Datafeed,
    },
    {
      suiteTitle: 'supported job with scripted field',
      jobConfig: {
        job_id: `fq_supported_script_${ts}`,
        job_type: 'anomaly_detector',
        description: '',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'mean',
              field_name: 'actual_taxed',
              detector_description: 'mean(actual_taxed) by gender_currency',
            },
          ],
          influencers: [],
        },
        analysis_limits: {
          model_memory_limit: '11MB',
        },
        data_description: {
          time_field: 'order_date',
          time_format: 'epoch_ms',
        },
        model_plot_config: {
          enabled: true,
          annotations_enabled: false,
        },
        model_snapshot_retention_days: 10,
        daily_model_snapshot_retention_after_days: 1,
        results_index_name: 'shared',
        allow_lazy_open: false,
        groups: [],
      } as Job,
      datafeedConfig: {
        chunking_config: {
          mode: 'auto',
        },
        indices_options: {
          expand_wildcards: ['open'],
          ignore_unavailable: false,
          allow_no_indices: true,
          ignore_throttled: true,
        },
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
          },
        },
        indices: ['ft_ecommerce'],
        script_fields: {
          actual_taxed: {
            script: {
              source: "doc['taxful_total_price'].value * 1.825",
              lang: 'painless',
            },
            ignore_failure: false,
          },
        },
        scroll_size: 1000,
        delayed_data_check_config: {
          enabled: true,
        },
        job_id: `fq_supported_script_${ts}`,
        datafeed_id: `datafeed-fq_supported_script_${ts}`,
      } as unknown as Datafeed,
    },
  ];

  const unsupportedTestSuites = [
    {
      suiteTitle: 'unsupported job with bucket_script aggregation field',
      jobConfig: {
        job_id: `fq_unsupported_aggs_${ts}`,
        job_type: 'anomaly_detector',
        description: '',
        analysis_config: {
          bucket_span: '15m',
          summary_count_field_name: 'doc_count',
          detectors: [
            {
              function: 'mean',
              field_name: 'max_delta',
              partition_field_name: 'airlines',
              detector_description: 'mean(max_delta) partition airline',
            },
          ],
          influencers: ['airlines'],
        },
        analysis_limits: {
          model_memory_limit: '11MB',
        },
        data_description: {
          time_field: '@timestamp',
          time_format: 'epoch_ms',
        },
        model_plot_config: {
          enabled: false,
          annotations_enabled: false,
        },
        model_snapshot_retention_days: 1,
        results_index_name: 'shared',
        allow_lazy_open: false,
        groups: [],
      } as Job,
      datafeedConfig: {
        datafeed_id: `datafeed-fq_unsupported_aggs_${ts}`,
        job_id: `fq_unsupported_aggs_${ts}`,
        chunking_config: {
          mode: 'manual',
          time_span: '900000000ms',
        },
        indices_options: {
          expand_wildcards: ['open'],
          ignore_unavailable: false,
          allow_no_indices: true,
          ignore_throttled: true,
        },
        query: {
          match_all: {},
        },
        indices: ['ft_farequote'],
        aggregations: {
          buckets: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '15m',
              time_zone: 'UTC',
            },
            aggregations: {
              '@timestamp': {
                max: {
                  field: '@timestamp',
                },
              },
              airlines: {
                terms: {
                  field: 'airline',
                  size: 200,
                  order: {
                    _count: 'desc',
                  },
                },
                aggregations: {
                  max: {
                    max: {
                      field: 'responsetime',
                    },
                  },
                  min: {
                    min: {
                      field: 'responsetime',
                    },
                  },
                  max_delta: {
                    bucket_script: {
                      buckets_path: {
                        maxval: 'max',
                        minval: 'min',
                      },
                      script: 'params.maxval - params.minval',
                    },
                  },
                },
              },
            },
          },
        },
        scroll_size: 1000,
        delayed_data_check_config: {
          enabled: true,
        },
      } as unknown as Datafeed,
    },
    {
      suiteTitle: 'unsupported job with partition by of a scripted field',
      jobConfig: {
        job_id: `fq_unsupported_script_${ts}`,
        job_type: 'anomaly_detector',
        description: '',
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              function: 'mean',
              field_name: 'actual_taxed',
              by_field_name: 'gender_currency',
              detector_description: 'mean(actual_taxed) by gender_currency',
            },
          ],
          influencers: ['gender_currency'],
        },
        analysis_limits: {
          model_memory_limit: '11MB',
        },
        data_description: {
          time_field: 'order_date',
          time_format: 'epoch_ms',
        },
        model_plot_config: {
          enabled: false,
          annotations_enabled: false,
        },
        model_snapshot_retention_days: 10,
        daily_model_snapshot_retention_after_days: 1,
        results_index_name: 'shared',
        allow_lazy_open: false,
        groups: [],
      } as Job,
      datafeedConfig: {
        chunking_config: {
          mode: 'auto',
        },
        indices_options: {
          expand_wildcards: ['open'],
          ignore_unavailable: false,
          allow_no_indices: true,
          ignore_throttled: true,
        },
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
          },
        },
        indices: ['ft_ecommerce'],
        script_fields: {
          actual_taxed: {
            script: {
              source: "doc['taxful_total_price'].value * 1.825",
              lang: 'painless',
            },
            ignore_failure: false,
          },
          gender_currency: {
            script: {
              source: "doc['customer_gender'].value + '_' + doc['currency'].value",
              lang: 'painless',
            },
            ignore_failure: false,
          },
        },
        scroll_size: 1000,
        delayed_data_check_config: {
          enabled: true,
        },
        job_id: `fq_unsupported_script_${ts}`,
        datafeed_id: `datafeed-fq_unsupported_script_${ts}`,
      } as unknown as Datafeed,
    },
  ];

  describe('aggregated or scripted job', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_ecommerce');
    });
    for (const testData of supportedTestSuites) {
      describe(testData.suiteTitle, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
        });

        it('opens a job from job list link', async () => {
          await ml.testExecution.logTestStep('navigate to job list');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.testExecution.logTestStep(
            'check that the single metric viewer button is enabled'
          );
          await ml.jobTable.filterWithSearchString(testData.jobConfig.job_id, 1);

          await ml.jobTable.assertJobActionSingleMetricViewerButtonEnabled(
            testData.jobConfig.job_id,
            true
          );
          await ml.testExecution.logTestStep('opens job in single metric viewer');
          await ml.jobTable.clickOpenJobInSingleMetricViewerButton(testData.jobConfig.job_id);
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
        });

        it('displays job results correctly in both anomaly explorer and single metric viewer', async () => {
          await ml.testExecution.logTestStep('should display the chart');
          await ml.singleMetricViewer.assertChartExist();

          await ml.testExecution.logTestStep('should navigate to anomaly explorer');
          await ml.navigation.navigateToAnomalyExplorerViaSingleMetricViewer();

          await ml.testExecution.logTestStep('pre-fills the job selection');
          await ml.jobSelection.assertJobSelection([testData.jobConfig.job_id]);

          await ml.testExecution.logTestStep('displays the swimlanes');
          await ml.anomalyExplorer.assertOverallSwimlaneExists();
          await ml.anomalyExplorer.assertSwimlaneViewByExists();
        });
      });
    }

    for (const testData of unsupportedTestSuites) {
      describe(testData.suiteTitle, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
        });

        it('opens a job from job list link', async () => {
          await ml.testExecution.logTestStep('navigate to job list');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.testExecution.logTestStep(
            'check that the single metric viewer button is disabled'
          );
          await ml.jobTable.filterWithSearchString(testData.jobConfig.job_id, 1);

          await ml.jobTable.assertJobActionSingleMetricViewerButtonEnabled(
            testData.jobConfig.job_id,
            false
          );

          await ml.testExecution.logTestStep('open job in anomaly explorer');
          await ml.jobTable.clickOpenJobInAnomalyExplorerButton(testData.jobConfig.job_id);
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
        });

        it('displays job results', async () => {
          await ml.testExecution.logTestStep('pre-fills the job selection');
          await ml.jobSelection.assertJobSelection([testData.jobConfig.job_id]);

          await ml.testExecution.logTestStep('displays the swimlanes');
          await ml.anomalyExplorer.assertOverallSwimlaneExists();
          await ml.anomalyExplorer.assertSwimlaneViewByExists();

          // TODO: click on swimlane cells to trigger warning callouts
          // when we figure out a way to click inside canvas renderings

          await ml.testExecution.logTestStep('should navigate to single metric viewer');
          await ml.navigation.navigateToSingleMetricViewerViaAnomalyExplorer();

          await ml.testExecution.logTestStep(
            'should show warning message and ask to select another job'
          );
          await ml.singleMetricViewer.assertDisabledJobReasonWarningToastExist();
          await ml.jobSelection.assertJobSelectionFlyoutOpen();
        });
      });
    }
  });
}
