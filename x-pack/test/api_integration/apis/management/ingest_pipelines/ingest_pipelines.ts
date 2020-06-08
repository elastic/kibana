/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { registerEsHelpers } from './lib';

import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/ingest_pipelines';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const { createPipeline, deletePipeline } = registerEsHelpers(getService);

  describe('Pipelines', function () {
    describe('Create', () => {
      const PIPELINE_ID = 'test_create_pipeline';
      const REQUIRED_FIELDS_PIPELINE_ID = 'test_create_required_fields_pipeline';

      after(() => {
        deletePipeline(PIPELINE_ID);
        deletePipeline(REQUIRED_FIELDS_PIPELINE_ID);
      });

      it('should create a pipeline', async () => {
        const { body } = await supertest
          .post(API_BASE_PATH)
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
            on_failure: [
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

      it('should create a pipeline with only required fields', async () => {
        const { body } = await supertest
          .post(API_BASE_PATH)
          .set('kbn-xsrf', 'xxx')
          // Excludes description, version and on_failure processors
          .send({
            name: REQUIRED_FIELDS_PIPELINE_ID,
            processors: [
              {
                script: {
                  source: 'ctx._type = null',
                },
              },
            ],
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow creation of an existing pipeline', async () => {
        const { body } = await supertest
          .post(API_BASE_PATH)
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
        on_failure: [
          {
            set: {
              field: '_index',
              value: 'failed-{{ _index }}',
            },
          },
        ],
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

      it('should allow optional fields to be removed', async () => {
        const uri = `${API_BASE_PATH}/${PIPELINE_ID}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            processors: PIPELINE.processors,
            // removes description, version and on_failure
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

    describe('Get', () => {
      const PIPELINE_ID = 'test_pipeline';
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

      describe('all pipelines', () => {
        it('should return an array of pipelines', async () => {
          const { body } = await supertest.get(API_BASE_PATH).set('kbn-xsrf', 'xxx').expect(200);

          expect(Array.isArray(body)).to.be(true);

          // There are some pipelines created OOTB with ES
          // To not be dependent on these, we only confirm the pipeline we created as part of the test exists
          const testPipeline = body.find(({ name }: { name: string }) => name === PIPELINE_ID);

          expect(testPipeline).to.eql({
            ...PIPELINE,
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
      };

      it('should delete a pipeline', async () => {
        // Create pipeline to be deleted
        const PIPELINE_ID = 'test_delete_pipeline';
        createPipeline({ body: PIPELINE, id: PIPELINE_ID });

        const uri = `${API_BASE_PATH}/${PIPELINE_ID}`;

        const { body } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          itemsDeleted: [PIPELINE_ID],
          errors: [],
        });
      });

      it('should delete multiple pipelines', async () => {
        // Create pipelines to be deleted
        const PIPELINE_ONE_ID = 'test_delete_pipeline_1';
        const PIPELINE_TWO_ID = 'test_delete_pipeline_2';
        createPipeline({ body: PIPELINE, id: PIPELINE_ONE_ID });
        createPipeline({ body: PIPELINE, id: PIPELINE_TWO_ID });

        const uri = `${API_BASE_PATH}/${PIPELINE_ONE_ID},${PIPELINE_TWO_ID}`;

        const {
          body: { itemsDeleted, errors },
        } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(errors).to.eql([]);

        // The itemsDeleted array order isn't guaranteed, so we assert against each pipeline name instead
        [PIPELINE_ONE_ID, PIPELINE_TWO_ID].forEach((pipelineName) => {
          expect(itemsDeleted.includes(pipelineName)).to.be(true);
        });
      });

      it('should return an error for any pipelines not sucessfully deleted', async () => {
        const PIPELINE_DOES_NOT_EXIST = 'pipeline_does_not_exist';

        // Create pipeline to be deleted
        const PIPELINE_ONE_ID = 'test_delete_pipeline_1';
        createPipeline({ body: PIPELINE, id: PIPELINE_ONE_ID });

        const uri = `${API_BASE_PATH}/${PIPELINE_ONE_ID},${PIPELINE_DOES_NOT_EXIST}`;

        const { body } = await supertest.delete(uri).set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.eql({
          itemsDeleted: [PIPELINE_ONE_ID],
          errors: [
            {
              name: PIPELINE_DOES_NOT_EXIST,
              error: {
                msg: '[resource_not_found_exception] pipeline [pipeline_does_not_exist] is missing',
                path: '/_ingest/pipeline/pipeline_does_not_exist',
                query: {},
                statusCode: 404,
                response: JSON.stringify({
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
                }),
              },
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
  });
}
