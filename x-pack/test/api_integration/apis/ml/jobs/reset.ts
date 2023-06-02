/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ANNOTATION_TYPE } from '@kbn/ml-plugin/common/constants/annotations';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  async function runResetJobsRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number
  ): Promise<any> {
    const { body, status } = await supertest
      .post('/internal/ml/jobs/reset_jobs')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  async function createAnnotation(jobId: string, annotation: string) {
    await ml.api.indexAnnotation({
      timestamp: 1549756524346,
      end_timestamp: 1549766472273,
      annotation,
      job_id: jobId,
      type: ANNOTATION_TYPE.ANNOTATION,
      detector_index: 0,
      event: 'user',
    });
  }

  const expectedResetResponseBody = {
    [SINGLE_METRIC_JOB_CONFIG.job_id]: { reset: true, task: 'cannot be predicted' },
    [MULTI_METRIC_JOB_CONFIG.job_id]: { reset: true, task: 'cannot be predicted' },
  };

  describe('reset_jobs', function () {
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
        const jobId = job.job_id;
        const datafeedId = `datafeed-${jobId}`;
        await ml.api.createAndRunAnomalyDetectionLookbackJob(job, {
          ...DATAFEED_CONFIG,
          datafeed_id: datafeedId,
          job_id: jobId,
        });

        await createAnnotation(jobId, 'test test test');
        await ml.api.assertAnnotationsCount(jobId, 2);
        await ml.api.waitForADJobRecordCount(jobId, 86274);
      }
    });

    afterEach(async () => {
      for (const job of testSetupJobConfigs) {
        await ml.api.deleteAnomalyDetectionJobES(job.job_id);
      }
      await ml.api.cleanMlIndices();
    });

    it('succeeds for ML Poweruser and keeps user annotations', async () => {
      const jobIds = testSetupJobConfigs.map((c) => c.job_id);
      const body = await runResetJobsRequest(USER.ML_POWERUSER, { jobIds }, 200);

      const expectedRspJobIds = Object.keys(expectedResetResponseBody).sort((a, b) =>
        a.localeCompare(b)
      );
      const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));
      expect(actualRspJobIds).to.eql(expectedRspJobIds);

      for (const id of jobIds) {
        expect(body[id].reset).to.eql(expectedResetResponseBody[id].reset);
        // processed record counts are reset to 0
        await ml.api.waitForADJobRecordCount(id, 0);
        // user annotations are not deleted
        await ml.api.assertAnnotationsCount(id, 1);
      }
    });

    it('succeeds for ML Poweruser and deletes user annotations', async () => {
      const jobIds = testSetupJobConfigs.map((c) => c.job_id);
      const body = await runResetJobsRequest(
        USER.ML_POWERUSER,
        { jobIds, deleteUserAnnotations: true },
        200
      );

      const expectedRspJobIds = Object.keys(expectedResetResponseBody).sort((a, b) =>
        a.localeCompare(b)
      );
      const actualRspJobIds = Object.keys(body).sort((a, b) => a.localeCompare(b));
      expect(actualRspJobIds).to.eql(expectedRspJobIds);

      for (const id of jobIds) {
        expect(body[id].reset).to.eql(expectedResetResponseBody[id].reset);
        // processed record counts are reset to 0
        await ml.api.waitForADJobRecordCount(id, 0);
        // user annotations are deleted
        await ml.api.assertAnnotationsCount(id, 0);
      }
    });

    it('fails for ML viewer', async () => {
      const jobIds = testSetupJobConfigs.map((c) => c.job_id);
      await runResetJobsRequest(USER.ML_VIEWER, { jobIds }, 403);
    });
  });
};
