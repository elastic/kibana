/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { Annotation } from '../../../../../plugins/ml/common/types/annotations';
import { createJobConfig, createAnnotationRequestBody } from './common_jobs';
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `job_annotation_${Date.now()}`;
  const testJobConfig = createJobConfig(jobId);
  const annotationRequestBody = createAnnotationRequestBody(jobId);

  describe('create_annotations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createAnomalyDetectionJob(testJobConfig);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should successfully create annotations for anomaly job', async () => {
      const { body } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationRequestBody)
        .expect(200);
      const annotationId = body._id;

      const fetchedAnnotation = await ml.api.getAnnotationById(annotationId);

      expect(fetchedAnnotation).to.not.be(undefined);

      if (fetchedAnnotation) {
        Object.keys(annotationRequestBody).forEach((key) => {
          const field = key as keyof Annotation;
          expect(fetchedAnnotation[field]).to.eql(annotationRequestBody[field]);
        });
      }
      expect(fetchedAnnotation?.create_username).to.eql(USER.ML_POWERUSER);
    });

    it('should successfully create annotation for user with ML read permissions', async () => {
      const { body } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationRequestBody)
        .expect(200);

      const annotationId = body._id;
      const fetchedAnnotation = await ml.api.getAnnotationById(annotationId);
      expect(fetchedAnnotation).to.not.be(undefined);
      if (fetchedAnnotation) {
        Object.keys(annotationRequestBody).forEach((key) => {
          const field = key as keyof Annotation;
          expect(fetchedAnnotation[field]).to.eql(annotationRequestBody[field]);
        });
      }
      expect(fetchedAnnotation?.create_username).to.eql(USER.ML_VIEWER);
    });

    it('should not allow to create annotation for unauthorized user', async () => {
      const { body } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationRequestBody)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });
  });
};
