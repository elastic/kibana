/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
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

  describe('delete_annotations', function () {
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

    it('should delete annotation by id', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[0]);
      expect(annotationsForJob).to.have.length(1);

      const annotationIdToDelete = annotationsForJob[0]._id;

      const { body } = await supertest
        .delete(`/api/ml/annotations/delete/${annotationIdToDelete}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body._id).to.eql(annotationIdToDelete);
      expect(body.result).to.eql('deleted');

      await ml.api.waitForAnnotationNotToExist(annotationIdToDelete);
    });

    it('should delete annotation by id for user with viewer permission', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[1]);
      expect(annotationsForJob).to.have.length(1);

      const annotationIdToDelete = annotationsForJob[0]._id;

      const { body } = await supertest
        .delete(`/api/ml/annotations/delete/${annotationIdToDelete}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body._id).to.eql(annotationIdToDelete);
      expect(body.result).to.eql('deleted');

      await ml.api.waitForAnnotationNotToExist(annotationIdToDelete);
    });

    it('should not delete annotation for unauthorized user', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[2]);
      expect(annotationsForJob).to.have.length(1);

      const annotationIdToDelete = annotationsForJob[0]._id;

      const { body } = await supertest
        .delete(`/api/ml/annotations/delete/${annotationIdToDelete}`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');

      await ml.api.waitForAnnotationToExist(annotationIdToDelete);
    });
  });
};
