/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ingestPipelines = getService('ingestPipelines');
  const log = getService('log');

  describe('Ingest Pipelines', function () {
    after(async () => {
      await ingestPipelines.api.cleanPipelines();
    });

    describe('Create', () => {
      it('should create a pipeline', async () => {
        const pipelineRequestBody = ingestPipelines.fixtures.createPipelineBody();
        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send(pipelineRequestBody);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should create a pipeline with only required fields', async () => {
        const pipelineRequestBody = ingestPipelines.fixtures.createPipelineBodyWithRequiredFields(); // Includes name and processors[] only

        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send(pipelineRequestBody)
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow creation of an existing pipeline', async () => {
        const pipelineRequestBody = ingestPipelines.fixtures.createPipelineBodyWithRequiredFields(); // Includes name and processors[] only
        const { name, ...esPipelineRequestBody } = pipelineRequestBody;

        // First, create a pipeline using the ES API
        await ingestPipelines.api.createPipeline({ id: name, ...esPipelineRequestBody });

        // Then, create a pipeline with our internal API
        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send(pipelineRequestBody)
          .expect(409);

        expect(body).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a pipeline with name '${name}'.`,
        });
      });
    });

    describe('Update', () => {
      let pipeline: Omit<IngestPutPipelineRequest, 'id'>;
      let pipelineName: string;

      before(async () => {
        // Create pipeline that can be used to test PUT request
        try {
          const pipelineRequestBody =
            ingestPipelines.fixtures.createPipelineBodyWithRequiredFields();
          const { name, ...esPipelineRequestBody } = pipelineRequestBody;

          pipeline = esPipelineRequestBody;
          pipelineName = name;
          await ingestPipelines.api.createPipeline({ id: name, ...esPipelineRequestBody });
        } catch (err) {
          log.debug('[Setup error] Error creating ingest pipeline');
          throw err;
        }
      });

      it('should allow an existing pipeline to be updated', async () => {
        const uri = `${ingestPipelines.fixtures.apiBasePath}/${pipelineName}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send({
            ...pipeline,
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
        const uri = `${ingestPipelines.fixtures.apiBasePath}/${pipelineName}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send({
            // removes description, version, on_failure, and _meta
            processors: pipeline.processors,
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow a non-existing pipeline to be updated', async () => {
        const uri = `${ingestPipelines.fixtures.apiBasePath}/pipeline_does_not_exist`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .send({
            ...pipeline,
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
  });
}
