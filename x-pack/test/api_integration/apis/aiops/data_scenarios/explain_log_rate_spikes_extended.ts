/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';

import { getWindowParameters } from '@kbn/aiops-utils';
import type { ApiExplainLogRateSpikes } from '@kbn/aiops-plugin/common/api';

import type { FtrProviderContext } from '../../../ftr_provider_context';

import { parseStream } from './parse_stream';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  const clickTime = 1640097150000;
  const minTime = 1640077200000;
  const maxTime = 1640112300000;

  const { baselineMin, baselineMax, deviationMin, deviationMax } = getWindowParameters(
    clickTime,
    minTime,
    maxTime
  );

  const requestBody: ApiExplainLogRateSpikes['body'] = {
    baselineMax,
    baselineMin,
    deviationMax,
    deviationMin,
    start: minTime,
    end: maxTime,
    index: 'cluster-apm-filebeat-6.8.6-aws-eu-west-1-2021.12.21*',
    searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
    timeFieldName: '@timestamp',
  };


  const expected = {
    chunksLength: 179,
    actionsLength: 178,
    noIndexChunksLength: 4,
    noIndexActionsLength: 3,
    changePointFilter: 'add_change_points',
    histogramFilter: 'add_change_points_histogram',
    errorFilter: 'add_error',
    changePointsLength: 47,
    changePoints: [
      {
        fieldName: 'beat.hostname.keyword',
        fieldValue: 'ip-172-27-97-204',
        doc_count: 12631,
        bg_count: 30175,
      },
      {
        fieldName: 'beat.name.keyword',
        fieldValue: 'i-0852e3f99b6c512fd',
        doc_count: 12631,
        bg_count: 30175,
      },
      {
        fieldName: 'docker.container.id.keyword',
        fieldValue: 'aa5a7e792e226ccc4f7bbf34dc0e999e17b4f561fd36fbf746365bad5a8112f7',
        doc_count: 12629,
        bg_count: 30167,
      },
      {
        fieldName: 'docker.container.id.keyword',
        fieldValue: 'dc1e531f6598b1f828fc1ccc1939cfc1fceeebd23378fab8f1ba2e8133e53b21',
        doc_count: 2220,
        bg_count: 4072,
      },
      {
        fieldName: 'docker.container.image.keyword',
        fieldValue: 'docker.elastic.co/cloud-assets/apm:7.13.1-0',
        doc_count: 2222,
        bg_count: 4126,
      },
      {
        fieldName: 'docker.container.image.keyword',
        fieldValue: 'docker.elastic.co/cloud-assets/apm:7.9.0-0',
        doc_count: 1505,
        bg_count: 2166,
      },
      {
        fieldName: 'docker.container.image.keyword',
        fieldValue: 'docker.elastic.co/cloud-assets/apm:7.15.2-0',
        doc_count: 14777,
        bg_count: 37298,
      },
      {
        fieldName: 'docker.container.labels.co.elastic.cloud.allocator.cluster_id.keyword',
        fieldValue: 'eb3713439fcd4fdfa60e355f0e57afc0',
        doc_count: 12629,
        bg_count: 30167,
      },
      {
        fieldName: 'docker.container.labels.co.elastic.cloud.allocator.cluster_id.keyword',
        fieldValue: 'ab8b9d3989c54817a1cb4184b2ef6b41',
        doc_count: 2295,
        bg_count: 3998,
      },
      {
        fieldName: 'docker.container.labels.co.elastic.cloud.allocator.cluster_id.keyword',
        fieldValue: '596808a16dec4fc39413bf34b0a70240',
        doc_count: 1505,
        bg_count: 2166,
      },
    ],
    histogramLength: 20,
  };

  describe('POST /internal/aiops/explain_log_rate_spikes EXTENDED EXAMPLES', () => {
    async function requestWithoutStreaming(body: ApiExplainLogRateSpikes['body']) {

      const resp = await supertest
        .post(`/internal/aiops/explain_log_rate_spikes`)
        .set('kbn-xsrf', 'kibana')
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
        expected.chunksLength,
        `Expected 'chunks.length' to be ${expected.chunksLength}, got ${chunks.length}.`
      );

      const lastChunk = chunks.pop();
      expect(lastChunk).to.eql('', `Expected 'lastChunk' to be empty string, got '${lastChunk}'.`);

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();


      expect(data.length).to.eql(
        expected.actionsLength,
        `Expected 'data.length' to be ${expected.actionsLength}, got ${data.length}.`
      );
      data.forEach((d) => {
        expect(typeof d.type).to.be('string');
      });

      const addChangePointsActions = data.filter((d) => d.type === expected.changePointFilter);
      expect(addChangePointsActions.length).to.greaterThan(0);

      const changePoints = addChangePointsActions
        .flatMap((d) => d.payload)
        .sort(function (a, b) {
          if (a.fieldName === b.fieldName) {
            return b.fieldValue - a.fieldValue;
          }
          return a.fieldName > b.fieldName ? 1 : -1;
        });

      expect(changePoints.length).to.eql(
        expected.changePointsLength,
        `Expected 'changePoints.length' to be ${expected.changePointsLength}, got ${changePoints.length}.`
      );
      // changePoints.forEach((cp, index) => {
      //   const ecp = expected.changePoints[index];
      //   expect(cp.fieldName).to.equal(ecp.fieldName);
      //   expect(cp.fieldValue).to.equal(ecp.fieldValue);
      //   expect(cp.doc_count).to.equal(ecp.doc_count);
      //   expect(cp.bg_count).to.equal(ecp.bg_count);
      // });

      const histogramActions = data.filter((d) => d.type === expected.histogramFilter);
      const histograms = histogramActions.flatMap((d) => d.payload);
      // for each change point we should get a histogram
      expect(histogramActions.length).to.be(changePoints.length);
      // each histogram should have a length of 20 items.
      histograms.forEach((h, index) => {
        expect(h.histogram.length).to.be(20);
      });
    }

    it('should return full data without streaming with compression with flushFix', async () => {
      await requestWithoutStreaming(requestBody);
    });

    it('should return full data without streaming with compression without flushFix', async () => {
      await requestWithoutStreaming({ ...requestBody, flushFix: false });
    });

    it('should return full data without streaming without compression with flushFix', async () => {
      await requestWithoutStreaming({ ...requestBody, compressResponse: false });
    });

    it('should return full data without streaming without compression without flushFix', async () => {
      await requestWithoutStreaming({ ...requestBody, compressResponse: false, flushFix: false });
    });

    async function requestWithStreaming(body: ApiExplainLogRateSpikes['body']) {
      const resp = await fetch(`${kibanaServerUrl}/internal/aiops/explain_log_rate_spikes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

        expect(data.length).to.eql(
          expected.actionsLength,
          `Expected 'data.length' to be ${expected.actionsLength}, got ${data.length}.`
        );

        const addChangePointsActions = data.filter((d) => d.type === expected.changePointFilter);
        expect(addChangePointsActions.length).to.greaterThan(0);

        const changePoints = addChangePointsActions
          .flatMap((d) => d.payload)
          .sort(function (a, b) {
            if (a.fieldName === b.fieldName) {
              return b.fieldValue - a.fieldValue;
            }
            return a.fieldName > b.fieldName ? 1 : -1;
          });

        expect(changePoints.length).to.eql(
          expected.changePointsLength,
          `Expected 'changePoints.length' to be ${expected.changePointsLength}, got ${changePoints.length}.`
        );
        // Check only up to 10 changePoints even if there's more
        changePoints.slice(0, 9).forEach((cp, index) => {
          const ecp = expected.changePoints.find(
            (d) => d.fieldName === cp.fieldName && d.fieldValue === cp.fieldValue
          );
          expect(ecp).not.to.eql(
            undefined,
            `Expected changePoint width 'fieldName:${cp.fieldName}'/'fieldValue:${cp.fieldValue}' to not be undefined`
          );
          if (ecp !== undefined) {
            expect(cp.doc_count).to.eql(
              ecp.doc_count,
              `Expected 'doc_count' to be ${ecp.doc_count}, got ${cp.doc_count}.`
            );
            expect(cp.bg_count).to.eql(
              ecp.bg_count,
              `Expected 'bg_count' to be ${ecp.bg_count}, got ${cp.bg_count}.`
            );
          }
        });

        const histogramActions = data.filter((d) => d.type === expected.histogramFilter);
        const histograms = histogramActions.flatMap((d) => d.payload);
        // for each change point we should get a histogram
        expect(histogramActions.length).to.be(changePoints.length);
        // each histogram should have a length of 20 items.
        histograms.forEach((h, index) => {
          expect(h.histogram.length).to.be(20);
        });
      }
    }

    it('should return data in chunks with streaming with compression with flushFix', async () => {
      await requestWithStreaming(requestBody);
    });

    it('should return data in chunks with streaming with compression without flushFix', async () => {
      await requestWithStreaming({ ...requestBody, flushFix: false });
    });

    it('should return data in chunks with streaming without compression with flushFix', async () => {
      await requestWithStreaming({ ...requestBody, compressResponse: false });
    });

    it('should return data in chunks with streaming without compression without flushFix', async () => {
      await requestWithStreaming({ ...requestBody, compressResponse: false, flushFix: false });
    });
  });
};
