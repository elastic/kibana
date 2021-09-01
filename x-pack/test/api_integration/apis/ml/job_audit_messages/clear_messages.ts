/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getJobConfig } from './index';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import expect from '../../../../../../../../../../private/var/tmp/_bazel_darnautov/1afe62330ff0d9ae1ca2013aad33fd76/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/kbn-expect';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('clear_messages', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const jobConfig of getJobConfig(1)) {
        await ml.api.createAnomalyDetectionJob(jobConfig);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should mark audit messages as cleared for provided job', async () => {
      const timestamp = Date.now();

      const { body } = await supertest
        .put(`/api/ml/job_audit_messages/clear_messages`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send({
          jobId: 'test_get_job_audit_messages_1',
          notificationIndices: ['.ml-notifications-000002'],
        })
        .expect(200);

      expect(body.success).to.eql(true);
      expect(body.last_cleared).to.be.above(timestamp);

      const { body: getBody } = await supertest
        .get(`/api/ml/job_audit_messages/messages/test_get_job_audit_messages_1`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(getBody.messages.length).to.eql(1);

      expect(omit(getBody.messages[0], 'timestamp')).to.eql({
        job_id: 'test_get_job_audit_messages_1',
        message: 'Job created',
        level: 'info',
        node_name: 'node-01',
        job_type: 'anomaly_detector',
        cleared: true,
      });
    });

    it('should not mark audit messages as cleared for the user with ML read permissions', async () => {
      const { body } = await supertest
        .put(`/api/ml/job_audit_messages/clear_messages`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send({
          jobId: 'test_get_job_audit_messages_1',
          notificationIndices: ['.ml-notifications-000002'],
        })
        .expect(403);
      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });

    it('should not mark audit messages as cleared for unauthorized user', async () => {
      const { body } = await supertest
        .put(`/api/ml/job_audit_messages/clear_messages`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send({
          jobId: 'test_get_job_audit_messages_1',
          notificationIndices: ['.ml-notifications-000002'],
        })
        .expect(403);
      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });
  });
};
