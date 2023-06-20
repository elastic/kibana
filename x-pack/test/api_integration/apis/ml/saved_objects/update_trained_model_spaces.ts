/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const trainedModelId = 'trained_model';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const defaultSpaceId = 'default';

  async function runRequest(
    requestBody: {
      modelIds: string[];
      spacesToAdd: string[];
      spacesToRemove: string[];
    },
    expectedStatusCode: number,
    user: USER
  ) {
    const { body, status } = await supertest
      .post(`/internal/ml/saved_objects/update_trained_models_spaces`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST saved_objects/update_trained_models_spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      // Create trained model
      const trainedModelConfig = ml.api.createTestTrainedModelConfig(trainedModelId, 'regression');
      await ml.api.createTrainedModel(trainedModelId, trainedModelConfig.body);
    });

    afterEach(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('should assign trained model to space for user with access to that space', async () => {
      await ml.api.assertTrainedModelSpaces(trainedModelId, [defaultSpaceId]);
      const body = await runRequest(
        {
          modelIds: [trainedModelId],
          spacesToAdd: [idSpace1],
          spacesToRemove: [defaultSpaceId],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body).to.eql({ [trainedModelId]: { type: 'trained-model', success: true } });
      await ml.api.assertTrainedModelSpaces(trainedModelId, [idSpace1]);
    });

    it('should fail to update trained model spaces for space the user has no access to', async () => {
      await ml.api.assertTrainedModelSpaces(trainedModelId, [defaultSpaceId]);
      const body = await runRequest(
        {
          modelIds: [trainedModelId],
          spacesToAdd: [idSpace2],
          spacesToRemove: [],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body[trainedModelId]).to.have.property('success', false);
      await ml.api.assertTrainedModelSpaces(trainedModelId, [defaultSpaceId]);
    });
  });
};
