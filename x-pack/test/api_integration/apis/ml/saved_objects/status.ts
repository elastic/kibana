/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobIdSpace1 = 'fq_single_space1';
  const adJobIdSpace2 = 'fq_single_space2';
  const dfaJobIdSpace1 = 'ihp_od_space1';
  const dfaJobIdSpace2 = 'ihp_od_space2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(expectedStatusCode: number) {
    const { body, status } = await supertest
      .get(`/api/ml/saved_objects/status`)
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET saved_objects/status', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace1),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace2),
        idSpace2
      );

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobIdSpace1),
        idSpace1
      );
      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobIdSpace2),
        idSpace2
      );

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should list jobs and saved objects', async () => {
      const body = await runRequest(200);

      // validate jobs section in response
      expect(body).to.have.property('jobs');

      expect(body.jobs).to.have.property('anomaly-detector');
      expect(sortBy(body.jobs['anomaly-detector'], 'jobId')).to.eql([
        {
          checks: { savedObjectExits: true },
          datafeedId: null,
          jobId: adJobIdSpace1,
        },
        {
          checks: { savedObjectExits: true },
          datafeedId: null,
          jobId: adJobIdSpace2,
        },
      ]);

      expect(body.jobs).to.have.property('data-frame-analytics');
      expect(sortBy(body.jobs['data-frame-analytics'], 'jobId')).to.eql([
        {
          checks: { savedObjectExits: true },
          datafeedId: null,
          jobId: dfaJobIdSpace1,
        },
        {
          checks: { savedObjectExits: true },
          datafeedId: null,
          jobId: dfaJobIdSpace2,
        },
      ]);

      // validate savedObjects section in response
      expect(body).to.have.property('savedObjects');

      expect(body.savedObjects).to.have.property('anomaly-detector');
      expect(sortBy(body.savedObjects['anomaly-detector'], 'jobId')).to.eql([
        {
          checks: { datafeedExists: false, jobExists: true },
          datafeedId: null,
          jobId: adJobIdSpace1,
          namespaces: [idSpace1],
          type: 'anomaly-detector',
        },
        {
          checks: { datafeedExists: false, jobExists: true },
          datafeedId: null,
          jobId: adJobIdSpace2,
          namespaces: [idSpace2],
          type: 'anomaly-detector',
        },
      ]);

      expect(body.savedObjects).to.have.property('data-frame-analytics');
      expect(sortBy(body.savedObjects['data-frame-analytics'], 'jobId')).to.eql([
        {
          checks: { jobExists: true },
          jobId: dfaJobIdSpace1,
          namespaces: [idSpace1],
          type: 'data-frame-analytics',
        },
        {
          checks: { jobExists: true },
          jobId: dfaJobIdSpace2,
          namespaces: [idSpace2],
          type: 'data-frame-analytics',
        },
      ]);
    });
  });
};
