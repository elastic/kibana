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

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const ml = getService('ml');

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

        // TODO: Poll `getTrainedModelsES` instead of waiting...
        // Failing build: https://buildkiteartifacts.com/e0f3970e-3a75-4621-919f-e6c773e2bb12/0fda5127-f57f-42fb-8e5a-146b3d535916/018ec8c0-fa41-4574-ba31-36c6f171cfe9/018ec8d2-1820-4341-afa2-3a455cf811be/target/test_failures/018ec8d2-1820-4341-afa2-3a455cf811be_e2c8891c3283f7e947f123a7a7eeb7cf.html?response-content-type=text/html&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAQPCP3C7L4OY47QXH/20240410/us-east-1/s3/aws4_request&X-Amz-Date=20240410T171432Z&X-Amz-Expires=600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEPb//////////wEaCXVzLWVhc3QtMSJHMEUCIQDfZ80VBQugRuPXkL2glFtq7Mg2eW8moppllgDnwqfITQIgCZjgel9s3RnQPZML34ua770e2mipEE9+ZGZ9So9KxLAq8QMILhAAGgwwMzIzNzk3MDUzMDMiDKB9958dOROgVi8z+yrOA4LYTuF0DkVhk0MsmFfHoJGL8TJaggD/N45KfYygOyvHT8UgLeT5mrZFbXkXn6dcVMYoo55tNvEJoHCgLznnVudVv25pXHhmKPQx0mIbPQA8l/ExpA4MuYxH98IX3v+25FCtYkJAWLQuxRnp5C/cGoLHqK+yKkF4g7truavI0YtOQs/ZAS79GqvApoTEU3ETNcqvo6q/ukAIua7/bHzHsd2E+G2hEZjqIFro4eKX+5CoeWmqjXm6NionGURImHQdXmDFdyKZP86xhZIXrlyLCi2j9fdbVzI6g0QTKSgWKQFbwF5fE2E1AgNZPrrvFlmWcPF7cxZjjvOQO88gSI3tU/wmoeTMz/G2jGfVlqfSvWvdeAt2WhsHtlFeaZPUO5w05VlpazZZmwgTIIdVR4s0NSVtiOKymF2WH2Un4WonbpJV44BlgRqxcWm/Lg/0XXIVmpLGppxAwIIg/1yfYwYFpte4kQYqPi1Xb5aGuXAE6s148wlJX08G+aH38TE8ThT4k7PmyN1O0PQpsIEQNiSJFIZnFaR98kwVcFLZifhdDTmdjqDvkHN6KeOtT48PkU+PoKcVDeW1mhEBfEHjd9cGrtBl76S01i+Sup7OMtAnXzDopNqwBjqlAdeyVJsoSPI8BMZbkzi4beaI43d0/719CQn6B0nLug6mMACMJVSUQLFDTiP6GL2m96uIGDNw77nz7sbfkHDCVcup/Y90UrpS9hoyWTz+mutFmZ57clgTNOdvVVuWvPEtJNXZ5icHvp3ZEXx+eagSkXQsJDYwQZCWSIOYtC8o6CIteaB0ye/qfbYsIQt2dR8SUwI2ZSYEtp0xDyh0ikV3FtXoCa/NYQ%3D%3D&X-Amz-SignedHeaders=host&X-Amz-Signature=1100e76210ebce1022c792e036964e546b84855d7bc8228a203cc0c32a84b25b
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Verify model was created, and default non-pytorch model already exists
        const m1: MlGetTrainedModelsResponse = await ml.api.getTrainedModelsES();
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
        // TODO: Poll `getTrainedModelsES` instead of waiting...
        await new Promise((resolve) => setTimeout(resolve, 10000));

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
