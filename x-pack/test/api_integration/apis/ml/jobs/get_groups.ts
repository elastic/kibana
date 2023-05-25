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
import { MULTI_METRIC_JOB_CONFIG, SINGLE_METRIC_JOB_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

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

  async function runGetGroupsRequest(user: USER, expectedResponsecode: number): Promise<Group[]> {
    const { body, status } = await supertest
      .get('/internal/ml/jobs/groups')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  const expectedGroups = [
    {
      id: 'automated',
      jobIds: [MULTI_METRIC_JOB_CONFIG.job_id, SINGLE_METRIC_JOB_CONFIG.job_id],
      calendarIds: [],
    },
    {
      id: 'brand-new-group',
      jobIds: [],
      calendarIds: ['test_get_cal_3'],
    },
    {
      id: 'farequote',
      jobIds: [MULTI_METRIC_JOB_CONFIG.job_id, SINGLE_METRIC_JOB_CONFIG.job_id],
      calendarIds: [],
    },
    {
      id: 'multi-metric',
      jobIds: [MULTI_METRIC_JOB_CONFIG.job_id],
      calendarIds: ['test_get_cal_1', 'test_get_cal_2'],
    },
    {
      id: 'single-metric',
      jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id],
      calendarIds: [],
    },
  ];

  describe('get groups', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const job of testSetupJobConfigs) {
        await ml.api.createAnomalyDetectionJob(job);
      }

      for (const cal of testCalendarsConfigs) {
        await ml.api.createCalendar(cal.calendar_id, cal);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('returns expected list of groups', async () => {
      const groups = await runGetGroupsRequest(USER.ML_VIEWER, 200);
      expect(groups).to.eql(
        expectedGroups,
        `response groups list should equal the expected groups ${JSON.stringify(expectedGroups)})`
      );
    });
  });
};
