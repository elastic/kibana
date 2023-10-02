/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MlSavedObjectType } from '@kbn/ml-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobId = 'fq_single';
  const dfaJobId = 'ihp_od';
  const trainedModelId = 'trained_model';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const defaultSpaceId = 'default';

  async function runRequest(
    requestBody: {
      ids: string[];
      mlSavedObjectType: MlSavedObjectType;
    },
    space: string,
    expectedStatusCode: number,
    user: USER
  ) {
    const { body, status } = await supertest
      .post(`/s/${space}/internal/ml/saved_objects/remove_item_from_current_space`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST saved_objects/remove_item_from_current_space', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');

      // create spaces
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      // create anomaly detection job
      await ml.api.createAnomalyDetectionJob(ml.commonConfig.getADFqSingleMetricJobConfig(adJobId));
      // create data frame analytics job
      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId)
      );
      // Create trained model
      const trainedModelConfig = ml.api.createTestTrainedModelConfig(trainedModelId, 'regression');
      await ml.api.createTrainedModel(trainedModelId, trainedModelConfig.body);

      // reassign spaces for all items
      await ml.api.updateJobSpaces(adJobId, 'anomaly-detector', [idSpace1, idSpace2], []);
      await ml.api.updateJobSpaces(dfaJobId, 'data-frame-analytics', [idSpace1, idSpace2], []);
      await ml.api.updateTrainedModelSpaces(trainedModelId, [idSpace1, idSpace2], []);
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should remove AD job from current space', async () => {
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [
        defaultSpaceId,
        idSpace1,
        idSpace2,
      ]);
      const mlSavedObjectType = 'anomaly-detector';
      const body = await runRequest(
        {
          ids: [adJobId],
          mlSavedObjectType,
        },
        idSpace1,
        200,
        USER.ML_POWERUSER
      );

      expect(body).to.eql({ [adJobId]: { success: true, type: mlSavedObjectType } });
      await ml.api.assertJobSpaces(adJobId, mlSavedObjectType, [defaultSpaceId, idSpace2]);
    });

    it('should remove DFA job from current space', async () => {
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [
        defaultSpaceId,
        idSpace1,
        idSpace2,
      ]);
      const mlSavedObjectType = 'data-frame-analytics';
      const body = await runRequest(
        {
          ids: [dfaJobId],
          mlSavedObjectType,
        },
        idSpace2,
        200,
        USER.ML_POWERUSER
      );

      expect(body).to.eql({ [dfaJobId]: { success: true, type: mlSavedObjectType } });
      await ml.api.assertJobSpaces(dfaJobId, mlSavedObjectType, [defaultSpaceId, idSpace1]);
    });

    it('should remove trained model from current space', async () => {
      await ml.api.assertTrainedModelSpaces(trainedModelId, [defaultSpaceId, idSpace1, idSpace2]);
      const mlSavedObjectType = 'trained-model';
      const body = await runRequest(
        {
          ids: [trainedModelId],
          mlSavedObjectType,
        },
        idSpace2,
        200,
        USER.ML_POWERUSER
      );

      expect(body).to.eql({ [trainedModelId]: { success: true, type: mlSavedObjectType } });
      await ml.api.assertTrainedModelSpaces(trainedModelId, [defaultSpaceId, idSpace1]);
    });
  });
};
