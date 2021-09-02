/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit, keyBy } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { getJobConfig } from './index';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('get_job_audit_messages', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const jobConfig of getJobConfig(2)) {
        await ml.api.createAnomalyDetectionJob(jobConfig);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should fetch all audit messages', async () => {
      const { body } = await supertest
        .get(`/api/ml/job_audit_messages/messages`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body.messages.length).to.eql(2);

      const messagesDict = keyBy(body.messages, 'job_id');

      expect(omit(messagesDict.test_get_job_audit_messages_2, 'timestamp')).to.eql({
        job_id: 'test_get_job_audit_messages_2',
        message: 'Job created',
        level: 'info',
        node_name: 'node-01',
        job_type: 'anomaly_detector',
      });
      expect(omit(messagesDict.test_get_job_audit_messages_1, 'timestamp')).to.eql({
        job_id: 'test_get_job_audit_messages_1',
        message: 'Job created',
        level: 'info',
        node_name: 'node-01',
        job_type: 'anomaly_detector',
      });
      expect(body.notificationIndices).to.eql(['.ml-notifications-000002']);
    });

    it('should fetch audit messages for specified job', async () => {
      const { body } = await supertest
        .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_1`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body.messages.length).to.eql(1);
      expect(omit(body.messages[0], 'timestamp')).to.eql({
        job_id: 'test_get_job_audit_messages_1',
        message: 'Job created',
        level: 'info',
        node_name: 'node-01',
        job_type: 'anomaly_detector',
      });
      expect(body.notificationIndices).to.eql(['.ml-notifications-000002']);
    });

    it('should fetch audit messages for user with ML read permissions', async () => {
      const { body } = await supertest
        .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_1`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body.messages.length).to.eql(1);
      expect(omit(body.messages[0], 'timestamp')).to.eql({
        job_id: 'test_get_job_audit_messages_1',
        message: 'Job created',
        level: 'info',
        node_name: 'node-01',
        job_type: 'anomaly_detector',
      });
      expect(body.notificationIndices).to.eql(['.ml-notifications-000002']);
    });

    it('should not allow to fetch audit messages for unauthorized user', async () => {
      const { body } = await supertest
        .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_1`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .expect(403);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });
  });
};
