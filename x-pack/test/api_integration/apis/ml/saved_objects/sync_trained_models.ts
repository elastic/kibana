/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PutTrainedModelConfig } from '../../../../../plugins/ml/common/types/trained_models';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

type ModelType = 'regression' | 'classification';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const dfaJobId1 = 'ihp_od_1';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const modelIdSpace1 = 'dfa1_classification_model_n_0';
  const modelIdSpace2 = 'dfa2_classification_model_n_0';
  const modelIdSpace3 = 'dfa3_classification_model_n_0';

  async function runSyncRequest(user: USER, expectedStatusCode: number) {
    const { body, status } = await supertest
      .get(`/s/${idSpace1}/api/ml/saved_objects/sync`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  async function runSyncCheckRequest(user: USER, expectedStatusCode: number) {
    const { body, status } = await supertest
      .post(`/s/${idSpace1}/api/ml/saved_objects/sync_check`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send({ mlSavedObjectType: 'trained-model' });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  function getTestModel(id: string, modelType: ModelType, jobId?: string) {
    return {
      model_id: id,
      body: {
        compressed_definition: ml.api.getCompressedModelDefinition(modelType),
        inference_config: {
          [modelType]: {},
        },
        ...(jobId ? { metadata: { analytics_config: { id: jobId } } } : {}),
        input: {
          field_names: ['common_field'],
        },
      } as PutTrainedModelConfig,
    };
  }

  describe('GET saved_objects/sync', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
    });

    beforeEach(async () => {
      await ml.api.initSavedObjects();
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    afterEach(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should sync trained model saved objects', async () => {
      // check to see if a sync is needed
      const syncNeeded = await runSyncCheckRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      expect(syncNeeded.result).to.eql(false, 'sync should not be needed');

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId1),
        idSpace1
      );
      await ml.api.updateJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace2], [], idSpace1);
      await ml.api.assertJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace1, idSpace2]);

      // create model in es, so saved object creation is needed
      const model1 = getTestModel(modelIdSpace1, 'classification', dfaJobId1);
      await ml.api.createTrainedModelES(model1.model_id, model1.body);

      // create model via kibana, so saved object creation is not needed
      const model2 = getTestModel(modelIdSpace2, 'classification', dfaJobId1);
      await ml.api.createTrainedModel(model2.model_id, model2.body);

      // create model via kibana, but then delete model in es
      // so saved object needs removal
      const model3 = getTestModel(modelIdSpace3, 'classification', dfaJobId1);
      await ml.api.createTrainedModel(model3.model_id, model3.body);
      await ml.api.deleteTrainedModelES(model3.model_id);

      // check to see if a sync is needed
      const syncNeeded2 = await runSyncCheckRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      expect(syncNeeded2.result).to.eql(true, 'sync should be needed');

      // run the sync request and verify the response
      const body = await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.eql({
        datafeedsAdded: {},
        datafeedsRemoved: {},
        savedObjectsCreated: {
          'trained-model': {
            [modelIdSpace1]: { success: true },
          },
        },
        savedObjectsDeleted: {
          'trained-model': { dfa3_classification_model_n_0: { success: true } },
        },
      });
    });

    it('should not sync anything if all objects are already synced', async () => {
      // check to see if a sync is needed
      const syncNeeded = await runSyncCheckRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      expect(syncNeeded.result).to.eql(false, 'sync should not be needed');

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId1),
        idSpace1
      );
      await ml.api.updateJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace2], [], idSpace1);
      await ml.api.assertJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace1, idSpace2]);

      // create model in es, so saved object creation is needed
      const model1 = getTestModel(modelIdSpace1, 'classification', dfaJobId1);
      await ml.api.createTrainedModelES(model1.model_id, model1.body);

      // create model via kibana, so saved object creation is not needed
      const model2 = getTestModel(modelIdSpace2, 'classification', dfaJobId1);
      await ml.api.createTrainedModel(model2.model_id, model2.body);

      // create model via kibana, but then delete model in es
      // so saved object needs removal
      const model3 = getTestModel(modelIdSpace3, 'classification', dfaJobId1);
      await ml.api.createTrainedModel(model3.model_id, model3.body);
      await ml.api.deleteTrainedModelES(model3.model_id);

      // check to see if a sync is needed
      const syncNeeded2 = await runSyncCheckRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      expect(syncNeeded2.result).to.eql(true, 'sync should be needed');

      // run the sync request and verify the response
      await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      const body = await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.eql({
        datafeedsAdded: {},
        datafeedsRemoved: {},
        savedObjectsCreated: {},
        savedObjectsDeleted: {},
      });
    });

    it('sync should have assigned the correct spaces to saved objects', async () => {
      // check to see if a sync is needed
      const syncNeeded = await runSyncCheckRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      expect(syncNeeded.result).to.eql(false, 'sync should not be needed');

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId1),
        idSpace1
      );
      await ml.api.updateJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace2], [], idSpace1);
      await ml.api.assertJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace1, idSpace2]);

      // create trained model linked to job, it should inherit the jobs spaces
      const model1 = getTestModel(modelIdSpace1, 'classification', dfaJobId1);
      await ml.api.createTrainedModelES(model1.model_id, model1.body);

      // create trained model not linked to job, it should have the current space
      const model2 = getTestModel(modelIdSpace2, 'classification');
      await ml.api.createTrainedModelES(model2.model_id, model2.body);

      // check to see if a sync is needed
      const syncNeeded2 = await runSyncCheckRequest(USER.ML_POWERUSER_ALL_SPACES, 200);
      expect(syncNeeded2.result).to.eql(true, 'sync should be needed');

      // run the sync request and verify the response
      await runSyncRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      await ml.api.assertTrainedModelSpaces(modelIdSpace1, [idSpace1, idSpace2]);
      await ml.api.assertTrainedModelSpaces(modelIdSpace2, [idSpace1]);
    });
  });
};
