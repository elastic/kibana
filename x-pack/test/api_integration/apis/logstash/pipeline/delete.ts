/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('delete', () => {

    before(async () => {
      await supertest
        .put('/api/logstash/pipeline/fast_generator')
        .set('kbn-xsrf', 'xxx')
        .send({
          description: 'foobar baz',
          pipeline: 'input { generator {} }\n\n output { stdout {} }',
        })
        .expect(204);

      await supertest.get('/api/logstash/pipeline/fast_generator').expect(200);
    });

    it('should delete the specified pipeline', async () => {
      await supertest
        .delete('/api/logstash/pipeline/fast_generator')
        .set('kbn-xsrf', 'xxx')
        .expect(204);

      await supertest.get('/api/logstash/pipeline/fast_generator').expect(404);
    });
  });
}
