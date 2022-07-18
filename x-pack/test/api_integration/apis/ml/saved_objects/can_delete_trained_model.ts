/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TrainedModelType } from '@kbn/ml-plugin/common/types/saved_objects';
import { PutTrainedModelConfig } from '@kbn/ml-plugin/common/types/trained_models';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

type ModelType = 'regression' | 'classification';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const modelIdSpace1 = 'dfa1_classification_model_n_0';
  const modelIdStarSpace = 'dfa2_classification_model_n_0';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(
    jobType: TrainedModelType,
    ids: string[],
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .post(
        `${
          space ? `/s/${space}` : ''
        }/api/ml/saved_objects/can_delete_ml_space_aware_item/${jobType}`
      )
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send({ ids });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);
    return body;
  }

  function getTestModel(id: string, modelType: ModelType) {
    return {
      model_id: id,
      body: {
        compressed_definition: ml.api.getCompressedModelDefinition(modelType),
        inference_config: {
          [modelType]: {},
        },
        input: {
          field_names: ['common_field'],
        },
      } as PutTrainedModelConfig,
    };
  }

  describe('POST saved_objects/can_delete_ml_space_aware_item trained models', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const model1 = getTestModel(modelIdSpace1, 'classification');
      const model2 = getTestModel(modelIdStarSpace, 'classification');
      await ml.api.createTrainedModel(model1.model_id, model1.body, idSpace1);
      await ml.api.createTrainedModel(model2.model_id, model2.body, idSpace1);

      await ml.api.updateTrainedModelSpaces(modelIdSpace1, [idSpace2], [], idSpace1);
      await ml.api.assertTrainedModelSpaces(modelIdSpace1, [idSpace1, idSpace2]);

      // mode the model to the * space
      await ml.api.updateTrainedModelSpaces(modelIdStarSpace, ['*'], [idSpace1], idSpace1);
      await ml.api.assertTrainedModelSpaces(modelIdStarSpace, ['*']);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('model in individual spaces, single space user can only untag', async () => {
      const body = await runRequest(
        'trained-model',
        [modelIdSpace1],
        USER.ML_POWERUSER_SPACE1,
        200,
        idSpace1
      );

      expect(body).to.eql({ [modelIdSpace1]: { canDelete: false, canRemoveFromSpace: true } });
    });

    it('model in individual spaces, all spaces user can delete and untag', async () => {
      const body = await runRequest(
        'trained-model',
        [modelIdSpace1],
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      expect(body).to.eql({ [modelIdSpace1]: { canDelete: true, canRemoveFromSpace: true } });
    });

    it('model in * space, single space user can not untag or delete', async () => {
      const body = await runRequest(
        'trained-model',
        [modelIdStarSpace],
        USER.ML_POWERUSER_SPACE1,
        200,
        idSpace1
      );

      expect(body).to.eql({ [modelIdStarSpace]: { canDelete: false, canRemoveFromSpace: false } });
    });

    it('model in * space, all spaces user can delete but not untag', async () => {
      const body = await runRequest(
        'trained-model',
        [modelIdStarSpace],
        USER.ML_POWERUSER_ALL_SPACES,
        200
      );

      expect(body).to.eql({ [modelIdStarSpace]: { canDelete: true, canRemoveFromSpace: false } });
    });
  });
};
