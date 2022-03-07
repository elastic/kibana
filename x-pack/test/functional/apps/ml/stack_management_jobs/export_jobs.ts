/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import type { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';

const testADJobs: Array<{ job: Job; datafeed: Datafeed }> = [
  {
    job: {
      job_id: 'fq_single_1_smv',
      groups: ['farequote', 'automated', 'single-metric'],
      description: 'mean(responsetime) on farequote dataset with 15m bucket span',
      analysis_config: {
        bucket_span: '15m',
        detectors: [
          {
            detector_description: 'mean(responsetime)',
            function: 'mean',
            field_name: 'responsetime',
          },
        ],
        influencers: [],
      },
      analysis_limits: {
        model_memory_limit: '10mb',
        categorization_examples_limit: 4,
      },
      data_description: {
        time_field: '@timestamp',
        time_format: 'epoch_ms',
      },
      model_plot_config: {
        enabled: true,
        annotations_enabled: true,
      },
      model_snapshot_retention_days: 10,
      daily_model_snapshot_retention_after_days: 1,
      results_index_name: 'shared',
      allow_lazy_open: false,
    },
    datafeed: {
      datafeed_id: 'datafeed-fq_single_1_smv',
      job_id: 'fq_single_1_smv',
      query: {
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
        },
      },
      indices: ['ft_farequote'],
      scroll_size: 1000,
      delayed_data_check_config: {
        enabled: true,
      },
    },
  },
  {
    job: {
      job_id: 'fq_single_2_smv',
      groups: ['farequote', 'automated', 'single-metric'],
      description: 'low_mean(responsetime) on farequote dataset with 15m bucket span',
      analysis_config: {
        bucket_span: '15m',
        detectors: [
          {
            detector_description: 'low_mean(responsetime)',
            function: 'low_mean',
            field_name: 'responsetime',
          },
        ],
        influencers: ['responsetime'],
      },
      analysis_limits: {
        model_memory_limit: '11mb',
        categorization_examples_limit: 4,
      },
      data_description: {
        time_field: '@timestamp',
        time_format: 'epoch_ms',
      },
      model_plot_config: {
        enabled: true,
        annotations_enabled: true,
      },
      model_snapshot_retention_days: 10,
      daily_model_snapshot_retention_after_days: 1,
      results_index_name: 'shared',
      allow_lazy_open: false,
    },
    datafeed: {
      datafeed_id: 'datafeed-fq_single_2_smv',
      job_id: 'fq_single_2_smv',
      query: {
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
        },
      },
      indices: ['ft_farequote'],
      scroll_size: 1000,
      delayed_data_check_config: {
        enabled: true,
      },
    },
  },
  {
    job: {
      job_id: 'fq_single_3_smv',
      groups: ['farequote', 'automated', 'single-metric'],
      description: 'high_mean(responsetime) on farequote dataset with 15m bucket span',
      analysis_config: {
        bucket_span: '15m',
        detectors: [
          {
            detector_description: 'high_mean(responsetime)',
            function: 'high_mean',
            field_name: 'responsetime',
          },
        ],
        influencers: ['responsetime'],
      },
      analysis_limits: {
        model_memory_limit: '11mb',
        categorization_examples_limit: 4,
      },
      data_description: {
        time_field: '@timestamp',
        time_format: 'epoch_ms',
      },
      model_plot_config: {
        enabled: true,
        annotations_enabled: true,
      },
      model_snapshot_retention_days: 10,
      daily_model_snapshot_retention_after_days: 1,
      results_index_name: 'shared',
      allow_lazy_open: false,
    },
    datafeed: {
      datafeed_id: 'datafeed-fq_single_3_smv',
      job_id: 'fq_single_3_smv',
      query: {
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
        },
      },
      indices: ['ft_farequote'],
      scroll_size: 1000,
      delayed_data_check_config: {
        enabled: true,
      },
    },
  },
];

const testDFAJobs: DataFrameAnalyticsConfig[] = [
  // @ts-expect-error not full interface
  {
    id: `bm_1_1`,
    description:
      "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
    source: {
      index: ['ft_bank_marketing'],
      query: {
        match_all: {},
      },
    },
    dest: {
      index: 'user-bm_1_1',
      results_field: 'ml',
    },
    analysis: {
      classification: {
        prediction_field_name: 'test',
        dependent_variable: 'y',
        training_percent: 20,
      },
    },
    analyzed_fields: {
      includes: [],
      excludes: [],
    },
    model_memory_limit: '60mb',
    allow_lazy_start: false,
  },
  // @ts-expect-error not full interface
  {
    id: `ihp_1_2`,
    description: 'This is the job description',
    source: {
      index: ['ft_ihp_outlier'],
      query: {
        match_all: {},
      },
    },
    dest: {
      index: 'user-ihp_1_2',
      results_field: 'ml',
    },
    analysis: {
      outlier_detection: {},
    },
    analyzed_fields: {
      includes: [],
      excludes: [],
    },
    model_memory_limit: '5mb',
  },
  // @ts-expect-error not full interface
  {
    id: `egs_1_3`,
    description: 'This is the job description',
    source: {
      index: ['ft_egs_regression'],
      query: {
        match_all: {},
      },
    },
    dest: {
      index: 'user-egs_1_3',
      results_field: 'ml',
    },
    analysis: {
      regression: {
        prediction_field_name: 'test',
        dependent_variable: 'stab',
        training_percent: 20,
      },
    },
    analyzed_fields: {
      includes: [],
      excludes: [],
    },
    model_memory_limit: '20mb',
  },
];

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('export jobs', function () {
    this.tags(['mlqa']);
    before(async () => {
      await ml.api.cleanMlIndices();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.testResources.createIndexPatternIfNeeded('ft_bank_marketing', '@timestamp');

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.createIndexPatternIfNeeded('ft_ihp_outlier', '@timestamp');

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
      await ml.testResources.createIndexPatternIfNeeded('ft_egs_regression', '@timestamp');

      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const { job, datafeed } of testADJobs) {
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.createDatafeed(datafeed);
      }
      for (const job of testDFAJobs) {
        await ml.api.createDataFrameAnalyticsJob(job);
      }

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToStackManagement();
      await ml.navigation.navigateToStackManagementJobsListPage();
    });
    after(async () => {
      await ml.api.cleanMlIndices();
      ml.stackManagementJobs.deleteExportedFiles([
        'anomaly_detection_jobs',
        'data_frame_analytics_jobs',
      ]);
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_bank_marketing');
      await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');
      await ml.testResources.deleteIndexPatternByTitle('ft_egs_regression');
    });

    it('opens export flyout and exports anomaly detector jobs', async () => {
      await ml.stackManagementJobs.openExportFlyout();
      await ml.stackManagementJobs.selectExportJobType('anomaly-detector');
      await ml.stackManagementJobs.selectExportJobSelectAll('anomaly-detector');
      await ml.stackManagementJobs.selectExportJobs();
      await ml.stackManagementJobs.assertExportedADJobsAreCorrect(testADJobs);
    });

    it('opens export flyout and exports data frame analytics jobs', async () => {
      await ml.stackManagementJobs.openExportFlyout();
      await ml.stackManagementJobs.selectExportJobType('data-frame-analytics');
      await ml.stackManagementJobs.selectExportJobSelectAll('data-frame-analytics');
      await ml.stackManagementJobs.selectExportJobs();
      await ml.stackManagementJobs.assertExportedDFAJobsAreCorrect(testDFAJobs);
    });
  });
}
