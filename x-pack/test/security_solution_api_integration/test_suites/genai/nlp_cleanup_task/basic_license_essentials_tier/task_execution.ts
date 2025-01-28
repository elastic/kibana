/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { MlGetTrainedModelsResponse } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { waitFor } from '../../../../../common/utils/security_solution';
import { SUPPORTED_TRAINED_MODELS } from '../../../../../functional/services/ml/api';

export default ({ getService }: FtrProviderContext): void => {
  const esSupertest = getService('esSupertest');
  const kibanaServer = getService('kibanaServer');
  const ml = getService('ml');
  const logger = getService('log');

  const TASK_ID = 'serverless-security:nlp-cleanup-task:1.0.0';

  const TINY_ELSER = {
    ...SUPPORTED_TRAINED_MODELS.TINY_ELSER,
    id: SUPPORTED_TRAINED_MODELS.TINY_ELSER.name,
  };

  // This started failing after merging with main, so skipping for now
  // See https://github.com/elastic/kibana/pull/186219 for details, but issue appears to be with
  // sporadic errors in loading `pt_tiny_elser`
  describe.skip('@serverless NLP Cleanup Task in Essentials Tier', () => {
    describe('New Essentials Deployment', () => {
      it('registers and enables NLP Cleanup Task', async () => {
        const task = await kibanaServer.savedObjects.get({
          type: 'task',
          id: TASK_ID,
        });

        expect(task.attributes.enabled).to.eql(true);
      });
      describe('Model Loading', () => {
        before(async () => {
          // Make sure the .ml-stats index is created in advance, see https://github.com/elastic/elasticsearch/issues/65846
          await ml.api.assureMlStatsIndexExists();
          // Create a light-weight model that has a `model_type` of `pytorch`
          await ml.api.importTrainedModel(TINY_ELSER.name, TINY_ELSER.id);
        });

        after(async () => {
          await ml.api.stopAllTrainedModelDeploymentsES();
          await ml.api.deleteAllTrainedModelsES();
          await ml.api.cleanMlIndices();
          await ml.testResources.cleanMLSavedObjects();
        });

        it('executes NLP Cleanup Task and successfully cleans up only pytorch models', async () => {
          // Poll for model to be imported, this can fail with a 404 till the model is imported
          let m1: MlGetTrainedModelsResponse = { count: 0, trained_model_configs: [] };
          await waitFor(
            async () => {
              const { body, status } = await esSupertest.get(`/_ml/trained_models`);
              m1 = body;
              return status === 200 && m1.count > 1;
            },
            'waitForModelToBeImported',
            logger
          );

          // Verify model was created, and default non-pytorch model already exists
          expect(m1?.trained_model_configs.some((m) => m.model_type === 'pytorch')).to.eql(true);
          expect(m1?.trained_model_configs.some((m) => m.model_type === 'lang_ident')).to.eql(true);

          // Grab the task SO so we can update it to 'run_soon'
          // Note: Can't go directly through TaskManager in Serverless at the moment, see: https://github.com/elastic/kibana/issues/179303
          const task = await kibanaServer.savedObjects.get({
            type: 'task',
            id: TASK_ID,
          });

          // Update task to 'run_soon', 1s from now
          const runAt = new Date(Date.now() + 1000).toISOString();
          await kibanaServer.savedObjects.update({
            type: 'task',
            id: 'serverless-security:nlp-cleanup-task:1.0.0',
            attributes: {
              ...task.attributes,
              runAt,
              scheduledAt: runAt,
              status: TaskStatus.Idle,
            },
          });

          // Let's wait and see...
          let m2: MlGetTrainedModelsResponse = { count: 0, trained_model_configs: [] };
          await waitFor(
            async () => {
              const { body, status } = await esSupertest.get(`/_ml/trained_models`);
              m2 = body;
              return (
                status === 200 && !m2.trained_model_configs.some((m) => m.model_type === 'pytorch')
              );
            },
            'waitForModelToBeDeleted',
            logger
          );

          // Verify model was cleaned up, and non-pytorch model was not cleaned up
          expect(m2?.trained_model_configs.some((m) => m.model_type === 'pytorch')).to.eql(false);
          expect(m2?.trained_model_configs.some((m) => m.model_type === 'lang_ident')).to.eql(true);
        });
      });
    });
  });
};
