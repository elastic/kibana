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

import type { FtrProviderContext } from '../../ftr_provider_context';

import { parseStream } from './parse_stream';

type WithinRange = [number, number];

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  const clickTime = '2021-12-21 15:30:00';
  const minTime = '2021-12-21 10:00:00';
  const maxTime = '2021-12-21 19:45:00';

  const { baselineMin, baselineMax, deviationMin, deviationMax } = getWindowParameters(
    new Date(clickTime).getTime(),
    new Date(minTime).getTime(),
    new Date(maxTime).getTime()
  );

  const requestBody: ApiExplainLogRateSpikes['body'] = {
    baselineMax,
    baselineMin,
    deviationMax,
    deviationMin,
    end: new Date(maxTime).getTime(),
    index: 'cluster-apm-filebeat-6.8.6-aws-eu-west-1-2021.12.21*',
    searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
    start: new Date(minTime).getTime(),
    timeFieldName: '@timestamp',
  };

  const expected = {
    chunksLength: [111, 119] as WithinRange,
    actionsLength: [110, 118] as WithinRange,
    noIndexChunksLength: 4,
    noIndexActionsLength: 3,
    changePointFilter: 'add_change_points',
    histogramFilter: 'add_change_points_histogram',
    errorFilter: 'add_error',
    changePointsLength: [47, 51] as WithinRange,
    changePoints: [
      {
        fieldName: 'beat.hostname.keyword',
        fieldValue: 'ip-172-27-97-204',
        doc_count: [12559, 13072] as WithinRange,
        bg_count: [29325, 30114] as WithinRange,
        total_doc_count: [100442, 100442] as WithinRange,
        total_bg_count: [280434, 280434] as WithinRange,
        score: [25.52678334549752, 25.52678334549752] as WithinRange,
        pValue: [8.200849696539114e-12, 8.200849696539114e-12] as WithinRange,
        normalizedScore: [0.7788972485182145, 0.7788972485182145] as WithinRange,
      },
      {
        fieldName: 'beat.name.keyword',
        fieldValue: 'i-0852e3f99b6c512fd',
        doc_count: [12537, 12966] as WithinRange,
        bg_count: [29253, 30005] as WithinRange,
        total_doc_count: 100380,
        total_bg_count: 281239,
        score: 23.45181596964945,
        pValue: 6.531391756571896e-11,
        normalizedScore: 0.7737771087156007,
      },
    ],
    histogramLength: 20,
  };

  describe.skip('POST /internal/aiops/explain_log_rate_spikes EXTENDED EXAMPLES', () => {
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

      expect(chunks.length).to.within(...expected.chunksLength);

      const lastChunk = chunks.pop();
      expect(lastChunk).to.be('');

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();

      expect(data.length).to.within(...expected.actionsLength);
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

      expect(changePoints.length).to.within(...expected.changePointsLength);
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

        expect(data.length).to.within(...expected.actionsLength);

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

        expect(changePoints.length).to.within(...expected.changePointsLength);
        changePoints.forEach((cp, index) => {
          const ecp = expected.changePoints.find(
            (d) => d.fieldName === cp.fieldName && d.fieldValue === cp.fieldValue
          );
          expect(ecp).not.to.be(undefined);
          if (ecp !== undefined) {
            expect(cp.doc_count).to.within(...ecp.doc_count);
            expect(cp.bg_count).to.within(...ecp.bg_count);
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
