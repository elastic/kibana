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
import type { AiopsLogRateAnalysisSchema } from '@kbn/aiops-log-rate-analysis/api/schema';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

import { parseStream } from './parse_stream';
import { getLogRateAnalysisTestData, API_VERSIONS } from './test_data';
import {
  getAddSignificationItemsActions,
  getHistogramActions,
  getGroupActions,
  getGroupHistogramActions,
} from './test_helpers';

export default ({ getService }: FtrProviderContext) => {
  const aiops = getService('aiops');
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
  const esArchiver = getService('esArchiver');

  describe('POST /internal/aiops/log_rate_analysis - full analysis', () => {
    API_VERSIONS.forEach((apiVersion) => {
      getLogRateAnalysisTestData<typeof apiVersion>().forEach((testData) => {
        describe(`with v${apiVersion} - ${testData.testName}`, () => {
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
            data.forEach((d) => {
              expect(typeof d.type).to.be('string');
            });

            const addSignificantItemsActions = getAddSignificationItemsActions(data);
            expect(addSignificantItemsActions.length).to.greaterThan(
              0,
              'Expected significant items actions to be greater than 0.'
            );

            const significantItems = orderBy(
              addSignificantItemsActions.flatMap((d) => d.payload),
              ['doc_count'],
              ['desc']
            );

            expect(significantItems).to.eql(
              testData.expected.significantItems,
              'Significant items do not match expected values.'
            );

            const histogramActions = getHistogramActions(data);
            const histograms = histogramActions.flatMap((d) => d.payload);
            // for each significant term we should get a histogram
            expect(histogramActions.length).to.eql(
              testData.expected.histogramActionsLength,
              `Expected histogram actions length to be ${testData.expected.histogramActionsLength}, got ${histogramActions.length}`
            );
            // each histogram should have a length of 20 items.
            histograms.forEach((h, index) => {
              expect(h.histogram.length).to.eql(
                testData.expected.histogramLength,
                `Expected histogram length to be ${testData.expected.histogramLength}, got ${h.histogram.length}`
              );
            });

            const groupActions = getGroupActions(data);
            const groups = groupActions.flatMap((d) => d.payload);

            const actualGroups = orderBy(groups, ['docCount'], ['desc']);
            const expectedGroups = orderBy(testData.expected.groups, ['docCount'], ['desc']);

            expect(actualGroups).to.eql(
              expectedGroups,
              `Grouping result does not match expected values. Expected ${JSON.stringify(
                expectedGroups
              )}, got ${JSON.stringify(actualGroups)}`
            );

            const groupHistogramActions = getGroupHistogramActions(data);
            const groupHistograms = groupHistogramActions.flatMap((d) => d.payload);
            // for each significant terms group we should get a histogram
            expect(groupHistograms.length).to.be(groups.length);
            // each histogram should have a length of 20 items.
            groupHistograms.forEach((h, index) => {
              expect(h.histogram.length).to.eql(
                testData.expected.histogramLength,
                `Expected group histogram length to be ${testData.expected.histogramLength}, got ${h.histogram.length}`
              );
            });
          }

          async function requestWithoutStreaming(
            body: AiopsLogRateAnalysisSchema<typeof apiVersion>
          ) {
            const resp = await supertest
              .post(`/internal/aiops/log_rate_analysis`)
              .set('kbn-xsrf', 'kibana')
              .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
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

          async function requestWithStreaming(body: AiopsLogRateAnalysisSchema<typeof apiVersion>) {
            const resp = await fetch(`${kibanaServerUrl}/internal/aiops/log_rate_analysis`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                [ELASTIC_HTTP_VERSION_HEADER]: apiVersion,
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

              // Originally we assumed that we can assert streaming in contrast
              // to non-streaming if there is more than one chunk. However,
              // this turned out to be flaky since a stream could finish fast
              // enough to contain only one chunk. So now we are checking if
              // there's just one chunk or more.
              expect(chunkCounter).to.be.greaterThan(
                0,
                `Expected 'chunkCounter' to be greater than 0, got ${chunkCounter}.`
              );

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
  });
};
