/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';
import type { AiopsApiLogRateAnalysis } from '@kbn/aiops-plugin/common/api';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

import { parseStream } from './parse_stream';
import { logRateAnalysisTestData } from './test_data';

export default ({ getService }: FtrProviderContext) => {
  const aiops = getService('aiops');
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  const esArchiver = getService('esArchiver');

  describe('POST /internal/aiops/log_rate_analysis - full analysis', () => {
    logRateAnalysisTestData.forEach((testData) => {
      describe(`with ${testData.testName}`, () => {
        before(async () => {
          if (testData.esArchive) {
            await esArchiver.loadIfNeeded(testData.esArchive);
          } else if (testData.dataGenerator) {
            await aiops.logRateAnalysisDataGenerator.generateData(testData.dataGenerator);
          }
        });

        after(async () => {
          if (testData.esArchive) {
            await esArchiver.unload(testData.esArchive);
          } else if (testData.dataGenerator) {
            await aiops.logRateAnalysisDataGenerator.removeGeneratedData(testData.dataGenerator);
          }
        });

        async function assertAnalysisResult(data: any[]) {
          expect(data.length).to.eql(
            testData.expected.actionsLength,
            `Expected 'actionsLength' to be ${testData.expected.actionsLength}, got ${data.length}.`
          );
          data.forEach((d) => {
            expect(typeof d.type).to.be('string');
          });

          const addSignificantTermsActions = data.filter(
            (d) => d.type === testData.expected.significantTermFilter
          );
          expect(addSignificantTermsActions.length).to.greaterThan(0);

          const significantTerms = orderBy(
            addSignificantTermsActions.flatMap((d) => d.payload),
            ['doc_count'],
            ['desc']
          );

          expect(significantTerms).to.eql(
            testData.expected.significantTerms,
            'Significant terms do not match expected values.'
          );

          const histogramActions = data.filter((d) => d.type === testData.expected.histogramFilter);
          const histograms = histogramActions.flatMap((d) => d.payload);
          // for each significant term we should get a histogram
          expect(histogramActions.length).to.be(significantTerms.length);
          // each histogram should have a length of 20 items.
          histograms.forEach((h, index) => {
            expect(h.histogram.length).to.be(20);
          });

          const groupActions = data.filter((d) => d.type === testData.expected.groupFilter);
          const groups = groupActions.flatMap((d) => d.payload);

          expect(orderBy(groups, ['docCount'], ['desc'])).to.eql(
            orderBy(testData.expected.groups, ['docCount'], ['desc']),
            'Grouping result does not match expected values.'
          );

          const groupHistogramActions = data.filter(
            (d) => d.type === testData.expected.groupHistogramFilter
          );
          const groupHistograms = groupHistogramActions.flatMap((d) => d.payload);
          // for each significant terms group we should get a histogram
          expect(groupHistograms.length).to.be(groups.length);
          // each histogram should have a length of 20 items.
          groupHistograms.forEach((h, index) => {
            expect(h.histogram.length).to.be(20);
          });
        }

        async function requestWithoutStreaming(body: AiopsApiLogRateAnalysis['body']) {
          const resp = await supertest
            .post(`/internal/aiops/log_rate_analysis`)
            .set('kbn-xsrf', 'kibana')
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .send(body)
            .expect(200);

          // compression is on by default so if the request body is undefined
          // the response header should include "gzip" and otherwise be "undefined"
          if (body.compressResponse === undefined) {
            expect(resp.header['content-encoding']).to.be('gzip');
          } else if (body.compressResponse === false) {
            expect(resp.header['content-encoding']).to.be(undefined);
          }

          expect(Buffer.isBuffer(resp.body)).to.be(true);

          const chunks: string[] = resp.body.toString().split('\n');

          expect(chunks.length).to.eql(
            testData.expected.chunksLength,
            `Expected 'chunksLength' to be ${testData.expected.chunksLength}, got ${chunks.length}.`
          );

          const lastChunk = chunks.pop();
          expect(lastChunk).to.be('');

          let data: any[] = [];

          expect(() => {
            data = chunks.map((c) => JSON.parse(c));
          }).not.to.throwError();

          await assertAnalysisResult(data);
        }

        it('should return full data without streaming with compression with flushFix', async () => {
          await requestWithoutStreaming(testData.requestBody);
        });

        it('should return full data without streaming with compression without flushFix', async () => {
          await requestWithoutStreaming({ ...testData.requestBody, flushFix: false });
        });

        it('should return full data without streaming without compression with flushFix', async () => {
          await requestWithoutStreaming({ ...testData.requestBody, compressResponse: false });
        });

        it('should return full data without streaming without compression without flushFix', async () => {
          await requestWithoutStreaming({
            ...testData.requestBody,
            compressResponse: false,
            flushFix: false,
          });
        });

        async function requestWithStreaming(body: AiopsApiLogRateAnalysis['body']) {
          const resp = await fetch(`${kibanaServerUrl}/internal/aiops/log_rate_analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [ELASTIC_HTTP_VERSION_HEADER]: '1',
              'kbn-xsrf': 'stream',
            },
            body: JSON.stringify(body),
          });

          // compression is on by default so if the request body is undefined
          // the response header should include "gzip" and otherwise be "null"
          if (body.compressResponse === undefined) {
            expect(resp.headers.get('content-encoding')).to.be('gzip');
          } else if (body.compressResponse === false) {
            expect(resp.headers.get('content-encoding')).to.be(null);
          }

          expect(resp.ok).to.be(true);
          expect(resp.status).to.be(200);

          const stream = resp.body;

          expect(stream).not.to.be(null);

          if (stream !== null) {
            const data: any[] = [];
            let chunkCounter = 0;
            const parseStreamCallback = (c: number) => (chunkCounter = c);

            for await (const action of parseStream(stream, parseStreamCallback)) {
              expect(action.type).not.to.be('error');
              data.push(action);
            }

            // If streaming works correctly we should receive more than one chunk.
            expect(chunkCounter).to.be.greaterThan(1);

            await assertAnalysisResult(data);
          }
        }

        it('should return data in chunks with streaming with compression with flushFix', async () => {
          await requestWithStreaming(testData.requestBody);
        });

        it('should return data in chunks with streaming with compression without flushFix', async () => {
          await requestWithStreaming({ ...testData.requestBody, flushFix: false });
        });

        it('should return data in chunks with streaming without compression with flushFix', async () => {
          await requestWithStreaming({ ...testData.requestBody, compressResponse: false });
        });

        it('should return data in chunks with streaming without compression without flushFix', async () => {
          await requestWithStreaming({
            ...testData.requestBody,
            compressResponse: false,
            flushFix: false,
          });
        });
      });
    });
  });
};
