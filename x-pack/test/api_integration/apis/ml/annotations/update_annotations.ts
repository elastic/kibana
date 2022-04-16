/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ANNOTATION_TYPE } from '@kbn/ml-plugin/common/constants/annotations';
import { Annotation } from '@kbn/ml-plugin/common/types/annotations';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { testSetupJobConfigs, jobIds, testSetupAnnotations } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const commonAnnotationUpdateRequestBody: Partial<Annotation> = {
    timestamp: Date.now(),
    end_timestamp: Date.now(),
    annotation: 'Updated annotation',
    type: ANNOTATION_TYPE.ANNOTATION,
    event: 'model_change',
    detector_index: 2,
    partition_field_name: 'airline',
    partition_field_value: 'ANA',
  };

  describe('update_annotations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      // generate one annotation for each job
      for (let i = 0; i < testSetupJobConfigs.length; i++) {
        const job = testSetupJobConfigs[i];
        const annotationToIndex = testSetupAnnotations[i];
        // @ts-expect-error not full interface
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.indexAnnotation(annotationToIndex);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should correctly update annotation by id', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[0]);
      expect(annotationsForJob).to.have.length(1);

      const originalAnnotation = annotationsForJob[0];
      const annotationUpdateRequestBody = {
        ...commonAnnotationUpdateRequestBody,
        job_id: originalAnnotation._source?.job_id,
        _id: originalAnnotation._id,
      };

      const { body, status } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationUpdateRequestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body._id).to.eql(originalAnnotation._id);
      expect(body.result).to.eql('updated');

      const updatedAnnotation = await ml.api.getAnnotationById(originalAnnotation._id);

      if (updatedAnnotation) {
        Object.keys(commonAnnotationUpdateRequestBody).forEach((key) => {
          const field = key as keyof Annotation;
          expect(updatedAnnotation[field]).to.eql(annotationUpdateRequestBody[field]);
        });
      }
    });

    it('should correctly update annotation for user with viewer permission', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[1]);
      expect(annotationsForJob).to.have.length(1);

      const originalAnnotation = annotationsForJob[0];
      const annotationUpdateRequestBody = {
        ...commonAnnotationUpdateRequestBody,
        job_id: originalAnnotation._source?.job_id,
        _id: originalAnnotation._id,
      };

      const { body, status } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationUpdateRequestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body._id).to.eql(originalAnnotation._id);
      expect(body.result).to.eql('updated');

      const updatedAnnotation = await ml.api.getAnnotationById(originalAnnotation._id);
      if (updatedAnnotation) {
        Object.keys(commonAnnotationUpdateRequestBody).forEach((key) => {
          const field = key as keyof Annotation;
          expect(updatedAnnotation[field]).to.eql(annotationUpdateRequestBody[field]);
        });
      }
    });

    it('should not update annotation for unauthorized user', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[2]);
      expect(annotationsForJob).to.have.length(1);

      const originalAnnotation = annotationsForJob[0];

      const annotationUpdateRequestBody = {
        ...commonAnnotationUpdateRequestBody,
        job_id: originalAnnotation._source?.job_id,
        _id: originalAnnotation._id,
      };

      const { body, status } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationUpdateRequestBody);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');

      const updatedAnnotation = await ml.api.getAnnotationById(originalAnnotation._id);
      expect(updatedAnnotation).to.eql(originalAnnotation._source);
    });

    it('should override fields correctly', async () => {
      const annotationsForJob = await ml.api.getAnnotations(jobIds[3]);
      expect(annotationsForJob).to.have.length(1);

      const originalAnnotation = annotationsForJob[0];
      const annotationUpdateRequestBodyWithMissingFields: Partial<Annotation> = {
        timestamp: Date.now(),
        end_timestamp: Date.now(),
        annotation: 'Updated annotation',
        job_id: originalAnnotation._source?.job_id,
        type: ANNOTATION_TYPE.ANNOTATION,
        event: 'model_change',
        detector_index: 2,
        _id: originalAnnotation._id,
      };
      const { body, status } = await supertest
        .put('/api/ml/annotations/index')
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(annotationUpdateRequestBodyWithMissingFields);
      ml.api.assertResponseStatusCode(200, status, body);

      const updatedAnnotation = await ml.api.getAnnotationById(originalAnnotation._id);
      if (updatedAnnotation) {
        Object.keys(annotationUpdateRequestBodyWithMissingFields).forEach((key) => {
          if (key !== '_id') {
            const field = key as keyof Annotation;
            expect(updatedAnnotation[field]).to.eql(
              annotationUpdateRequestBodyWithMissingFields[field]
            );
          }
        });
      }
      // validate missing fields in the annotationUpdateRequestBody
      expect(updatedAnnotation?.partition_field_name).to.be(undefined);
      expect(updatedAnnotation?.partition_field_value).to.be(undefined);
    });
  });
};
