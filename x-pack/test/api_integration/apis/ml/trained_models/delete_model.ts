/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('DELETE trained_models', () => {
    before(async () => {
      await ml.api.initSavedObjects();
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createTestTrainedModels('regression', 2);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('deletes trained model by id', async () => {
      const { body: deleteResponseBody, status: deleteResponseStatus } = await supertest
        .delete(`/api/ml/trained_models/dfa_regression_model_n_0`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, deleteResponseStatus, deleteResponseBody);

      expect(deleteResponseBody).to.eql({ acknowledged: true });

      // verify that model is actually deleted
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_0`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);
    });

    it('returns 404 if requested trained model does not exist', async () => {
      const { body, status } = await supertest
        .delete(`/api/ml/trained_models/not_existing_model`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);
    });

    it('does not allow to delete trained model if the user does not have required permissions', async () => {
      const { body: deleteResponseBody, status: deleteResponseStatus } = await supertest
        .delete(`/api/ml/trained_models/dfa_regression_model_n_1`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, deleteResponseStatus, deleteResponseBody);

      // verify that model has not been deleted
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_1`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);
    });
  });
};
