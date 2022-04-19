/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DATA_FRAME_TASK_STATE } from '@kbn/ml-plugin/common/constants/data_frame_analytics';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const jobId = `bm_${Date.now()}`;
  const analyticsId = `${jobId}_1`;
  let destinationIndex: string;

  describe('POST data_frame/analytics/{analyticsId}/_stop', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
      // job config with high training percent so it takes longer to run
      const slowRunningConfig = ml.commonConfig.getDFABmClassificationJobConfig(analyticsId);
      destinationIndex = slowRunningConfig.dest.index;

      await ml.api.createDataFrameAnalyticsJob(slowRunningConfig);
      await ml.api.runDFAJob(analyticsId);
    });

    after(async () => {
      await ml.api.deleteDataFrameAnalyticsJobES(analyticsId);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices(destinationIndex);
    });

    describe('StopsDataFrameAnalyticsJob', () => {
      it('should stop analytics job for specified id when job exists', async () => {
        const { body, status } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body).not.to.be(undefined);
        expect(body.stopped).to.be(true);
        await ml.api.waitForAnalyticsState(analyticsId, DATA_FRAME_TASK_STATE.STOPPED, 5000);
      });

      it('should show 404 error if job does not exist', async () => {
        const id = `${jobId}_invalid`;
        const message = `No known job with id '${id}'`;

        const { body, status } = await supertest
          .post(`/api/ml/data_frame/analytics/${id}/_stop`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(404, status, body);

        expect(body.error).to.eql('Not Found');
        expect(body.message).to.eql(message);
      });

      it('should not allow to stop analytics job for unauthorized user', async () => {
        const { body, status } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });

      it('should not allow to stop analytics job for user with view only permission', async () => {
        const { body, status } = await supertest
          .post(`/api/ml/data_frame/analytics/${analyticsId}/_stop`)
          .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(403, status, body);

        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.eql('Forbidden');
      });
    });
  });
};
