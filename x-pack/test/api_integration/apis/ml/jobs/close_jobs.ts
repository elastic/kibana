/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { JOB_STATE, DATAFEED_STATE } from '../../../../../plugins/ml/common/constants/states';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  async function runCloseJobsRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body, status } = await supertest
      .post('/api/ml/jobs/close_jobs')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  async function startDatafeedsInRealtime() {
    for (const job of testSetupJobConfigs) {
      const datafeedId = `datafeed-${job.job_id}`;
      await ml.api.startDatafeed(datafeedId, { start: '0' });
      await ml.api.waitForDatafeedState(datafeedId, DATAFEED_STATE.STARTED);
    }
  }

  describe('close_jobs', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    beforeEach(async () => {
      for (const job of testSetupJobConfigs) {
        const datafeedId = `datafeed-${job.job_id}`;
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.openAnomalyDetectionJob(job.job_id);
        await ml.api.createDatafeed({
          ...DATAFEED_CONFIG,
          datafeed_id: datafeedId,
          job_id: job.job_id,
        });
      }
    });

    afterEach(async () => {
      for (const job of testSetupJobConfigs) {
        await ml.api.deleteAnomalyDetectionJobES(job.job_id);
      }
      await ml.api.cleanMlIndices();
    });

    it('rejects request for ML Unauthorized user', async () => {
      await startDatafeedsInRealtime();

      const jobIds = [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id];
      const body = await runCloseJobsRequest(USER.ML_UNAUTHORIZED, { jobIds }, 403);

      expect(body).to.have.property('error').eql('Forbidden');

      // ensure jobs are still open
      for (const id of jobIds) {
        await ml.api.waitForJobState(id, JOB_STATE.OPENED);
      }
    });

    it('rejects request for ML Viewer user', async () => {
      await startDatafeedsInRealtime();

      const jobIds = [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id];
      const body = await runCloseJobsRequest(USER.ML_VIEWER, { jobIds }, 403);

      expect(body).to.have.property('error').eql('Forbidden');

      // ensure jobs are still open
      for (const id of jobIds) {
        await ml.api.waitForJobState(id, JOB_STATE.OPENED);
      }
    });

    it('succeeds for ML Poweruser with datafeed started', async () => {
      await startDatafeedsInRealtime();

      const jobIds = [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id];
      const body = await runCloseJobsRequest(USER.ML_POWERUSER, { jobIds }, 200);

      const expectedRspBody = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: { closed: true },
        [MULTI_METRIC_JOB_CONFIG.job_id]: { closed: true },
      };
      const expectedRspJobIds = Object.keys(expectedRspBody).sort((a, b) => a.localeCompare(b));
      const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

      expect(actualRspJobIds).to.have.length(expectedRspJobIds.length);
      expect(actualRspJobIds).to.eql(expectedRspJobIds);

      expectedRspJobIds.forEach((id) => {
        expect(body[id].closed).to.eql(expectedRspBody[id].closed);
      });

      // datafeeds should be stopped automatically
      for (const id of jobIds) {
        await ml.api.waitForDatafeedState(`datafeed-${id}`, DATAFEED_STATE.STOPPED);
      }

      // ensure jobs are actually closed
      for (const id of jobIds) {
        await ml.api.waitForJobState(id, JOB_STATE.CLOSED);
      }
    });

    it('succeeds for ML Poweruser with datafeed stopped', async () => {
      const jobIds = [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id];
      const body = await runCloseJobsRequest(USER.ML_POWERUSER, { jobIds }, 200);

      const expectedRspBody = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: { closed: true },
        [MULTI_METRIC_JOB_CONFIG.job_id]: { closed: true },
      };
      const expectedRspJobIds = Object.keys(expectedRspBody).sort((a, b) => a.localeCompare(b));
      const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

      expect(actualRspJobIds).to.have.length(expectedRspJobIds.length);
      expect(actualRspJobIds).to.eql(expectedRspJobIds);

      expectedRspJobIds.forEach((id) => {
        expect(body[id].closed).to.eql(expectedRspBody[id].closed);
      });

      // datafeeds should still be stopped
      for (const id of jobIds) {
        await ml.api.waitForDatafeedState(`datafeed-${id}`, DATAFEED_STATE.STOPPED);
      }

      // ensure jobs are actually closed
      for (const id of jobIds) {
        await ml.api.waitForJobState(id, JOB_STATE.CLOSED);
      }
    });

    it('succeeds for ML Poweruser with job already closed', async () => {
      const jobIds = [SINGLE_METRIC_JOB_CONFIG.job_id, MULTI_METRIC_JOB_CONFIG.job_id];
      await runCloseJobsRequest(USER.ML_POWERUSER, { jobIds }, 200);

      const body = await runCloseJobsRequest(USER.ML_POWERUSER, { jobIds }, 200);

      const expectedRspBody = {
        [SINGLE_METRIC_JOB_CONFIG.job_id]: { closed: true },
        [MULTI_METRIC_JOB_CONFIG.job_id]: { closed: true },
      };
      const expectedRspJobIds = Object.keys(expectedRspBody).sort((a, b) => a.localeCompare(b));
      const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));

      expect(actualRspJobIds).to.have.length(expectedRspJobIds.length);
      expect(actualRspJobIds).to.eql(expectedRspJobIds);

      expectedRspJobIds.forEach((id) => {
        expect(body[id].closed).to.eql(expectedRspBody[id].closed);
      });

      // datafeeds should still be stopped
      for (const id of jobIds) {
        await ml.api.waitForDatafeedState(`datafeed-${id}`, DATAFEED_STATE.STOPPED);
      }

      // jobs should still be closed
      for (const id of jobIds) {
        await ml.api.waitForJobState(id, JOB_STATE.CLOSED);
      }
    });
  });
};
