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

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

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

    it('should return data in chunks with streaming', async () => {
      const response = await fetch(`${kibanaServerUrl}/internal/aiops/example_stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'stream',
        },
        body: JSON.stringify({ timeout: 1 }),
      });

      const stream = response.body;

      expect(stream).not.to.be(null);

      if (stream !== null) {
        let partial = '';
        let throwed = false;
        const progressData: any[] = [];

        try {
          for await (const value of stream) {
            const full = `${partial}${value}`;
            const parts = full.split('\n');
            const last = parts.pop();

            partial = last ?? '';

            const actions = parts.map((p) => JSON.parse(p));

            actions.forEach((action) => {
              expect(typeof action.type).to.be('string');

              if (action.type === 'update_progress') {
                progressData.push(action);
              }
            });
          }
        } catch (e) {
          throwed = true;
        }

        expect(throwed).to.be(false);

        expect(progressData.length).to.be(100);
        expect(progressData[0].payload).to.be(1);
        expect(progressData[progressData.length - 1].payload).to.be(100);
      }
    });
  });
};
