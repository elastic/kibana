/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Transaction charts', () => {
    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/charts?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`
          Object {
            "apmTimeseries": Object {
              "overallAvgDuration": null,
              "responseTimes": Object {
                "avg": Array [],
                "p95": Array [],
                "p99": Array [],
              },
              "tpmBuckets": Array [],
            },
          }
        `);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns the transaction charts', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/charts?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
      });
    });
  });
}
