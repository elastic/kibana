/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { registerEsHelpers } from './lib';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ingestPipelines = getService('ingestPipelines');

  const { createPipeline, createIndex, deleteIndex } = registerEsHelpers(getService);

  describe('Pipelines', function () {
    after(async () => {
      await ingestPipelines.api.cleanPipelines();
    });

    // TODO temp
    describe.only('Create', () => {
      it('should create a pipeline', async () => {
        const pipelineRequestBody = ingestPipelines.fixtures.createPipelineBody();
        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .send(pipelineRequestBody)
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should create a pipeline with only required fields', async () => {
        const pipelineRequestBody = ingestPipelines.fixtures.createPipelineBodyWithRequiredFields(); // Includes name and processors[] only

        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .send(pipelineRequestBody)
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow creation of an existing pipeline', async () => {
        const { name, ...pipelineRequestBody } =
          ingestPipelines.fixtures.createPipelineBodyWithRequiredFields(); // Includes name and processors[] only

        // First, create a pipeline using the ES API
        await ingestPipelines.api.createPipeline({ id: name, ...pipelineRequestBody });

        // Then, create a pipeline with our internal API
        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .send({
            name,
            ...pipelineRequestBody,
          })
          .expect(409);

        expect(body).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a pipeline with name '${name}'.`,
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
        on_failure: [
          {
            set: {
              field: '_index',
              value: 'failed-{{ _index }}',
            },
          },
        ],
        _meta: {
          field_1: 'test',
          field_2: 10,
        },
      };

      before(async () => {
        // Create pipeline that can be used to test PUT request
        try {
          await createPipeline({ body: PIPELINE, id: PIPELINE_ID }, true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating ingest pipeline');
          throw err;
        }
      });

      it('should allow an existing pipeline to be updated', async () => {
        const uri = `${API_BASE_PATH}/${PIPELINE_ID}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            ...PIPELINE,
            description: 'updated test pipeline description',
            _meta: {
              field_1: 'updated',
              new_field: 3,
            },
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should allow optional fields to be removed', async () => {
        const uri = `${API_BASE_PATH}/${PIPELINE_ID}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            processors: PIPELINE.processors,
            // removes description, version, on_failure, and _meta
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
            _meta: {
              field_1: 'updated',
              new_field: 3,
            },
          })
          .expect(404);

        expect(body).to.eql({
          statusCode: 404,
          error: 'Not Found',
          message: '{}',
          attributes: {},
        });
      });
    });

    describe('Get', () => {
      const PIPELINE_ID = 'test_get_pipeline';
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
        _meta: {
          field_1: 'test',
          field_2: 10,
        },
      };

      before(async () => {
        // Create pipeline that can be used to test GET request
        try {
          await createPipeline({ body: PIPELINE, id: PIPELINE_ID }, true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating ingest pipeline');
          throw err;
        }
      });

      describe('all pipelines', () => {
        it('should return an array of pipelines', async () => {
          const { body } = await supertest.get(API_BASE_PATH).set('kbn-xsrf', 'xxx').expect(200);

          expect(Array.isArray(body)).to.be(true);

          // There are some pipelines created OOTB with ES
          // To not be dependent on these, we only confirm the pipeline we created as part of the test exists
          const testPipeline = body.find(({ name }: { name: string }) => name === PIPELINE_ID);

          expect(testPipeline).to.eql({
            ...PIPELINE,
            isManaged: false,
            name: PIPELINE_ID,
          });
        });
      });

      describe('one pipeline', () => {
        it('should return a single pipeline', async () => {
          const uri = `${API_BASE_PATH}/${PIPELINE_ID}`;

          const { body } = await supertest.get(uri).set('kbn-xsrf', 'xxx').expect(200);

          expect(body).to.eql({
            ...PIPELINE,
            isManaged: false,
            name: PIPELINE_ID,
          });
        });
      });
    });

    describe('Delete', () => {
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
        _meta: {
          field_1: 'test',
          field_2: 10,
        },
      };

      const pipelineA = { body: PIPELINE, id: 'test_delete_pipeline_a' };
      const pipelineB = { body: PIPELINE, id: 'test_delete_pipeline_b' };
      const pipelineC = { body: PIPELINE, id: 'test_delete_pipeline_c' };
      const pipelineD = { body: PIPELINE, id: 'test_delete_pipeline_d' };

      before(async () => {
        // Create several pipelines that can be used to test deletion
        await Promise.all(
          [pipelineA, pipelineB, pipelineC, pipelineD].map((pipeline) => createPipeline(pipeline))
        ).catch((err) => {
          // eslint-disable-next-line no-console
          console.log(`[Setup error] Error creating pipelines: ${err.message}`);
          throw err;
        });
      });

      it('should delete a pipeline', async () => {
        const { id } = pipelineA;

        const uri = `${API_BASE_PATH}/${id}`;

        const { body } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          itemsDeleted: [id],
          errors: [],
        });
      });

      it('should delete multiple pipelines', async () => {
        const { id: pipelineBId } = pipelineB;
        const { id: pipelineCId } = pipelineC;

        const uri = `${API_BASE_PATH}/${pipelineBId},${pipelineCId}`;

        const {
          body: { itemsDeleted, errors },
        } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(errors).to.eql([]);

        // The itemsDeleted array order isn't guaranteed, so we assert against each pipeline name instead
        [pipelineBId, pipelineCId].forEach((pipelineName) => {
          expect(itemsDeleted.includes(pipelineName)).to.be(true);
        });
      });

      it('should return an error for any pipelines not sucessfully deleted', async () => {
        const PIPELINE_DOES_NOT_EXIST = 'pipeline_does_not_exist';
        const { id: existingPipelineId } = pipelineD;

        const uri = `${API_BASE_PATH}/${existingPipelineId},${PIPELINE_DOES_NOT_EXIST}`;

        const { body } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          itemsDeleted: [existingPipelineId],
          errors: [
            {
              name: PIPELINE_DOES_NOT_EXIST,
              error: {
                root_cause: [
                  {
                    type: 'resource_not_found_exception',
                    reason: 'pipeline [pipeline_does_not_exist] is missing',
                  },
                ],
                type: 'resource_not_found_exception',
                reason: 'pipeline [pipeline_does_not_exist] is missing',
              },
              status: 404,
            },
          ],
        });
      });
    });

    describe('Simulate', () => {
      it('should successfully simulate a pipeline', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/simulate`)
          .set('kbn-xsrf', 'xxx')
          .send({
            pipeline: {
              description: 'test simulate pipeline description',
              processors: [
                {
                  set: {
                    field: 'field2',
                    value: '_value',
                  },
                },
              ],
              version: 1,
              on_failure: [
                {
                  set: {
                    field: '_index',
                    value: 'failed-{{ _index }}',
                  },
                },
              ],
              _meta: {
                field: 'test simulate metadata',
              },
            },
            documents: [
              {
                _index: 'index',
                _id: 'id',
                _source: {
                  foo: 'bar',
                },
              },
              {
                _index: 'index',
                _id: 'id',
                _source: {
                  foo: 'rab',
                },
              },
            ],
          })
          .expect(200);

        // The simulate ES response is quite long and includes timestamps
        // so for now, we just confirm the docs array is returned with the correct length
        expect(body.docs?.length).to.eql(2);
      });

      it('should successfully simulate a pipeline with only required pipeline fields', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/simulate`)
          .set('kbn-xsrf', 'xxx')
          .send({
            pipeline: {
              processors: [
                {
                  set: {
                    field: 'field2',
                    value: '_value',
                  },
                },
              ],
            },
            documents: [
              {
                _index: 'index',
                _id: 'id',
                _source: {
                  foo: 'bar',
                },
              },
              {
                _index: 'index',
                _id: 'id',
                _source: {
                  foo: 'rab',
                },
              },
            ],
          })
          .expect(200);

        // The simulate ES response is quite long and includes timestamps
        // so for now, we just confirm the docs array is returned with the correct length
        expect(body.docs?.length).to.eql(2);
      });
    });

    describe('Fetch documents', () => {
      const INDEX = 'test_index';
      const DOCUMENT_ID = '1';
      const DOCUMENT = {
        name: 'John Doe',
      };

      before(async () => {
        // Create an index with a document that can be used to test GET request
        try {
          await createIndex({ id: DOCUMENT_ID, index: INDEX, body: DOCUMENT });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating index');
          throw err;
        }
      });

      after(async () => {
        // Clean up index created
        try {
          await deleteIndex(INDEX);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Cleanup error] Error deleting index');
          throw err;
        }
      });

      it('should return a document', async () => {
        const uri = `${API_BASE_PATH}/documents/${INDEX}/${DOCUMENT_ID}`;

        const { body } = await supertest.get(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          _index: INDEX,
          _id: DOCUMENT_ID,
          _source: DOCUMENT,
        });
      });

      it('should return an error if the document does not exist', async () => {
        const uri = `${API_BASE_PATH}/documents/${INDEX}/2`; // Document 2 does not exist

        const { body } = await supertest.get(uri).set('kbn-xsrf', 'xxx').expect(404);

        expect(body).to.eql({
          error: 'Not Found',
          message: '{"_index":"test_index","_id":"2","found":false}',
          statusCode: 404,
          attributes: {},
        });
      });
    });

    describe('Map CSV to pipeline', () => {
      it('should map to a pipeline', async () => {
        const validCsv =
          'source_field,copy_action,format_action,timestamp_format,destination_field,Notes\nsrcip,,,,source.address,Copying srcip to source.address';
        const { body } = await supertest
          .post(`${API_BASE_PATH}/parse_csv`)
          .set('kbn-xsrf', 'xxx')
          .send({
            copyAction: 'copy',
            file: validCsv,
          })
          .expect(200);

        expect(body.processors).to.eql([
          {
            set: {
              field: 'source.address',
              value: '{{srcip}}',
              if: 'ctx.srcip != null',
            },
          },
        ]);
      });
    });
  });
}
