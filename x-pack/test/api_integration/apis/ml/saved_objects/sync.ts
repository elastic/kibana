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
import { JobType } from '../../../../../plugins/ml/common/types/saved_objects';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobId1 = 'fq_single_1';
  const adJobId2 = 'fq_single_2';
  const adJobId3 = 'fq_single_3';
  const adJobIdES = 'fq_single_es';
  const idSpace1 = 'space1';

  async function runSyncRequest(user: USER, expectedStatusCode: number) {
    const { body, status } = await supertest
      .get(`/s/${idSpace1}/api/ml/saved_objects/sync`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  async function runSyncCheckRequest(user: USER, jobType: JobType, expectedStatusCode: number) {
    const { body, status } = await supertest
      .post(`/s/${idSpace1}/api/ml/saved_objects/sync_check`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send({ jobType });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

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
      // check to see if a sync is needed
      const syncNeeded = await runSyncCheckRequest(
        USER.ML_POWERUSER_ALL_SPACES,
        'anomaly-detector',
        200
      );
      expect(syncNeeded.result).to.eql(false, 'sync should not be needed');

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

      // check to see if a sync is needed
      const syncNeeded2 = await runSyncCheckRequest(
        USER.ML_POWERUSER_ALL_SPACES,
        'anomaly-detector',
        200
      );
      expect(syncNeeded2.result).to.eql(true, 'sync should be needed');

      // run the sync request and verify the response
      const body = await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.eql({
        datafeedsAdded: { [adJobId2]: { success: true, type: 'anomaly-detector' } },
        datafeedsRemoved: { [adJobId3]: { success: true, type: 'anomaly-detector' } },
        savedObjectsCreated: { [adJobIdES]: { success: true, type: 'anomaly-detector' } },
        savedObjectsDeleted: { [adJobId1]: { success: true, type: 'anomaly-detector' } },
      });
    });

    it('should sync datafeeds after recreation in ES with different name', async () => {
      // check to see if a sync is needed
      const syncNeeded = await runSyncCheckRequest(
        USER.ML_POWERUSER_ALL_SPACES,
        'anomaly-detector',
        200
      );
      expect(syncNeeded.result).to.eql(false, 'sync should not be needed');

      // prepare test data
      const jobConfig1 = ml.commonConfig.getADFqSingleMetricJobConfig(adJobId1);
      await ml.api.createAnomalyDetectionJob(jobConfig1, idSpace1);

      // datafeed should be added with the request
      const datafeedConfig1 = ml.commonConfig.getADFqDatafeedConfig(adJobId1);
      await ml.api.createDatafeedES(datafeedConfig1);

      // check to see if a sync is needed
      const syncNeeded2 = await runSyncCheckRequest(
        USER.ML_POWERUSER_ALL_SPACES,
        'anomaly-detector',
        200
      );
      expect(syncNeeded2.result).to.eql(true, 'sync should be needed');

      // run the sync request and verify the response
      const body = await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      // expect datafeed to be added
      expect(body).to.eql({
        datafeedsAdded: { [adJobId1]: { success: true, type: 'anomaly-detector' } },
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

      // check to see if a sync is needed
      const syncNeeded3 = await runSyncCheckRequest(
        USER.ML_POWERUSER_ALL_SPACES,
        'anomaly-detector',
        200
      );
      expect(syncNeeded3.result).to.eql(true, 'sync should be needed');

      const body2 = await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      // previous datafeed should be removed and new datafeed should be added on sync
      expect(body2).to.eql({
        datafeedsAdded: { [adJobId1]: { success: true, type: 'anomaly-detector' } },
        datafeedsRemoved: {},
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });

      // check to see if a sync is needed
      const syncNeeded4 = await runSyncCheckRequest(
        USER.ML_POWERUSER_ALL_SPACES,
        'anomaly-detector',
        200
      );
      expect(syncNeeded4.result).to.eql(false, 'sync should not be needed');
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

      await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      const body = await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.eql({
        datafeedsAdded: {},
        datafeedsRemoved: {},
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });
    });
  });
};
