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
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('GET trained_models', () => {
    before(async () => {
      await ml.api.initSavedObjects();
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createTestTrainedModels('regression', 5, true);
    });

    after(async () => {
      await esDeleteAllIndices('user-index_dfa*');
      await ml.testResources.cleanMLSavedObjects();
      await ml.api.cleanMlIndices();
    });

    it('returns all trained models', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      // Created models + system model
      expect(body.length).to.eql(6);
    });

    it('returns trained model by id', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models/dfa_regression_model_n_1`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1);

      const sampleModel = body[0];
      expect(sampleModel.model_id).to.eql('dfa_regression_model_n_1');
    });

    it('returns 404 if requested trained model does not exist', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models/not_existing_model`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(404, status, body);
    });

    it('returns an error for unauthorized user', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models/dfa_regression_model_n_1`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};
