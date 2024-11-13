/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  let testStart: number;

  describe('GET notifications count', () => {
    testStart = Date.now();

    describe('when no ML entities present', () => {
      it('return a default response', async () => {
        const { body, status } = await supertest
          .get(`/internal/ml/notifications/count`)
          .query({ lastCheckedAt: testStart })
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(getCommonRequestHeader('1'));
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.info).to.eql(0);
        expect(body.warning).to.eql(0);
        expect(body.error).to.eql(0);
      });
    });

    describe('when ML entities exist', () => {
      before(async () => {
        await ml.api.initSavedObjects();
        await ml.testResources.setKibanaTimeZoneToUTC();

        const jobId = `fq_job_${Date.now()}`;
        const adJobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobId);
        await ml.api.createAnomalyDetectionJob(adJobConfig);

        await ml.api.waitForJobNotificationsToIndex(jobId);
      });

      after(async () => {
        await ml.api.cleanMlIndices();
        await ml.testResources.cleanMLSavedObjects();
      });

      it('return notifications count by level', async () => {
        const { body, status } = await supertest
          .get(`/internal/ml/notifications/count`)
          .query({ lastCheckedAt: testStart })
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(getCommonRequestHeader('1'));
        ml.api.assertResponseStatusCode(200, status, body);

        expect(body.info).to.eql(1);
        expect(body.warning).to.eql(0);
        expect(body.error).to.eql(0);
      });

      it('returns an error for unauthorized user', async () => {
        const { body, status } = await supertest
          .get(`/internal/ml/notifications/count`)
          .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
          .set(getCommonRequestHeader('1'));
        ml.api.assertResponseStatusCode(403, status, body);
      });
    });
  });
};
