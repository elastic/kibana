/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  NotificationItem,
  NotificationsSearchResponse,
} from '@kbn/ml-plugin/common/types/notifications';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('GET notifications', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.api.initSavedObjects();
      await ml.testResources.setKibanaTimeZoneToUTC();

      const adJobConfig = ml.commonConfig.getADFqSingleMetricJobConfig('fq_job');
      await ml.api.createAnomalyDetectionJob(adJobConfig);

      const dfaJobConfig = ml.commonConfig.getDFABmClassificationJobConfig('df_job');
      await ml.api.createDataFrameAnalyticsJob(dfaJobConfig);

      // wait for notification to index

      await ml.api.waitForJobNotificationsToIndex('fq_job');
      await ml.api.waitForJobNotificationsToIndex('df_job');
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('return all notifications ', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/notifications`)
        .query({ earliest: 'now-1d', latest: 'now' })
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect((body as NotificationsSearchResponse).total).to.eql(2);
    });

    it('return notifications based on the query string', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/notifications`)
        .query({ earliest: 'now-1d', latest: 'now', queryString: 'job_type:anomaly_detector' })
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect((body as NotificationsSearchResponse).total).to.eql(1);
      expect(
        (body as NotificationsSearchResponse).results.filter(
          (result: NotificationItem) => result.job_type === 'anomaly_detector'
        )
      ).to.length(body.total);
    });

    it('supports sorting asc sorting by field', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/notifications`)
        .query({ earliest: 'now-1d', latest: 'now', sortField: 'job_id', sortDirection: 'asc' })
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.results[0].job_id).to.eql('df_job');
    });

    it('supports sorting desc sorting by field', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/notifications`)
        .query({ earliest: 'now-1h', latest: 'now', sortField: 'job_id', sortDirection: 'desc' })
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.results[0].job_id).to.eql('fq_job');
    });

    it('returns an error for unauthorized user', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/notifications`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};
