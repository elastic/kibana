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

import { FtrProviderContext } from '../../ftr_provider_context';

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
    kuery: '',
    start: 0,
    timeFieldName: 'order_date',
  };

  const expected = {
    chunksLength: 7,
    actionsLength: 6,
    actionFilter: 'add_change_points',
    changePoints: [
      {
        fieldName: 'day_of_week',
        fieldValue: 'Wednesday',
        doc_count: 145,
        bg_count: 145,
        score: 36.31595998561873,
        pValue: 1.6911377077437753e-16,
        normalizedScore: 0.8055203624020835,
      },
      {
        fieldName: 'day_of_week',
        fieldValue: 'Thursday',
        doc_count: 157,
        bg_count: 157,
        score: 20.366950718358762,
        pValue: 1.428057484826135e-9,
        normalizedScore: 0.7661649691018979,
      },
    ],
  };

  describe('POST /internal/aiops/explain_log_rate_spikes', () => {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
    });

    it('should return full data without streaming', async () => {
      const resp = await supertest
        .post(`/internal/aiops/explain_log_rate_spikes`)
        .set('kbn-xsrf', 'kibana')
        .send(requestBody)
        .expect(200);

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

      const addChangePointsActions = data.filter((d) => d.type === expected.actionFilter);
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
    });

    it('should return data in chunks with streaming', async () => {
      const response = await fetch(`${kibanaServerUrl}/internal/aiops/explain_log_rate_spikes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'stream',
        },
        body: JSON.stringify(requestBody),
      });

      const stream = response.body;

      expect(stream).not.to.be(null);

      if (stream !== null) {
        const data: any[] = [];

        for await (const action of parseStream(stream)) {
          expect(action.type).not.to.be('error');
          data.push(action);
        }

        expect(data.length).to.be(expected.actionsLength);
        const addChangePointsActions = data.filter((d) => d.type === expected.actionFilter);
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
      }
    });
  });
};
