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
    outlier_detection: {
      source: {
        index: ['ft_ihp_outlier'],
        query: {
          match_all: {},
        },
      },
      analysis: {
        outlier_detection: {},
      },
    },
  };

  interface TestConfig {
    jobType: string;
    config: DeepPartial<DataFrameAnalyticsConfig>;
  }

  const testJobConfigs: TestConfig[] = ['regression', 'classification', 'outlier_detection'].map(
    (jobType) => {
      return {
        jobType,
        config: {
          description: `Testing explain for ${jobType} job`,
          ...jobAnalysis[jobType],
        },
      };
    }
  );

  describe('POST data_frame/analytics/_explain', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    testJobConfigs.forEach((testConfig) => {
      describe(`ExplainDataFrameAnalytics ${testConfig.jobType}`, async () => {
        it(`should explain ${testConfig.jobType} analytics job`, async () => {
          const { body, status } = await supertest
            .post(`/api/ml/data_frame/analytics/_explain`)
            .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.config);
          ml.api.assertResponseStatusCode(200, status, body);

          expect(body).to.have.property('field_selection');
          // eslint-disable-next-line
          const { memory_estimation, field_selection } = body;
          const fieldObject = field_selection[0];
          expect(memory_estimation).to.have.property('expected_memory_with_disk');
          expect(memory_estimation).to.have.property('expected_memory_without_disk');
          expect(fieldObject).to.have.property('is_included');
          expect(fieldObject).to.have.property('is_required');
          expect(fieldObject).to.have.property('name');
          expect(fieldObject).to.have.property('feature_type');
          expect(fieldObject).to.have.property('mapping_types');
        });

        it(`should not allow user with only view permission to use explain endpoint for ${testConfig.jobType} job `, async () => {
          const { body, status } = await supertest
            .post(`/api/ml/data_frame/analytics/_explain`)
            .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.config);
          ml.api.assertResponseStatusCode(403, status, body);

          expect(body.error).to.eql('Forbidden');
          expect(body.message).to.eql('Forbidden');
        });

        it(`should not allow unauthorized user to use explain endpoint for ${testConfig.jobType} job`, async () => {
          const { body, status } = await supertest
            .post(`/api/ml/data_frame/analytics/_explain`)
            .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
            .set(COMMON_REQUEST_HEADERS)
            .send(testConfig.config);
          ml.api.assertResponseStatusCode(403, status, body);

          expect(body.error).to.eql('Forbidden');
          expect(body.message).to.eql('Forbidden');
        });
      });
    });
  });
};
