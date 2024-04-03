/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Group } from '@kbn/ml-plugin/common/types/groups';
import type { UpdateGroupsRequest } from '@kbn/ml-plugin/common/types/job_service';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';
import { SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG } from './common_jobs';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  async function runUpdateGroupsRequest(
    user: USER,
    payload: UpdateGroupsRequest,
    expectedResponsecode: number
  ): Promise<Group[]> {
    const { body, status } = await supertest
      .post('/internal/ml/jobs/update_groups')
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .send(payload)
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedResponsecode, status, body);

    return body;
  }

  const expectedBeforeGroups = [
    {
      id: 'automated',
      jobIds: [MULTI_METRIC_JOB_CONFIG.job_id, SINGLE_METRIC_JOB_CONFIG.job_id],
      calendarIds: [],
    },
    {
      id: 'farequote',
      jobIds: [MULTI_METRIC_JOB_CONFIG.job_id, SINGLE_METRIC_JOB_CONFIG.job_id],
      calendarIds: [],
    },
    { id: 'multi-metric', jobIds: [MULTI_METRIC_JOB_CONFIG.job_id], calendarIds: [] },
    { id: 'single-metric', jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id], calendarIds: [] },
  ];

  const expectedAfterGroups = [
    { id: 'automated', jobIds: [MULTI_METRIC_JOB_CONFIG.job_id], calendarIds: [] },
    { id: 'farequote', jobIds: [MULTI_METRIC_JOB_CONFIG.job_id], calendarIds: [] },
    { id: 'multi-metric', jobIds: [MULTI_METRIC_JOB_CONFIG.job_id], calendarIds: [] },
    { id: 'new_group', jobIds: [SINGLE_METRIC_JOB_CONFIG.job_id], calendarIds: [] },
  ];

  // Failing: See https://github.com/elastic/kibana/issues/161324
  describe.skip('update groups', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();

      for (const job of testSetupJobConfigs) {
        await ml.api.createAnomalyDetectionJob(job);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('returns expected list of groups after update', async () => {
      const beforeGroups = await ml.api.getGroups();
      expect(beforeGroups).to.eql(
        expectedBeforeGroups,
        `response groups list before update should equal the expected groups ${JSON.stringify(
          expectedBeforeGroups
        )}), got ${JSON.stringify(beforeGroups)}`
      );

      const newGroups = {
        jobs: [
          {
            jobId: SINGLE_METRIC_JOB_CONFIG.job_id,
            groups: ['new_group'],
          },
        ],
      };

      await runUpdateGroupsRequest(USER.ML_POWERUSER, newGroups, 200);

      const afterGroups = await ml.api.getGroups();
      expect(afterGroups).to.eql(
        expectedAfterGroups,
        `response groups list after update should equal the expected groups ${JSON.stringify(
          expectedAfterGroups
        )}), got ${JSON.stringify(afterGroups)}`
      );
    });
  });
};
