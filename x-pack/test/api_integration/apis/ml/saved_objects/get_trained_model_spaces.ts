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

  const trainedModelIdSpace1 = 'trained_model_single_space1';
  const trainedModelIdSpace2 = 'trained_model_single_space2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const langIdent = 'lang_ident_model_1';

  async function runRequest(expectedStatusCode: number, user: USER) {
    const { body, status } = await supertest
      .get(`/internal/ml/saved_objects/trained_models_spaces`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));

    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET saved_objects/trained_models_spaces', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();

      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const trainedModelConfig1 = ml.api.createTestTrainedModelConfig(
        trainedModelIdSpace1,
        'regression'
      );
      await ml.api.createTrainedModel(trainedModelIdSpace1, trainedModelConfig1.body, idSpace1);

      const trainedModelConfig2 = ml.api.createTestTrainedModelConfig(
        trainedModelIdSpace2,
        'regression'
      );
      await ml.api.createTrainedModel(trainedModelIdSpace2, trainedModelConfig2.body, idSpace2);
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should list all trained models for user with access to all spaces', async () => {
      const body = await runRequest(200, USER.ML_VIEWER_ALL_SPACES);

      expect(body).to.have.property('trainedModels');
      expect(body.trainedModels).to.eql({
        [langIdent]: ['*'],
        [trainedModelIdSpace1]: [idSpace1],
        [trainedModelIdSpace2]: [idSpace2],
      });
    });

    it('should only list trained models for the space the user has access to', async () => {
      const body = await runRequest(200, USER.ML_VIEWER_SPACE1);

      expect(body).to.have.property('trainedModels');
      expect(body.trainedModels).to.eql({
        [langIdent]: ['*'],
        [trainedModelIdSpace1]: [idSpace1],
      });
    });
  });
};
