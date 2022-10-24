/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';

import type { ApiExplainLogRateSpikes } from '@kbn/aiops-plugin/common/api';

import type { FtrProviderContext } from '../../ftr_provider_context';

import { parseStream } from './parse_stream';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  const requestBody: ApiExplainLogRateSpikes['body'] = {
    baselineMax: 1561719083292,
    baselineMin: 1560954147006,
    deviationMax: 1562254538692,
    deviationMin: 1561986810992,
    end: 2147483647000,
    index: 'ft_ecommerce',
    searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
    start: 0,
    timeFieldName: 'order_date',
  };

  const expected = {
    chunksLength: 13,
    actionsLength: 12,
    noIndexChunksLength: 4,
    noIndexActionsLength: 3,
    changePointFilter: 'add_change_points',
    histogramFilter: 'add_change_points_histogram',
    errorFilter: 'add_error',
    changePoints: [
      {
        fieldName: 'day_of_week',
        fieldValue: 'Wednesday',
        doc_count: 145,
        bg_count: 142,
        score: 36.31595998561873,
        pValue: 1.6911377077437753e-16,
        normalizedScore: 0.8055203624020835,
      },
      {
        fieldName: 'day_of_week',
        fieldValue: 'Thursday',
        doc_count: 157,
        bg_count: 224,
        score: 20.366950718358762,
        pValue: 1.428057484826135e-9,
        normalizedScore: 0.7661649691018979,
      },
    ],
    histogramLength: 20,
  };

  describe('POST /internal/aiops/explain_log_rate_spikes', () => {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
    });

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

      expect(chunks.length).to.be(expected.chunksLength);

      const lastChunk = chunks.pop();
      expect(lastChunk).to.be('');

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();

      expect(data.length).to.be(expected.actionsLength);
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

      expect(changePoints.length).to.equal(expected.changePoints.length);
      changePoints.forEach((cp, index) => {
        const ecp = expected.changePoints[index];
        expect(cp.fieldName).to.equal(ecp.fieldName);
        expect(cp.fieldValue).to.equal(ecp.fieldValue);
        expect(cp.doc_count).to.equal(ecp.doc_count);
        expect(cp.bg_count).to.equal(ecp.bg_count);
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

        expect(data.length).to.be(expected.actionsLength);

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

        expect(changePoints.length).to.equal(expected.changePoints.length);
        changePoints.forEach((cp, index) => {
          const ecp = expected.changePoints[index];
          expect(cp.fieldName).to.equal(ecp.fieldName);
          expect(cp.fieldValue).to.equal(ecp.fieldValue);
          expect(cp.doc_count).to.equal(ecp.doc_count);
          expect(cp.bg_count).to.equal(ecp.bg_count);
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

    it('should return an error for non existing index without streaming', async () => {
      const resp = await supertest
        .post(`/internal/aiops/explain_log_rate_spikes`)
        .set('kbn-xsrf', 'kibana')
        .send({
          ...requestBody,
          index: 'does_not_exist',
        })
        .expect(200);

      const chunks: string[] = resp.body.toString().split('\n');

      expect(chunks.length).to.be(expected.noIndexChunksLength);

      const lastChunk = chunks.pop();
      expect(lastChunk).to.be('');

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();

      expect(data.length).to.be(expected.noIndexActionsLength);
      data.forEach((d) => {
        expect(typeof d.type).to.be('string');
      });

      const errorActions = data.filter((d) => d.type === expected.errorFilter);
      expect(errorActions.length).to.be(1);

      expect(errorActions[0].payload).to.be('Failed to fetch field candidates.');
    });
  });
};
