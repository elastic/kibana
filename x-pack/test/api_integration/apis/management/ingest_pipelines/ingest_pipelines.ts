/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { registerEsHelpers } from './lib';

import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/ingest_pipelines';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const { createPipeline, deletePipeline } = registerEsHelpers(getService);

  describe('Pipelines', function() {
    describe('Create', () => {
      const PIPELINE_ID = 'test_create_pipeline';
      after(() => deletePipeline(PIPELINE_ID));

      it('should create a pipeline', async () => {
        const { body } = await supertest
          .put(API_BASE_PATH)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: PIPELINE_ID,
            description: 'test pipeline description',
            processors: [
              {
                script: {
                  source: 'ctx._type = null',
                },
              },
            ],
            onFailure: [
              {
                set: {
                  field: 'error.message',
                  value: '{{ failure_message }}',
                },
              },
            ],
            version: 1,
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow creation of an existing pipeline', async () => {
        const { body } = await supertest
          .put(API_BASE_PATH)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: PIPELINE_ID,
            description: 'test pipeline description',
            processors: [
              {
                script: {
                  source: 'ctx._type = null',
                },
              },
            ],
            version: 1,
          })
          .expect(409);

        expect(body).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a pipeline with name '${PIPELINE_ID}'.`,
        });
      });
    });

    describe('Update', () => {
      const PIPELINE_ID = 'test_update_pipeline';
      const PIPELINE = {
        description: 'test pipeline description',
        processors: [
          {
            script: {
              source: 'ctx._type = null',
            },
          },
        ],
        version: 1,
      };

      before(() => createPipeline({ body: PIPELINE, id: PIPELINE_ID }));
      after(() => deletePipeline(PIPELINE_ID));

      it('should allow an existing pipeline to be updated', async () => {
        const uri = `${API_BASE_PATH}/${PIPELINE_ID}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            ...PIPELINE,
            description: 'updated test pipeline description',
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow a non-existing pipeline to be updated', async () => {
        const uri = `${API_BASE_PATH}/pipeline_does_not_exist`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            ...PIPELINE,
            description: 'updated test pipeline description',
          })
          .expect(404);

        expect(body).to.eql({
          statusCode: 404,
          error: 'Not Found',
          message: 'Not Found',
        });
      });
    });
  });
}
