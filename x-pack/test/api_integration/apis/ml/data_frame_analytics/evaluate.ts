/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  // const jobId = `bm_${Date.now()}`;
  const currentTime = `${Date.now()}`;
  const generateDestinationIndex = (analyticsId: string) => `user-${analyticsId}`;
  const jobEval: any = {
    regression: {
      index: generateDestinationIndex(`regression_${currentTime}`),
      evaluation: {
        regression: {
          actual_field: 'y',
          predicted_field: 'ml.y_prediction',
          metrics: {
            r_squared: {},
            mse: {},
            msle: {},
            huber: {},
          },
        },
      },
    },
    classification: {
      index: generateDestinationIndex(`classification_${currentTime}`),
      evaluation: {
        classification: {
          actual_field: 'y',
          predicted_field: 'ml.y_prediction',
          metrics: { multiclass_confusion_matrix: {}, accuracy: {}, recall: {} },
        },
      },
    },
    outlier_detection: {
      index: generateDestinationIndex(`outlier_detection_${currentTime}`),
      evaluation: {
        actual_field: 'is_outlier',
        predicted_probability_field: 'ml.outlier_score',
      },
    },
  };
  const jobAnalysis: any = {
    classification: {
      source: {
        index: ['ft_bank_marketing'],
        query: {
          match_all: {},
        },
      },
      analysis: {
        classification: {
          dependent_variable: 'y',
          training_percent: 20,
        },
      },
    },
    regression: {
      source: {
        index: ['ft_egs_regression'],
        query: {
          match_all: {},
        },
      },
      analysis: {
        regression: {
          dependent_variable: 'y',
          training_percent: 20,
        },
      },
    },
    outlier_detection: {
      source: {
        index: ['ft_ihp_outlier'],
        query: {
          match_all: {},
        },
      },
      analysis: {
        outlier_detection: {
          compute_feature_influence: true,
          standardization_enabled: true,
        },
      },
    },
  };

  interface TestConfig {
    jobType: string;
    config: DeepPartial<DataFrameAnalyticsConfig>;
    eval: any;
  }

  const testJobConfigs: TestConfig[] = ['regression', 'classification', 'outlier_detection'].map(
    (jobType, idx) => {
      const analyticsId = `${jobType}_${currentTime}`;
      return {
        jobType,
        config: {
          id: analyticsId,
          description: `Testing ${jobType} evaluation`,
          dest: {
            index: generateDestinationIndex(analyticsId),
            results_field: 'ml',
          },
          analyzed_fields: {
            includes: [],
            excludes: [],
          },
          model_memory_limit: '60mb',
          ...jobAnalysis[jobType],
        },
        eval: jobEval[jobType],
      };
    }
  );

  async function createJobs(mockJobConfigs: TestConfig[]) {
    for (const jobConfig of mockJobConfigs) {
      await ml.api.createDataFrameAnalyticsJob(jobConfig.config as DataFrameAnalyticsConfig);
    }
  }

  describe('POST data_frame/_evaluate', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/bm_classification');
      await esArchiver.loadIfNeeded('ml/egs_regression');
      await esArchiver.loadIfNeeded('ml/ihp_outlier');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs(testJobConfigs);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    testJobConfigs.forEach((testConfig) => {
      describe(`EvaluateDataFrameAnalytics ${testConfig.jobType}`, async () => {
        const analyticsId = `${testConfig.config.id}`;
        const destinationIndex = generateDestinationIndex(analyticsId);

        before(async () => {
          // Mimic real job by creating index pattern after job is created
          await ml.testResources.createIndexPatternIfNeeded(destinationIndex);
        });

        after(async () => {
          await ml.testResources.deleteIndexPatternByTitle(destinationIndex);
        });

        it(`should evaluate ${testConfig.jobType} analytics job`, async () => {
          const resp = await supertest
            .post(`/api/ml/data_frame/_evaluate`)
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.eval);
          // .expect(200);
          const body = resp.body;

          expect(body.success).to.eql(true);
        });
      });
    });
  });
};
