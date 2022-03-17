/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const retry = getService('retry');

  const jobId = `bm_${Date.now()}`;

  async function createJobs() {
    const mockJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>> = [
      {
        id: `${jobId}_1`,
        description:
          "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
        source: {
          index: ['ft_bank_marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: `user-${jobId}_1`,
          results_field: 'ml',
        },
        analysis: {
          classification: {
            dependent_variable: 'y',
            training_percent: 20,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '60mb',
      },
      {
        id: `${jobId}_2`,
        description:
          "Regression job based on 'ft_bank_marketing' dataset with dependentVariable 'duration' and trainingPercent '20'",
        source: {
          index: ['ft_bank_marketing'],
          query: {
            match_all: {},
          },
        },
        dest: {
          index: `user-${jobId}_2`,
          results_field: 'ml',
        },
        analysis: {
          regression: {
            dependent_variable: 'duration',
            training_percent: 20,
          },
        },
        analyzed_fields: {
          includes: [],
          excludes: [],
        },
        model_memory_limit: '60mb',
      },
    ];

    for (const jobConfig of mockJobConfigs) {
      await ml.api.createDataFrameAnalyticsJob(jobConfig as DataFrameAnalyticsConfig);
    }
  }

  describe('GET data_frame/analytics', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await createJobs();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('GetDataFrameAnalytics', () => {
      it('should fetch all analytics jobs', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve analytics jobs for the user without required permissions', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });

    describe('GetDataFrameAnalyticsById', () => {
      it('should fetch single analytics job by id', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.count).to.eql(1);
        expect(body.data_frame_analytics.length).to.eql(1);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
      });

      it('should fetch analytics jobs based on provided ids', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1,${jobId}_2`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve a job for the user without required permissions', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });

    describe('GetDataFrameAnalyticsStats', () => {
      it('should fetch analytics jobs stats', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[0]).to.have.keys(
          'id',
          'state',
          'progress',
          'data_counts',
          'memory_usage'
        );
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve jobs stats for the user without required permissions', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/_stats`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });

    describe('GetDataFrameAnalyticsStatsById', () => {
      it('should fetch single analytics job stats by id', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.count).to.eql(1);
        expect(body.data_frame_analytics.length).to.eql(1);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[0]).to.have.keys(
          'id',
          'state',
          'progress',
          'data_counts',
          'memory_usage'
        );
      });

      it('should fetch multiple analytics jobs stats based on provided ids', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1,${jobId}_2/_stats`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.count).to.eql(2);
        expect(body.data_frame_analytics.length).to.eql(2);
        expect(body.data_frame_analytics[0].id).to.eql(`${jobId}_1`);
        expect(body.data_frame_analytics[0]).to.have.keys(
          'id',
          'state',
          'progress',
          'data_counts',
          'memory_usage'
        );
        expect(body.data_frame_analytics[1].id).to.eql(`${jobId}_2`);
      });

      it('should not allow to retrieve a job stats for the user without required permissions', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1/_stats`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });

    describe('GetDataFrameAnalyticsIdMap', () => {
      it('should return a map of objects leading up to analytics job id', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/map/${jobId}_1`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body).to.have.keys('elements', 'details', 'error');
        // Index node, 2 job nodes (with same source index), and 2 edge nodes to connect them
        expect(body.elements.length).to.eql(5);

        for (const detailsId in body.details) {
          if (detailsId.includes('analytics')) {
            expect(body.details[detailsId]).to.have.keys('id', 'source', 'dest');
          } else if (detailsId.includes('index')) {
            const indexId = detailsId.replace('-index', '');
            expect(body.details[detailsId][indexId]).to.have.keys('aliases', 'mappings');
          }
        }
      });

      it('should return empty results and an error message if the job does not exist', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/map/${jobId}_fake`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.elements.length).to.eql(0);
        expect(body.details).to.eql({});
        expect(body.error).to.eql(`No known job with id '${jobId}_fake'`);

        expect(body).to.have.keys('elements', 'details', 'error');
      });
    });

    describe('GetDataFrameAnalyticsMessages', () => {
      it('should fetch single analytics job messages by id', async () => {
        await retry.tryForTime(5000, async () => {
          const { body, status } = await supertest
            .get(`/api/ml/data_frame/analytics/${jobId}_1/messages`)
            .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
            .set(COMMON_REQUEST_HEADERS);
          ml.api.assertResponseStatusCode(200, status, body);

          expect(body.length).to.eql(1);
          expect(body[0].job_id).to.eql(`${jobId}_1`);
          expect(body[0]).to.have.keys(
            'job_id',
            'message',
            'level',
            'timestamp',
            'node_name',
            'job_type'
          );
        });
      });

      it('should not allow to retrieve job messages without required permissions', async () => {
        const { body, status } = await supertest
          .get(`/api/ml/data_frame/analytics/${jobId}_1/messages`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });
  });
};
