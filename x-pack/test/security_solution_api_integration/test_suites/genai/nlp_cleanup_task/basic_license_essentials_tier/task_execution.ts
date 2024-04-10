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

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');
  const kibanaServer = getService('kibanaServer');
  const ml = getService('ml');
  const logger = getService('log');

  const TASK_ID = 'serverless-security:nlp-cleanup-task:1.0.0';

  describe('@serverless NLP Cleanup Task in Essentials Tier', () => {
    describe('New Essentials Deployment', () => {
      it('registers and enables NLP Cleanup Task', async () => {
        const task = await kibanaServer.savedObjects.get({
          type: 'task',
          id: TASK_ID,
        });

        expect(task.attributes.enabled).to.eql(true);
      });

      it('executes NLP Cleanup Task and successfully cleans up only pytorch models', async () => {
        // Create a light-weight model that has a `model_type` of `pytorch`
        await ml.api.importTrainedModel('pt_tiny_fill_mask', 'pt_tiny_fill_mask');

        // Poll for model to be imported, this can fail with a 404 till the model is imported
        let m1: MlGetTrainedModelsResponse;
        await waitFor(
          async () => {
            ({ body: m1 } = await esSupertest.get(`/_ml/trained_models`).expect(200));
            return m1.count > 0;
          },
          'waitForModelToBeImported',
          logger
        );

        // Verify model was created, and default non-pytorch model already exists
        expect(m1.trained_model_configs.some((m) => m.model_type === 'pytorch')).to.eql(true);
        expect(m1.trained_model_configs.some((m) => m.model_type === 'lang_ident')).to.eql(true);

        // Grab the task SO so we can update it to 'run_soon'
        // Note: Can't go directly through TaskManager in Serverless at the moment, see: // TODO: Create core issue
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
        let m2: MlGetTrainedModelsResponse;
        await waitFor(
          async () => {
            ({ body: m2 } = await esSupertest.get(`/_ml/trained_models`).expect(200));
            return !m2.trained_model_configs.some((m) => m.model_type === 'pytorch');
          },
          'waitForModelToBeDeleted',
          logger
        );

        // Verify model was cleaned up, and non-pytorch model was not cleaned up
        const m2: MlGetTrainedModelsResponse = await ml.api.getTrainedModelsES();
        expect(m2.trained_model_configs.some((m) => m.model_type === 'pytorch')).to.eql(false);
        expect(m2.trained_model_configs.some((m) => m.model_type === 'lang_ident')).to.eql(true);
      });

      /**
       * Project-controller will set `xpack.ml.nlp.enabled:false` in Kibana for non-complete tiers, which will disable
       * the NLP UIs. This test is to ensure those interfaces are not available to the user.
       *
       * TODO: Skipped until project-controller code is merged
       */
      it.skip('ensures Kibana NLP interface is unavailable', async () => {
        await supertest.get('/app/ml/trained_models').set('kbn-xsrf', 'true');
      });
    });
  });
};
