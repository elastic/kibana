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

  const currentTime = `${Date.now()}`;
  const generateDestinationIndex = (analyticsId: string) => `user-${analyticsId}`;
  const jobEval: any = {
    regression: {
      index: generateDestinationIndex(`regression_${currentTime}`),
      evaluation: {
        regression: {
          actual_field: 'stab',
          predicted_field: 'ml.stab_prediction',
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
          dependent_variable: 'stab',
          training_percent: 20,
        },
      },
    },
  };

  interface TestConfig {
    jobType: string;
    config: DeepPartial<DataFrameAnalyticsConfig>;
    eval: any;
  }

  const testJobConfigs: TestConfig[] = ['regression', 'classification'].map((jobType, idx) => {
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
  });

  async function createJobs(mockJobConfigs: TestConfig[]) {
    for (const jobConfig of mockJobConfigs) {
      await ml.api.createAndRunDFAJob(jobConfig.config as DataFrameAnalyticsConfig);
    }
  }

  describe('POST data_frame/_evaluate', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs(testJobConfigs);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    testJobConfigs.forEach((testConfig) => {
      describe(`EvaluateDataFrameAnalytics ${testConfig.jobType}`, async () => {
        it(`should evaluate ${testConfig.jobType} analytics job`, async () => {
          const { body, status } = await supertest
            .post(`/api/ml/data_frame/_evaluate`)
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.eval);
          ml.api.assertResponseStatusCode(200, status, body);

          if (testConfig.jobType === 'classification') {
            const { classification } = body;
            expect(body).to.have.property('classification');
            expect(classification).to.have.property('recall');
            expect(classification).to.have.property('accuracy');
            expect(classification).to.have.property('multiclass_confusion_matrix');
          } else {
            const { regression } = body;
            expect(body).to.have.property('regression');
            expect(regression).to.have.property('mse');
            expect(regression).to.have.property('msle');
            expect(regression).to.have.property('r_squared');
          }
        });

        it(`should evaluate ${testConfig.jobType} job for the user with only view permission`, async () => {
          const { body, status } = await supertest
            .post(`/api/ml/data_frame/_evaluate`)
            .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.eval);
          ml.api.assertResponseStatusCode(200, status, body);

          if (testConfig.jobType === 'classification') {
            const { classification } = body;
            expect(body).to.have.property('classification');
            expect(classification).to.have.property('recall');
            expect(classification).to.have.property('accuracy');
            expect(classification).to.have.property('multiclass_confusion_matrix');
          } else {
            const { regression } = body;
            expect(body).to.have.property('regression');
            expect(regression).to.have.property('mse');
            expect(regression).to.have.property('msle');
            expect(regression).to.have.property('r_squared');
          }
        });

        it(`should not allow unauthorized user to evaluate ${testConfig.jobType} job`, async () => {
          const { body, status } = await supertest
            .post(`/api/ml/data_frame/_evaluate`)
            .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.eval);
          ml.api.assertResponseStatusCode(403, status, body);

          expect(body.error).to.eql('Forbidden');
          expect(body.message).to.eql('Forbidden');
        });
      });
    });
  });
};
