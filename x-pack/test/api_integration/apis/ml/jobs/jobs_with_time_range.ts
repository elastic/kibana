/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Group } from '@kbn/ml-plugin/common/types/groups';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  async function runGetJobsRequest(user: USER, expectedResponsecode: number): Promise<Group[]> {
    const { body, status } = await supertest
      .post('/internal/ml/jobs/jobs_with_time_range')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  const expectedResponse = {
    jobs: [
      {
        id: SINGLE_METRIC_JOB_CONFIG.job_id,
        job_id: SINGLE_METRIC_JOB_CONFIG.job_id,
        groups: ['automated', 'farequote', 'single-metric'],
        isRunning: false,
        isSingleMetricViewerJob: true,
        timeRange: {
          from: 1454803200000,
          to: 1455235194000,
        },
      },
    ],
    jobsMap: {
      [SINGLE_METRIC_JOB_CONFIG.job_id]: ['automated', 'farequote', 'single-metric'],
    },
  };

  describe('jobs with time range', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
      const job = SINGLE_METRIC_JOB_CONFIG;
      const jobId = job.job_id;
      const datafeedId = `datafeed-${jobId}`;
      await ml.api.createAndRunAnomalyDetectionLookbackJob(job, {
        ...DATAFEED_CONFIG,
        datafeed_id: datafeedId,
        job_id: jobId,
      });
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('returns expected list of jobs with correct time range', async () => {
      const response = await runGetJobsRequest(USER.ML_VIEWER, 200);

      expect(response).to.eql(
        expectedResponse,
        `response should equal the expected jobs ${JSON.stringify(expectedResponse)})`
      );
    });
  });
};
