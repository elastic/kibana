/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import expectedBreakdown from './expectation/breakdown.json';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
  const transactionType = 'request';
  const transactionName = 'GET /api';
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Breakdown', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );
        expect(response.status).to.be(200);
        expect(response.body).to.eql({ timeseries: [] });
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns the transaction breakdown for a service', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql(expectedBreakdown);
      });
      it('returns the transaction breakdown for a transaction group', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}&transactionName=${transactionName}`
        );

        expect(response.status).to.be(200);
        const { timeseries } = response.body;
        const { title, color, type, data, hideLegend, legendValue } = timeseries[0];
        expect(data).to.eql([
          { x: 1593413100000, y: null },
          { x: 1593413130000, y: null },
          { x: 1593413160000, y: null },
          { x: 1593413190000, y: null },
          { x: 1593413220000, y: null },
          { x: 1593413250000, y: null },
          { x: 1593413280000, y: null },
          { x: 1593413310000, y: 1 },
          { x: 1593413340000, y: null },
        ]);
        expect(title).to.be('app');
        expect(color).to.be('#54b399');
        expect(type).to.be('areaStacked');
        expect(hideLegend).to.be(false);
        expect(legendValue).to.be('100%');
      });
      it('returns the transaction breakdown sorted by name', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);
        expect(response.body.timeseries.map((serie: { title: string }) => serie.title)).to.eql([
          'app',
          'http',
          'postgresql',
          'redis',
        ]);
      });
    });
  });
}
