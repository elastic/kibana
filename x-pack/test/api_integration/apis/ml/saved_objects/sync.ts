/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cloneDeep } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobId1 = 'fq_single_1';
  const adJobId2 = 'fq_single_2';
  const adJobId3 = 'fq_single_3';
  const adJobIdES = 'fq_single_es';
  const idSpace1 = 'space1';

  async function runRequest(user: USER, expectedStatusCode: number) {
    const { body } = await supertest
      .get(`/s/${idSpace1}/api/ml/saved_objects/sync`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .expect(expectedStatusCode);

    return body;
  }

  describe('GET saved_objects/sync', () => {
    beforeEach(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    afterEach(async () => {
      await spacesService.delete(idSpace1);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should sync datafeeds and saved objects', async () => {
      // prepare test data
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId1),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId2),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId3),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJobES(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdES)
      );

      // datafeed should be added with the request
      const datafeedConfig2 = ml.commonConfig.getADFqDatafeedConfig(adJobId2);
      await ml.api.createDatafeedES(datafeedConfig2);

      // left-over datafeed entry should be removed with the request
      const datafeedConfig3 = ml.commonConfig.getADFqDatafeedConfig(adJobId3);
      await ml.api.createDatafeed(datafeedConfig3, idSpace1);
      await ml.api.deleteDatafeedES(datafeedConfig3.datafeed_id);

      // corresponding saved object should be created with the request
      await ml.api.assertJobSpaces(adJobIdES, 'anomaly-detector', []);

      // left-over saved object should be removed with the request
      await ml.api.deleteAnomalyDetectionJobES(adJobId1);

      // run the sync request and verify the response
      const body = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.eql({
        datafeedsAdded: { [adJobId2]: { success: true } },
        datafeedsRemoved: { [adJobId3]: { success: true } },
        savedObjectsCreated: { [adJobIdES]: { success: true } },
        savedObjectsDeleted: { [adJobId1]: { success: true } },
      });
    });

    it('should sync datafeeds after recreation in ES with different name', async () => {
      // prepare test data
      const jobConfig1 = ml.commonConfig.getADFqSingleMetricJobConfig(adJobId1);
      await ml.api.createAnomalyDetectionJob(jobConfig1, idSpace1);

      // datafeed should be added with the request
      const datafeedConfig1 = ml.commonConfig.getADFqDatafeedConfig(adJobId1);
      await ml.api.createDatafeedES(datafeedConfig1);

      // run the sync request and verify the response
      const body = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      // expect datafeed to be added
      expect(body).to.eql({
        datafeedsAdded: { [adJobId1]: { success: true } },
        datafeedsRemoved: {},
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });

      // delete the datafeed but do not sync
      await ml.api.deleteDatafeedES(datafeedConfig1.datafeed_id);

      // create a new datafeed with a different id
      const datafeedConfig2 = cloneDeep(datafeedConfig1);
      datafeedConfig2.datafeed_id = `different_${datafeedConfig2.datafeed_id}`;
      await ml.api.createDatafeedES(datafeedConfig2);

      const body2 = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      // previous datafeed should be removed on first sync
      expect(body2).to.eql({
        datafeedsAdded: {},
        datafeedsRemoved: { [adJobId1]: { success: true } },
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });

      const body3 = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      // new datafeed will be added on second sync
      expect(body3).to.eql({
        datafeedsAdded: { [adJobId1]: { success: true } },
        datafeedsRemoved: {},
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });
    });

    it('should not sync anything if all objects are already synced', async () => {
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId1),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId2),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId3),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJobES(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdES)
      );

      await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      const body = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.eql({
        datafeedsAdded: {},
        datafeedsRemoved: {},
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });
    });
  });
};
