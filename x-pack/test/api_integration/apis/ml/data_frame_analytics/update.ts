/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  const jobId = `bm_${Date.now()}`;
  const generateDestinationIndex = (analyticsId: string) => `user-${analyticsId}`;
  const commonJobConfig = {
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
    analyzed_fields: {
      includes: [],
      excludes: [],
    },
    model_memory_limit: '60mb',
    allow_lazy_start: false, // default value
    max_num_threads: 1, // default value
  };

  const testJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>> = [
    'Test update job',
    'Test update job description only',
    'Test update job allow_lazy_start only',
    'Test update job model_memory_limit only',
    'Test update job max_num_threads only',
  ].map((description, idx) => {
    const analyticsId = `${jobId}_${idx}`;
    return {
      id: analyticsId,
      description,
      dest: {
        index: generateDestinationIndex(analyticsId),
        results_field: 'ml',
      },
      ...commonJobConfig,
    };
  });

  const editedDescription = 'Edited description';

  async function createJobs(mockJobConfigs: Array<DeepPartial<DataFrameAnalyticsConfig>>) {
    for (const jobConfig of mockJobConfigs) {
      await ml.api.createDataFrameAnalyticsJob(jobConfig as DataFrameAnalyticsConfig);
    }
  }

  async function getDFAJob(id: string) {
    const { body } = await supertest
      .get(`/api/ml/data_frame/analytics/${id}`)
      .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
      .set(COMMON_REQUEST_HEADERS);

    return body.data_frame_analytics[0];
  }

  describe('UPDATE data_frame/analytics', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await createJobs(testJobConfigs);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    describe('UpdateDataFrameAnalytics', () => {
      it('should update all editable fields of analytics job for specified id', async () => {
        const analyticsId = `${jobId}_0`;

        const requestBody = {
          description: editedDescription,
          model_memory_limit: '61mb',
          allow_lazy_start: true,
          max_num_threads: 2,
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(200);

        expect(body).not.to.be(undefined);

        const fetchedJob = await getDFAJob(analyticsId);

        expect(fetchedJob.description).to.eql(requestBody.description);
        expect(fetchedJob.allow_lazy_start).to.eql(requestBody.allow_lazy_start);
        expect(fetchedJob.model_memory_limit).to.eql(requestBody.model_memory_limit);
        expect(fetchedJob.max_num_threads).to.eql(requestBody.max_num_threads);
      });

      it('should only update description field of analytics job when description is sent in request', async () => {
        const analyticsId = `${jobId}_1`;

        const requestBody = {
          description: 'Edited description for job 1',
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(200);

        expect(body).not.to.be(undefined);

        const fetchedJob = await getDFAJob(analyticsId);

        expect(fetchedJob.description).to.eql(requestBody.description);
        expect(fetchedJob.allow_lazy_start).to.eql(commonJobConfig.allow_lazy_start);
        expect(fetchedJob.model_memory_limit).to.eql(commonJobConfig.model_memory_limit);
        expect(fetchedJob.max_num_threads).to.eql(commonJobConfig.max_num_threads);
      });

      it('should only update allow_lazy_start field of analytics job when allow_lazy_start is sent in request', async () => {
        const analyticsId = `${jobId}_2`;

        const requestBody = {
          allow_lazy_start: true,
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(200);

        expect(body).not.to.be(undefined);

        const fetchedJob = await getDFAJob(analyticsId);

        expect(fetchedJob.allow_lazy_start).to.eql(requestBody.allow_lazy_start);
        expect(fetchedJob.description).to.eql(testJobConfigs[2].description);
        expect(fetchedJob.model_memory_limit).to.eql(commonJobConfig.model_memory_limit);
        expect(fetchedJob.max_num_threads).to.eql(commonJobConfig.max_num_threads);
      });

      it('should only update model_memory_limit field of analytics job when model_memory_limit is sent in request', async () => {
        const analyticsId = `${jobId}_3`;

        const requestBody = {
          model_memory_limit: '61mb',
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(200);

        expect(body).not.to.be(undefined);

        const fetchedJob = await getDFAJob(analyticsId);

        expect(fetchedJob.model_memory_limit).to.eql(requestBody.model_memory_limit);
        expect(fetchedJob.allow_lazy_start).to.eql(commonJobConfig.allow_lazy_start);
        expect(fetchedJob.description).to.eql(testJobConfigs[3].description);
        expect(fetchedJob.max_num_threads).to.eql(commonJobConfig.max_num_threads);
      });

      it('should only update max_num_threads field of analytics job when max_num_threads is sent in request', async () => {
        const analyticsId = `${jobId}_4`;

        const requestBody = {
          max_num_threads: 2,
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(200);

        expect(body).not.to.be(undefined);

        const fetchedJob = await getDFAJob(analyticsId);

        expect(fetchedJob.max_num_threads).to.eql(requestBody.max_num_threads);
        expect(fetchedJob.model_memory_limit).to.eql(commonJobConfig.model_memory_limit);
        expect(fetchedJob.allow_lazy_start).to.eql(commonJobConfig.allow_lazy_start);
        expect(fetchedJob.description).to.eql(testJobConfigs[4].description);
      });

      it('should not allow to update analytics job for unauthorized user', async () => {
        const analyticsId = `${jobId}_0`;
        const requestBody = {
          description: 'Unauthorized',
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');

        const fetchedJob = await getDFAJob(analyticsId);
        // Description should not have changed
        expect(fetchedJob.description).to.eql(editedDescription);
      });

      it('should not allow to update analytics job for the user with only view permission', async () => {
        const analyticsId = `${jobId}_0`;
        const requestBody = {
          description: 'View only',
        };

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_update`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql('Not Found');

        const fetchedJob = await getDFAJob(analyticsId);
        // Description should not have changed
        expect(fetchedJob.description).to.eql(editedDescription);
      });

      it('should show 404 error if job does not exist', async () => {
        const requestBody = {
          description: 'Not found',
        };
        const id = `${jobId}_invalid`;
        const message = `[resource_not_found_exception] No known data frame analytics with id [${id}]`;

        const { body } = await supertest
          .post(`/api/ml/data_frame/analytics/${id}/_update`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS)
          .send(requestBody)
          .expect(404);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql(message);
      });
    });
  });
};
