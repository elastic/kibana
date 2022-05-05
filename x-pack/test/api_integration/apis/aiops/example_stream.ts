/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('POST /internal/aiops/example_stream', () => {
    it('should return full data without streaming', async () => {
      const resp = await supertest
        .post(`/internal/aiops/example_stream`)
        .set('kbn-xsrf', 'kibana')
        .send({
          timeout: 1,
        })
        .expect(200);

      expect(Buffer.isBuffer(resp.body)).to.be(true);

      const chunks: string[] = resp.body.toString().split('\n');

      expect(chunks.length).to.be(201);

      const lastChunk = chunks.pop();
      expect(lastChunk).to.be('');

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();

      data.forEach((d) => {
        expect(typeof d.type).to.be('string');
      });

      const progressData = data.filter((d) => d.type === 'update_progress');
      expect(progressData.length).to.be(100);
      expect(progressData[0].payload).to.be(1);
      expect(progressData[progressData.length - 1].payload).to.be(100);
    });
  });
};
