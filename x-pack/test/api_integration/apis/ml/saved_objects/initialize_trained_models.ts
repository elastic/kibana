/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sortBy } from 'lodash';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { PutTrainedModelConfig } from '../../../../../plugins/ml/common/types/trained_models';

type ModelType = 'regression' | 'classification';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const dfaJobId1 = 'ihp_od_1';
  const dfaJobIdStarSpace = 'ihp_od_2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const modelIdSpace1 = 'dfa1_classification_model_n_0';
  const modelIdSpace2 = 'dfa2_classification_model_n_0';
  const modelIdStarSpace = 'dfa3_classification_model_n_0';

  async function runRequest(user: USER, expectedStatusCode: number) {
    const { body, status } = await supertest
      .get(`/api/ml/saved_objects/initialize`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS);
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

  describe('GET saved_objects/initialize for trained models', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');

      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.initSavedObjects();

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId1),
        idSpace1
      );
      await ml.api.updateJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace2], [], idSpace1);
      await ml.api.assertJobSpaces(dfaJobId1, 'data-frame-analytics', [idSpace1, idSpace2]);

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobIdStarSpace),
        idSpace1
      );

      await ml.api.updateJobSpaces(
        dfaJobIdStarSpace,
        'data-frame-analytics',
        ['*'],
        [idSpace1],
        idSpace1
      );
      await ml.api.assertJobSpaces(dfaJobIdStarSpace, 'data-frame-analytics', ['*']);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should initialize trained models and inherit job spaces', async () => {
      // create trained model linked to job, it should inherit the jobs spaces
      const model = getTestModel(modelIdSpace1, 'classification', dfaJobId1);
      await ml.api.createTrainedModelES(model.model_id, model.body);

      const body = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.have.property('trainedModels');
      expect(sortBy(body.trainedModels, 'id')).to.eql([{ id: modelIdSpace1 }]);
      expect(body).to.have.property('success', true);
      await ml.api.assertTrainedModelSpaces(modelIdSpace1, [idSpace1, idSpace2]);
    });

    it('should initialize trained models and inherit job star spaces', async () => {
      // create trained model linked to job, it should inherit the jobs spaces
      const model = getTestModel(modelIdStarSpace, 'classification', dfaJobIdStarSpace);
      await ml.api.createTrainedModelES(model.model_id, model.body);

      const body = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.have.property('trainedModels');
      expect(sortBy(body.trainedModels, 'id')).to.eql([{ id: modelIdStarSpace }]);
      expect(body).to.have.property('success', true);
      await ml.api.assertTrainedModelSpaces(modelIdStarSpace, ['*']);
    });

    it('should initialize trained models and not inherit spaces', async () => {
      // create trained model not linked to job, it should have the current space
      const model = getTestModel(modelIdSpace2, 'classification');
      await ml.api.createTrainedModelES(model.model_id, model.body);

      const body = await runRequest(USER.ML_POWERUSER_ALL_SPACES, 200);

      expect(body).to.have.property('trainedModels');
      expect(sortBy(body.trainedModels, 'id')).to.eql([{ id: modelIdSpace2 }]);
      expect(body).to.have.property('success', true);
      await ml.api.assertTrainedModelSpaces(modelIdSpace2, ['*']);
    });
  });
};
