/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getJobConfig } from './index';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const retry = getService('retry');

  let notificationIndices: string[] = [];

  describe('clear_messages', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const jobConfig of getJobConfig(2)) {
        await ml.api.createAnomalyDetectionJob(jobConfig);
      }

      const { body, status } = await supertest
        .get(`/api/ml/job_audit_messages/messages`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      notificationIndices = body.notificationIndices;
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should mark audit messages as cleared for provided job', async () => {
      const timestamp = Date.now();

      const { body, status } = await supertest
        .put(`/api/ml/job_audit_messages/clear_messages`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({
          jobId: 'test_get_job_audit_messages_1',
          notificationIndices,
        });
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.success).to.eql(true);
      expect(body.last_cleared).to.be.above(timestamp);

      await retry.tryForTime(5000, async () => {
        const { body: getBody, status: getStatus } = await supertest
          .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_1`)
          .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
          .set(COMMON_REQUEST_HEADERS);
        ml.api.assertResponseStatusCode(200, getStatus, getBody);

        expect(getBody.messages.length).to.eql(
          1,
          `Expected 1 job audit message, got ${JSON.stringify(getBody.messages, null, 2)}`
        );

        expect(omit(getBody.messages[0], ['timestamp', 'node_name'])).to.eql({
          job_id: 'test_get_job_audit_messages_1',
          message: 'Job created',
          level: 'info',
          job_type: 'anomaly_detector',
          cleared: true,
        });
      });
    });

    it('should not mark audit messages as cleared for the user with ML read permissions', async () => {
      const { body, status } = await supertest
        .put(`/api/ml/job_audit_messages/clear_messages`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send({
          jobId: 'test_get_job_audit_messages_2',
          notificationIndices,
        });
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');

      const { body: getBody, status: getStatus } = await supertest
        .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_2`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, getStatus, getBody);

      expect(getBody.messages[0].cleared).to.not.eql(true);
    });

    it('should not mark audit messages as cleared for unauthorized user', async () => {
      const { body, status } = await supertest
        .put(`/api/ml/job_audit_messages/clear_messages`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send({
          jobId: 'test_get_job_audit_messages_2',
          notificationIndices,
        });
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');

      const { body: getBody, status: getStatus } = await supertest
        .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_2`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, getStatus, getBody);

      expect(getBody.messages[0].cleared).to.not.eql(true);
    });
  });
};
