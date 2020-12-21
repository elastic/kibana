/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'ihp_od_space1';
  const jobId2Space1 = 'ihp_od_space1_2';
  const jobIdSpace2 = 'ihp_od_space2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(
    space: string,
    expectedStatusCode: number,
    requestStats: boolean,
    jobId?: string
  ) {
    const { body } = await supertest
      .get(
        `/s/${space}/api/ml/data_frame/analytics${jobId ? `/${jobId}` : ''}${
          requestStats ? '/_stats' : ''
        }`
      )
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .expect(expectedStatusCode);

    return body;
  }

  describe('GET data_frame/analytics with spaces', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ihp_outlier');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const jobConfigSpace1 = ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(jobIdSpace1);
      await ml.api.createDataFrameAnalyticsJob(jobConfigSpace1, idSpace1);

      const jobConfig2Space1 = ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(jobId2Space1);
      await ml.api.createDataFrameAnalyticsJob(jobConfig2Space1, idSpace1);

      const jobConfigSpace2 = ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(jobIdSpace2);
      await ml.api.createDataFrameAnalyticsJob(jobConfigSpace2, idSpace2);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should only list jobs from same space', async () => {
      const body = await runRequest(idSpace1, 200, false, '');

      expect(body.count).to.eql(2);
      expect(body.data_frame_analytics.length).to.eql(2);
      expect(body.data_frame_analytics[0].id).to.eql(jobIdSpace1);
      expect(body.data_frame_analytics[1].id).to.eql(jobId2Space1);
    });

    it('should only list jobs stats from same space', async () => {
      const body = await runRequest(idSpace1, 200, true, '');

      expect(body.count).to.eql(2);
      expect(body.data_frame_analytics.length).to.eql(2);
      expect(body.data_frame_analytics[0].id).to.eql(jobIdSpace1);
      expect(body.data_frame_analytics[0]).to.have.keys(
        'id',
        'state',
        'progress',
        'data_counts',
        'memory_usage'
      );
      expect(body.data_frame_analytics[1].id).to.eql(jobId2Space1);
      expect(body.data_frame_analytics[1]).to.have.keys(
        'id',
        'state',
        'progress',
        'data_counts',
        'memory_usage'
      );
    });

    it('should list job by job id from same space', async () => {
      const body = await runRequest(idSpace1, 200, false, jobIdSpace1);

      expect(body.count).to.eql(1);
      expect(body.data_frame_analytics.length).to.eql(1);
      expect(body.data_frame_analytics[0].id).to.eql(jobIdSpace1);
    });

    it('should list job stats by job id from same space', async () => {
      const body = await runRequest(idSpace1, 200, true, jobIdSpace1);

      expect(body.count).to.eql(1);
      expect(body.data_frame_analytics.length).to.eql(1);
      expect(body.data_frame_analytics[0].id).to.eql(jobIdSpace1);
      expect(body.data_frame_analytics[0]).to.have.keys(
        'id',
        'state',
        'progress',
        'data_counts',
        'memory_usage'
      );
    });

    it('should fail to list job by job id from different space', async () => {
      await runRequest(idSpace2, 404, false, jobIdSpace1);
    });

    it('should fail to list job stats by job id from different space', async () => {
      await runRequest(idSpace2, 404, true, jobIdSpace1);
    });

    it('should fail to list jobs by job ids if one of them is in a different space', async () => {
      await runRequest(idSpace1, 404, false, `${jobIdSpace1},${jobIdSpace2}`);
    });

    it('should fail to list jobs stats by job ids if one of them is in a different space', async () => {
      await runRequest(idSpace1, 404, true, `${jobIdSpace1},${jobIdSpace2}`);
    });
  });
};
