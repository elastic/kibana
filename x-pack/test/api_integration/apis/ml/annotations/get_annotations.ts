/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import _ from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';
import { USER } from '../../../../functional/services/ml/security_common';
import { ANNOTATION_TYPE } from '../../../../../plugins/ml/common/constants/annotations';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [1, 2, 3].map((num) => ({
    job_id: `job_annotation_${num}_${Date.now()}`,
    description: `Test annotation ${num}`,
    groups: ['farequote', 'automated', 'single-metric'],
    analysis_config: {
      bucket_span: '15m',
      influencers: [],
      detectors: [
        {
          function: 'mean',
          field_name: 'responsetime',
        },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '10mb' },
  }));
  const jobIds = testSetupJobConfigs.map((j) => j.job_id);

  const createAnnotationRequestBody = (jobId) => {
    return {
      timestamp: Date.now(),
      end_timestamp: Date.now(),
      annotation: 'Test annotation',
      job_id: jobId,
      type: ANNOTATION_TYPE.ANNOTATION,
      event: 'user',
      detector_index: 1,
      partition_field_name: 'airline',
      partition_field_value: 'AAL',
    };
  };

  const testSetupAnnotations = testSetupJobConfigs.map((job) =>
    createAnnotationRequestBody(job.job_id)
  );

  describe('get_annotations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      // generate one annotation for each job
      for (let i = 0; i < testSetupJobConfigs.length; i++) {
        const job = testSetupJobConfigs[i];
        const annotationToIndex = testSetupAnnotations[i];
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.indexAnnotation(annotationToIndex);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should fetch all annotations for jobId', async () => {
      const requestBody = {
        jobIds: [jobIds[0]],
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body } = await supertest
        .post('/api/ml/annotations')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body.success).to.eql(true);
      expect(body.annotations).not.to.be(undefined);
      [jobIds[0]].forEach((jobId, idx) => {
        expect(body.annotations).to.have.property(jobId);
        expect(body.annotations[jobId]).to.have.length(1);

        const indexedAnnotation = _.omit(body.annotations[jobId][0], '_id');
        expect(indexedAnnotation).to.eql(testSetupAnnotations[idx]);
      });
    });

    it('should fetch all annotations for multiple jobs', async () => {
      const requestBody = {
        jobIds: testSetupJobConfigs.map((j) => j.job_id),
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body } = await supertest
        .post('/api/ml/annotations')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);

      expect(body.success).to.eql(true);
      expect(body.annotations).not.to.be(undefined);
      jobIds.forEach((jobId, idx) => {
        expect(body.annotations).to.have.property(jobId);
        expect(body.annotations[jobId]).to.have.length(1);

        const indexedAnnotation = _.omit(body.annotations[jobId][0], '_id');
        expect(indexedAnnotation).to.eql(testSetupAnnotations[idx]);
      });
    });

    it('should fetch all annotations for user with viewer permissions', async () => {
      const requestBody = {
        jobIds: testSetupJobConfigs.map((j) => j.job_id),
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body } = await supertest
        .post('/api/ml/annotations')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(200);
      expect(body.success).to.eql(true);
      expect(body.annotations).not.to.be(undefined);
      jobIds.forEach((jobId, idx) => {
        expect(body.annotations).to.have.property(jobId);
        expect(body.annotations[jobId]).to.have.length(1);

        const indexedAnnotation = _.omit(body.annotations[jobId][0], '_id');
        expect(indexedAnnotation).to.eql(testSetupAnnotations[idx]);
      });
    });

    it('should not allow to fetch annotation for user with viewer permissions', async () => {
      const requestBody = {
        jobIds: testSetupJobConfigs.map((j) => j.job_id),
        earliestMs: 1454804100000,
        latestMs: Date.now(),
        maxAnnotations: 500,
      };
      const { body } = await supertest
        .post('/api/ml/annotations')
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(requestBody)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });
  });
};
