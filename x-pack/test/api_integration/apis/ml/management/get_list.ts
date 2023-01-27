/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { MlSavedObjectType } from '@kbn/ml-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobIdSpace1s1 = 'fq_single_space1s1';
  const adJobIdSpace2s1 = 'fq_single_space2s1';
  const adJobIdSpace3s2 = 'fq_single_space3s2';
  const dfaJobIdSpace1s1 = 'dfa_single_space1s1';
  const dfaJobIdSpace2s1 = 'dfa_single_space2s1';
  const dfaJobIdSpace3s2 = 'dfa_single_space3s2';
  const trainedModelIdSpace1s1 = 'trained_model_space1s1';
  const trainedModelIdSpace2s1 = 'trained_model_space2s1';
  const trainedModelIdSpace3s2 = 'trained_model_space3s2';
  const idSpace1 = `space1-${Date.now()}`;
  const idSpace2 = `space2-${Date.now()}`;

  async function runRequest(listType: MlSavedObjectType, space?: string) {
    const { body, status } = await supertest
      .get(`${space ? `/s/${space}` : ''}/api/ml/management/list/${listType}`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(200, status, body);

    return body;
  }

  describe('get management list', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.initSavedObjects();

      // Create AD jobs
      const jobConfig1 = ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace1s1);
      await ml.api.createAnomalyDetectionJob(jobConfig1, idSpace1);
      const jobConfig2 = ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace2s1);
      await ml.api.createAnomalyDetectionJob(jobConfig2, idSpace1);
      const jobConfig3 = ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace3s2);
      await ml.api.createAnomalyDetectionJob(jobConfig3, idSpace2);

      // Create DFA jobs
      const dfaConfig1 = ml.commonConfig.getDFABmClassificationJobConfig(dfaJobIdSpace1s1);
      await ml.api.createDataFrameAnalyticsJob(dfaConfig1, idSpace1);
      const dfaConfig2 = ml.commonConfig.getDFABmClassificationJobConfig(dfaJobIdSpace2s1);
      await ml.api.createDataFrameAnalyticsJob(dfaConfig2, idSpace1);
      const dfaConfig3 = ml.commonConfig.getDFABmClassificationJobConfig(dfaJobIdSpace3s2);
      await ml.api.createDataFrameAnalyticsJob(dfaConfig3, idSpace2);

      // Create trained models
      const trainedModelConfig1 = await ml.api.createTestTrainedModelConfig(
        trainedModelIdSpace1s1,
        'regression'
      );
      await ml.api.createTrainedModel(trainedModelIdSpace1s1, trainedModelConfig1.body, idSpace1);
      const trainedModelConfig2 = await ml.api.createTestTrainedModelConfig(
        trainedModelIdSpace2s1,
        'regression'
      );
      await ml.api.createTrainedModel(trainedModelIdSpace2s1, trainedModelConfig2.body, idSpace1);
      const trainedModelConfig3 = await ml.api.createTestTrainedModelConfig(
        trainedModelIdSpace3s2,
        'regression'
      );
      await ml.api.createTrainedModel(trainedModelIdSpace3s2, trainedModelConfig3.body, idSpace2);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it(`should get AD jobs for space ${idSpace1}`, async () => {
      const resp = await runRequest('anomaly-detector', idSpace1);

      const expectedResponse = [
        {
          id: adJobIdSpace1s1,
          description: 'mean(responsetime) on farequote dataset with 15m bucket span',
          jobState: 'closed',
          datafeedState: '',
          spaces: [idSpace1],
        },
        {
          id: adJobIdSpace2s1,
          description: 'mean(responsetime) on farequote dataset with 15m bucket span',
          jobState: 'closed',
          datafeedState: '',
          spaces: [idSpace1],
        },
      ];

      expect(resp).to.eql(
        expectedResponse,
        `Response for space ${idSpace1} should be ${JSON.stringify(
          expectedResponse
        )} entries (got ${JSON.stringify(resp)})`
      );
    });

    it(`should get AD jobs for space ${idSpace2}`, async () => {
      const resp = await runRequest('anomaly-detector', idSpace2);

      const expectedResponse = [
        {
          id: adJobIdSpace3s2,
          description: 'mean(responsetime) on farequote dataset with 15m bucket span',
          jobState: 'closed',
          datafeedState: '',
          spaces: [idSpace2],
        },
      ];

      expect(resp).to.eql(
        expectedResponse,
        `Response for space ${idSpace1} should be ${JSON.stringify(
          expectedResponse
        )} entries (got ${JSON.stringify(resp)})`
      );
    });

    it(`should get DFA jobs for space ${idSpace1}`, async () => {
      const resp = await runRequest('data-frame-analytics', idSpace1);

      const expectedResponse = [
        {
          id: dfaJobIdSpace1s1,
          description: 'Classification job based on the bank marketing dataset',
          source_index: ['ft_bank_marketing'],
          dest_index: `user-${dfaJobIdSpace1s1}`,
          job_type: 'classification',
          state: 'stopped',
          spaces: [idSpace1],
        },
        {
          id: dfaJobIdSpace2s1,
          description: 'Classification job based on the bank marketing dataset',
          source_index: ['ft_bank_marketing'],
          dest_index: `user-${dfaJobIdSpace2s1}`,
          job_type: 'classification',
          state: 'stopped',
          spaces: [idSpace1],
        },
      ];
      expect(resp).to.eql(
        expectedResponse,
        `Response for space ${idSpace1} should be ${JSON.stringify(
          expectedResponse
        )} entries (got ${JSON.stringify(resp)})`
      );
    });

    it(`should get DFA jobs for space ${idSpace2}`, async () => {
      const resp = await runRequest('data-frame-analytics', idSpace2);

      const expectedResponse = [
        {
          id: dfaJobIdSpace3s2,
          description: 'Classification job based on the bank marketing dataset',
          source_index: ['ft_bank_marketing'],
          dest_index: `user-${dfaJobIdSpace3s2}`,
          job_type: 'classification',
          state: 'stopped',
          spaces: [idSpace2],
        },
      ];
      expect(resp).to.eql(
        expectedResponse,
        `Response for space ${idSpace1} should be ${JSON.stringify(
          expectedResponse
        )} entries (got ${JSON.stringify(resp)})`
      );
    });

    it(`should get trained models for space ${idSpace1}`, async () => {
      const resp = await runRequest('trained-model', idSpace1);

      const expectedResponse = [
        {
          id: 'lang_ident_model_1',
          description: 'Model used for identifying language from arbitrary input text.',
          state: '',
          type: ['lang_ident', 'classification', 'built-in'],
          spaces: ['*'],
        },
        {
          id: trainedModelIdSpace1s1,
          description: '',
          state: '',
          type: ['tree_ensemble', 'regression'],
          spaces: [idSpace1],
        },
        {
          id: trainedModelIdSpace2s1,
          description: '',
          state: '',
          type: ['tree_ensemble', 'regression'],
          spaces: [idSpace1],
        },
      ];
      expect(resp).to.eql(
        expectedResponse,
        `Response for space ${idSpace1} should be ${JSON.stringify(
          expectedResponse
        )} entries (got ${JSON.stringify(resp)})`
      );
    });

    it(`should get trained models for space ${idSpace2}`, async () => {
      const resp = await runRequest('trained-model', idSpace2);

      const expectedResponse = [
        {
          id: 'lang_ident_model_1',
          description: 'Model used for identifying language from arbitrary input text.',
          state: '',
          type: ['lang_ident', 'classification', 'built-in'],
          spaces: ['*'],
        },
        {
          id: trainedModelIdSpace3s2,
          description: '',
          state: '',
          type: ['tree_ensemble', 'regression'],
          spaces: [idSpace2],
        },
      ];

      expect(resp).to.eql(
        expectedResponse,
        `Response for space ${idSpace1} should be ${JSON.stringify(
          expectedResponse
        )} entries (got ${JSON.stringify(resp)})`
      );
    });
  });
};
