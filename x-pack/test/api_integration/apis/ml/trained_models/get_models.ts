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
    let testModelIds: string[] = [];

    before(async () => {
      await ml.api.initSavedObjects();
      await ml.testResources.setKibanaTimeZoneToUTC();
      testModelIds = await ml.api.createTestTrainedModels('regression', 5, true);
      await ml.api.createModelAlias('dfa_regression_model_n_0', 'dfa_regression_model_alias');
      await ml.api.createIngestPipeline('dfa_regression_model_alias');

      // Creating an indices that are tied to modelId: dfa_regression_model_n_1
      await ml.api.createIndex(`user-index_dfa_regression_model_n_1`, undefined, {
        index: { default_pipeline: `pipeline_dfa_regression_model_n_1` },
      });
    });

    after(async () => {
      await esDeleteAllIndices('user-index_dfa*');

      // delete created ingest pipelines
      await Promise.all(
        ['dfa_regression_model_alias', ...testModelIds].map((modelId) =>
          ml.api.deleteIngestPipeline(modelId)
        )
      );
      await ml.testResources.cleanMLSavedObjects();
      await ml.api.cleanMlIndices();
    });

    it('returns all trained models with associated pipelines including aliases', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models?with_pipelines=true`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      // Created models + system model
      expect(body.length).to.eql(6);

      const sampleModel = body.find((v: any) => v.model_id === 'dfa_regression_model_n_0');

      expect(Object.keys(sampleModel.pipelines).length).to.eql(2);
    });

    it('returns models without pipeline in case user does not have required permission', async () => {
      const { body, status } = await supertest
        .get(`/internal/ml/trained_models?with_pipelines=true&with_indices=true`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      // Created models + system model
      expect(body.length).to.eql(6);
      const sampleModel = body.find((v: any) => v.model_id === 'dfa_regression_model_n_0');

      expect(sampleModel.pipelines).to.eql(undefined);
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
      expect(sampleModel.pipelines).to.eql(undefined);
      expect(sampleModel.indices).to.eql(undefined);
    });

    it('returns trained model by id with_pipelines=true,with_indices=false', async () => {
      const { body, status } = await supertest
        .get(
          `/internal/ml/trained_models/dfa_regression_model_n_1?with_pipelines=true&with_indices=false`
        )
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1);
      const sampleModel = body[0];

      expect(sampleModel.model_id).to.eql('dfa_regression_model_n_1');
      expect(Object.keys(sampleModel.pipelines).length).to.eql(
        1,
        `Expected number of pipelines for dfa_regression_model_n_1 to be ${1} (got ${
          Object.keys(sampleModel.pipelines).length
        })`
      );
      expect(sampleModel.indices).to.eql(
        undefined,
        `Expected indices for dfa_regression_model_n_1 to be undefined (got ${sampleModel.indices})`
      );
    });

    it('returns trained model by id with_pipelines=true,with_indices=true', async () => {
      const { body, status } = await supertest
        .get(
          `/internal/ml/trained_models/dfa_regression_model_n_1?with_pipelines=true&with_indices=true`
        )
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, status, body);

      const sampleModel = body[0];
      expect(sampleModel.model_id).to.eql('dfa_regression_model_n_1');
      expect(Object.keys(sampleModel.pipelines).length).to.eql(
        1,
        `Expected number of pipelines for dfa_regression_model_n_1 to be ${1} (got ${
          Object.keys(sampleModel.pipelines).length
        })`
      );
      expect(sampleModel.indices.length).to.eql(
        1,
        `Expected number of indices for dfa_regression_model_n_1 to be ${1} (got ${
          sampleModel.indices.length
        })`
      );
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
