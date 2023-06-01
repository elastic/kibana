/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

import { explainLogRateSpikesTestData } from './test_data';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('POST /internal/aiops/explain_log_rate_spikes - no index', () => {
    explainLogRateSpikesTestData.forEach((testData) => {
      describe(`with ${testData.testName}`, () => {
        it('should return an error for non existing index without streaming', async () => {
          const resp = await supertest
            .post(`/internal/aiops/explain_log_rate_spikes`)
            .set('kbn-xsrf', 'kibana')
            .set('Elastic-Api-Version', '1')
            .send({
              ...testData.requestBody,
              index: 'does_not_exist',
            })
            .expect(200);

          const chunks: string[] = resp.body.toString().split('\n');

          expect(chunks.length).to.eql(
            testData.expected.noIndexChunksLength,
            `Expected 'noIndexChunksLength' to be ${testData.expected.noIndexChunksLength}, got ${chunks.length}.`
          );

          const lastChunk = chunks.pop();
          expect(lastChunk).to.be('');

          let data: any[] = [];

          expect(() => {
            data = chunks.map((c) => JSON.parse(c));
          }).not.to.throwError();

          expect(data.length).to.eql(
            testData.expected.noIndexActionsLength,
            `Expected 'noIndexActionsLength' to be ${testData.expected.noIndexActionsLength}, got ${data.length}.`
          );
          data.forEach((d) => {
            expect(typeof d.type).to.be('string');
          });

          const errorActions = data.filter((d) => d.type === testData.expected.errorFilter);
          expect(errorActions.length).to.be(1);

          expect(errorActions[0].payload).to.be('Failed to fetch index information.');
        });
      });
    });
  });
};
