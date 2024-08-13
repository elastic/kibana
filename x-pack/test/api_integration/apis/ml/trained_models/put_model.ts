/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  // FLAKY: https://github.com/elastic/kibana/issues/189637
  describe.skip('PUT trained_models', () => {
    before(async () => {
      await ml.api.initSavedObjects();
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('puts trained model by id', async () => {
      const testModelId = 'dfa_regression_model_n_0';
      const requestBody = ml.api.createTestTrainedModelConfig(testModelId, 'regression').body;

      const { body: putResponseBody, status: putResponseStatus } = await supertest
        .put(`/internal/ml/trained_models/${testModelId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(200, putResponseStatus, putResponseBody);

      expect(omit(putResponseBody, 'create_time')).to.eql({
        model_id: 'dfa_regression_model_n_0',
        model_type: 'tree_ensemble',
        created_by: 'api_user',
        version: '12.0.0',
        model_size_bytes: 304,
        estimated_operations: 1,
        license_level: 'platinum',
        tags: [],
        input: { field_names: ['common_field'] },
        inference_config: {
          regression: { results_field: 'predicted_value', num_top_feature_importance_values: 0 },
        },
      });

      // verify that model is actually created
      const { body: getResponseBody, status: getResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModelId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, getResponseStatus, getResponseBody);
    });

    it('does not allow to put trained model if the user does not have required permissions', async () => {
      const testModelId = 'dfa_regression_model_n_1';
      const requestBody = ml.api.createTestTrainedModelConfig(testModelId, 'regression').body;

      const { body: putResponseBody, status: putResponseStatus } = await supertest
        .put(`/internal/ml/trained_models/${testModelId}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'))
        .send(requestBody);
      ml.api.assertResponseStatusCode(403, putResponseStatus, putResponseBody);

      // verify that model has not been created
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models/${testModelId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(404, status, body);
    });
  });
};
