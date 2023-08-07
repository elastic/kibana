/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ingestPipelines = getService('ingestPipelines');

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
        const { name, ...pipelineRequestBody } =
          ingestPipelines.fixtures.createPipelineBodyWithRequiredFields(); // Includes name and processors[] only

        // First, create a pipeline using the ES API
        await ingestPipelines.api.createPipeline({ id: name, ...pipelineRequestBody });

        // Then, create a pipeline with our internal API
        const { body } = await supertest
          .post(ingestPipelines.fixtures.apiBasePath)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
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
  });
}
