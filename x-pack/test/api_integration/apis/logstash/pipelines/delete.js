/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  describe('delete', () => {
    const archive = 'logstash/example_pipelines';

    before('load pipelines archive', async () => {
      await esArchiver.load(archive);
      await supertest.get('/api/logstash/pipeline/empty_pipeline_1').expect(200);
      await supertest.get('/api/logstash/pipeline/empty_pipeline_2').expect(200);
    });

    after('unload pipelines archive', () => {
      return esArchiver.unload(archive);
    });

    it('should delete the specified pipelines', async () => {
      await supertest
        .post('/api/logstash/pipelines/delete')
        .set('kbn-xsrf', 'xxx')
        .send({
          pipelineIds: ['empty_pipeline_1', 'empty_pipeline_2'],
        })
        .expect(200);

      await supertest.get('/api/logstash/pipeline/empty_pipeline_1').expect(404);
      await supertest.get('/api/logstash/pipeline/empty_pipeline_2').expect(404);
    });
  });
}
