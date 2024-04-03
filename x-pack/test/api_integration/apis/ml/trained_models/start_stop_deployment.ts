/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { MlGetTrainedModelsStatsResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SUPPORTED_TRAINED_MODELS } from '../../../../functional/services/ml/api';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testModel = {
    ...SUPPORTED_TRAINED_MODELS.TINY_NER,
    id: SUPPORTED_TRAINED_MODELS.TINY_NER.name,
  };

  const customDeploymentId = 'my_deployment_id';

  describe('Start and stop deployment tests', () => {
    before(async () => {
      await ml.api.importTrainedModel(testModel.id, testModel.name);
      await ml.testResources.setKibanaTimeZoneToUTC();

      // Make sure the .ml-stats index is created in advance, see https://github.com/elastic/elasticsearch/issues/65846
      await ml.api.assureMlStatsIndexExists();
    });

    after(async () => {
      await ml.api.stopAllTrainedModelDeploymentsES();
      await ml.api.deleteAllTrainedModelsES();
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('does not allow to start trained model deployment if the user does not have required permissions', async () => {
      const { body: startResponseBody, status: startResponseStatus } = await supertest
        .post(`/internal/ml/trained_models/${testModel.id}/deployment/_start`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, startResponseStatus, startResponseBody);

      // verify that model deployment has not been started
      const { body: statsResponse, status: statsResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModel.id}/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, statsResponseStatus, statsResponse);

      const deploymentStats = (
        statsResponse as MlGetTrainedModelsStatsResponse
      ).trained_model_stats.find((v) => v.deployment_stats?.deployment_id === testModel.id);

      expect(deploymentStats).to.be(undefined);
    });

    it('starts trained model deployment with the default ID', async () => {
      const { body: startResponseBody, status: deleteResponseStatus } = await supertest
        .post(`/internal/ml/trained_models/${testModel.id}/deployment/_start`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, deleteResponseStatus, startResponseBody);

      expect(startResponseBody.assignment.assignment_state).to.eql('started');
      expect(startResponseBody.assignment.task_parameters.threads_per_allocation).to.eql(1);
      expect(startResponseBody.assignment.task_parameters.priority).to.eql('normal');
      expect(startResponseBody.assignment.task_parameters.deployment_id).to.eql(testModel.id);

      // check deployment status
      const { body: statsResponse, status: statsResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModel.id}/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, statsResponseStatus, statsResponse);

      const modelStats = (
        statsResponse as MlGetTrainedModelsStatsResponse
      ).trained_model_stats.find((v) => v.deployment_stats?.deployment_id === testModel.id);

      expect(modelStats!.deployment_stats!.allocation_status.state).to.match(
        /\bstarted\b|\bfully_allocated\b/
      );
    });

    it('starts trained model deployment with provided deployment ID', async () => {
      const { body: startResponseBody, status: deleteResponseStatus } = await supertest
        .post(`/internal/ml/trained_models/${testModel.id}/deployment/_start`)
        .query({ deployment_id: customDeploymentId })
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, deleteResponseStatus, startResponseBody);

      expect(startResponseBody.assignment.assignment_state).to.eql('started');
      expect(startResponseBody.assignment.task_parameters.deployment_id).to.eql(customDeploymentId);

      // check deployment status
      const { body: statsResponse, status: statsResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModel.id}/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, statsResponseStatus, statsResponse);

      const modelStats = (
        statsResponse as MlGetTrainedModelsStatsResponse
      ).trained_model_stats.find((v) => v.deployment_stats?.deployment_id === customDeploymentId);

      expect(modelStats!.deployment_stats!.allocation_status.state).to.match(
        /\bstarted\b|\bfully_allocated\b/
      );
    });

    it('returns 404 if requested trained model does not exist', async () => {
      const { body, status } = await supertest
        .post(`/internal/ml/trained_models/not_existing_model/deployment/_start`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(404, status, body);
    });

    it('does not allow to stop trained model deployment if the user does not have required permissions', async () => {
      const { body: stopResponseBody, status: stopResponseStatus } = await supertest
        .post(`/internal/ml/trained_models/${testModel.id}/${testModel.id}/deployment/_stop`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(403, stopResponseStatus, stopResponseBody);

      // verify that model deployment has not been started
      const { body: statsResponse, status: statsResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModel.id}/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, statsResponseStatus, statsResponse);

      const modelStats = (
        statsResponse as MlGetTrainedModelsStatsResponse
      ).trained_model_stats.find((v) => v.deployment_stats?.deployment_id === testModel.id);

      expect(modelStats!.deployment_stats!.allocation_status.state).to.match(
        /\bstarted\b|\bfully_allocated\b/
      );
    });

    it('stops trained model deployment with the default ID', async () => {
      const { body: stopResponseBody, status: stopResponseStatus } = await supertest
        .post(`/internal/ml/trained_models/${testModel.id}/${testModel.id}/deployment/_stop`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, stopResponseStatus, stopResponseBody);

      expect(stopResponseBody).to.eql({
        [testModel.id]: {
          success: true,
        },
      });

      // check deployment status
      const { body: statsResponse, status: statsResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModel.id}/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, statsResponseStatus, statsResponse);

      const deploymentStats = (
        statsResponse as MlGetTrainedModelsStatsResponse
      ).trained_model_stats.find((v) => v.deployment_stats?.deployment_id === testModel.id);

      expect(deploymentStats).to.be(undefined);
    });

    it('stops trained model deployment with provided deployment ID', async () => {
      const { body: stopResponseBody, status: stopResponseStatus } = await supertest
        .post(`/internal/ml/trained_models/${testModel.id}/${customDeploymentId}/deployment/_stop`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, stopResponseStatus, stopResponseBody);

      expect(stopResponseBody).to.eql({
        [customDeploymentId]: {
          success: true,
        },
      });

      // check deployment status
      const { body: statsResponse, status: statsResponseStatus } = await supertest
        .get(`/internal/ml/trained_models/${testModel.id}/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'));
      ml.api.assertResponseStatusCode(200, statsResponseStatus, statsResponse);

      const deploymentStats = (
        statsResponse as MlGetTrainedModelsStatsResponse
      ).trained_model_stats.find((v) => v.deployment_stats?.deployment_id === customDeploymentId);

      expect(deploymentStats).to.be(undefined);
    });
  });
};
