/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CombinedJobWithStats } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG, DATAFEED_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const idSpace1 = 'space1';

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  const testSetupJobConfigsWithSpace = [
    { ...SINGLE_METRIC_JOB_CONFIG, job_id: `${SINGLE_METRIC_JOB_CONFIG.job_id}-${idSpace1}` },
  ];

  const testCalendarsConfigs = [
    {
      calendar_id: `test_get_cal_1`,
      job_ids: ['multi-metric'],
      description: `Test calendar 1`,
    },
    {
      calendar_id: `test_get_cal_2`,
      job_ids: [MULTI_METRIC_JOB_CONFIG.job_id, 'multi-metric'],
      description: `Test calendar 2`,
    },
    {
      calendar_id: `test_get_cal_3`,
      job_ids: ['brand-new-group'],
      description: `Test calendar 3`,
    },
  ];

  async function runGetJobsRequest(
    user: USER,
    requestBody: object,
    expectedResponsecode: number,
    space?: string
  ): Promise<CombinedJobWithStats[]> {
    const path =
      space === undefined ? '/internal/ml/jobs/jobs' : `/s/${space}/internal/ml/jobs/jobs`;
    const { body, status } = await supertest
      .post(path)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  const expectedJobProperties = [
    {
      jobId: MULTI_METRIC_JOB_CONFIG.job_id,
      datafeedId: `datafeed-${MULTI_METRIC_JOB_CONFIG.job_id}`,
      calendarIds: ['test_get_cal_1', 'test_get_cal_2'],
      groups: ['farequote', 'automated', 'multi-metric'],
      modelBytes: 0,
      datafeedTotalSearchTimeMs: 0,
    },
    {
      jobId: SINGLE_METRIC_JOB_CONFIG.job_id,
      datafeedId: `datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}`,
      calendarIds: undefined,
      groups: ['farequote', 'automated', 'single-metric'],
      modelBytes: 0,
      datafeedTotalSearchTimeMs: 0,
    },
  ];

  const expectedJobPropertiesWithSpace = [
    {
      jobId: `${SINGLE_METRIC_JOB_CONFIG.job_id}-${idSpace1}`,
      datafeedId: `datafeed-${SINGLE_METRIC_JOB_CONFIG.job_id}-${idSpace1}`,
      calendarIds: undefined,
      groups: ['farequote', 'automated', 'single-metric'],
      modelBytes: 0,
      datafeedTotalSearchTimeMs: 0,
    },
  ];

  describe('get combined jobs with stats', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const job of testSetupJobConfigs) {
        await ml.api.createAnomalyDetectionJob(job);
        await ml.api.createDatafeed({
          ...DATAFEED_CONFIG,
          datafeed_id: `datafeed-${job.job_id}`,
          job_id: job.job_id,
        });
      }

      for (const job of testSetupJobConfigsWithSpace) {
        await ml.api.createAnomalyDetectionJob(job, idSpace1);
        await ml.api.createDatafeed(
          {
            ...DATAFEED_CONFIG,
            datafeed_id: `datafeed-${job.job_id}`,
            job_id: job.job_id,
          },
          idSpace1
        );
      }

      for (const cal of testCalendarsConfigs) {
        await ml.api.createCalendar(cal.calendar_id, cal);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('returns expected list of combined jobs with stats in default space', async () => {
      const jobs = await runGetJobsRequest(USER.ML_VIEWER, {}, 200);

      expect(jobs.length).to.eql(
        testSetupJobConfigs.length,
        `number of jobs in default space should be ${testSetupJobConfigs.length})`
      );

      jobs.forEach((job, i) => {
        expect(job.job_id).to.eql(
          expectedJobProperties[i].jobId,
          `job id should be equal to ${JSON.stringify(expectedJobProperties[i].jobId)})`
        );
        expect(job.datafeed_config.datafeed_id).to.eql(
          expectedJobProperties[i].datafeedId,
          `datafeed id should be equal to ${JSON.stringify(expectedJobProperties[i].datafeedId)})`
        );
        expect(job.calendars).to.eql(
          expectedJobProperties[i].calendarIds,
          `calendars should be equal to ${JSON.stringify(expectedJobProperties[i].calendarIds)})`
        );
        expect(job.groups).to.eql(
          expectedJobProperties[i].groups,
          `groups should be equal to ${JSON.stringify(expectedJobProperties[i].groups)})`
        );
        expect(job.model_size_stats.model_bytes).to.eql(
          expectedJobProperties[i].modelBytes,
          `model_bytes should be equal to ${JSON.stringify(expectedJobProperties[i].modelBytes)})`
        );
        expect(job.datafeed_config.timing_stats.total_search_time_ms).to.eql(
          expectedJobProperties[i].datafeedTotalSearchTimeMs,
          `datafeed total_search_time_ms should be equal to ${JSON.stringify(
            expectedJobProperties[i].datafeedTotalSearchTimeMs
          )})`
        );
      });
    });

    it('returns expected list of combined jobs with stats in specified space', async () => {
      const jobs = await runGetJobsRequest(USER.ML_VIEWER, {}, 200, idSpace1);

      expect(jobs.length).to.eql(
        testSetupJobConfigsWithSpace.length,
        `number of jobs in default space should be ${testSetupJobConfigsWithSpace.length})`
      );

      jobs.forEach((job, i) => {
        expect(job.job_id).to.eql(
          expectedJobPropertiesWithSpace[i].jobId,
          `job id should be equal to ${JSON.stringify(expectedJobPropertiesWithSpace[i].jobId)})`
        );
        expect(job.datafeed_config.datafeed_id).to.eql(
          expectedJobPropertiesWithSpace[i].datafeedId,
          `datafeed id should be equal to ${JSON.stringify(
            expectedJobPropertiesWithSpace[i].datafeedId
          )})`
        );
        expect(job.calendars).to.eql(
          expectedJobPropertiesWithSpace[i].calendarIds,
          `calendars should be equal to ${JSON.stringify(
            expectedJobPropertiesWithSpace[i].calendarIds
          )})`
        );
        expect(job.groups).to.eql(
          expectedJobPropertiesWithSpace[i].groups,
          `groups should be equal to ${JSON.stringify(expectedJobPropertiesWithSpace[i].groups)})`
        );
        expect(job.model_size_stats.model_bytes).to.eql(
          expectedJobPropertiesWithSpace[i].modelBytes,
          `model_bytes should be equal to ${JSON.stringify(
            expectedJobPropertiesWithSpace[i].modelBytes
          )})`
        );
        expect(job.datafeed_config.timing_stats.total_search_time_ms).to.eql(
          expectedJobPropertiesWithSpace[i].datafeedTotalSearchTimeMs,
          `datafeed total_search_time_ms should be equal to ${JSON.stringify(
            expectedJobPropertiesWithSpace[i].datafeedTotalSearchTimeMs
          )})`
        );
      });
    });
  });
};
