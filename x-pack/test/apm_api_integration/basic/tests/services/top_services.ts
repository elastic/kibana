/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isEmpty, pick } from 'lodash';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import archives_metadata from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';

  const range = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(range.start);
  const end = encodeURIComponent(range.end);

  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('APM Services Overview', () => {
    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ hasHistoricalData: false, hasLegacyData: false, items: [] });
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('and fetching a list of services', () => {
        let response: PromiseReturnType<typeof supertest.get>;
        before(async () => {
          response = await supertest.get(
            `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
          );
        });

        it('the response is successful', () => {
          expect(response.status).to.eql(200);
        });

        it('returns hasHistoricalData: true', () => {
          expect(response.body.hasHistoricalData).to.be(true);
        });

        it('returns hasLegacyData: false', () => {
          expect(response.body.hasLegacyData).to.be(false);
        });

        it('returns the correct service names', () => {
          expect(response.body.items.map((item: any) => item.serviceName)).to.eql([
            'opbeans-python',
            'opbeans-node',
            'opbeans-ruby',
            'opbeans-go',
            'opbeans-dotnet',
            'opbeans-java',
            'opbeans-rum',
          ]);
        });

        it('returns the correct metrics averages', () => {
          expect(
            response.body.items.map((item: any) =>
              pick(
                item,
                'transactionErrorRate.value',
                'avgResponseTime.value',
                'transactionsPerMinute.value'
              )
            )
          ).to.eql([
            {
              transactionErrorRate: { value: 0.041666666666666664 },
              avgResponseTime: { value: 208079.9121184089 },
              transactionsPerMinute: { value: 18.016666666666666 },
            },
            {
              transactionErrorRate: { value: 0.03317535545023697 },
              avgResponseTime: { value: 578297.1431623931 },
              transactionsPerMinute: { value: 7.8 },
            },
            {
              transactionErrorRate: { value: 0.013123359580052493 },
              avgResponseTime: { value: 60518.587926509186 },
              transactionsPerMinute: { value: 6.35 },
            },
            {
              transactionErrorRate: { value: 0.014577259475218658 },
              avgResponseTime: { value: 25259.78717201166 },
              transactionsPerMinute: { value: 5.716666666666667 },
            },
            {
              transactionErrorRate: { value: 0.01532567049808429 },
              avgResponseTime: { value: 527290.3218390804 },
              transactionsPerMinute: { value: 4.35 },
            },
            {
              transactionErrorRate: { value: 0.15384615384615385 },
              avgResponseTime: { value: 530245.8571428572 },
              transactionsPerMinute: { value: 3.033333333333333 },
            },
            {
              avgResponseTime: { value: 896134.328358209 },
              transactionsPerMinute: { value: 2.2333333333333334 },
            },
          ]);
        });

        it('returns environments', () => {
          expect(response.body.items.map((item: any) => item.environments ?? [])).to.eql([
            ['production'],
            ['testing'],
            ['production'],
            ['testing'],
            ['production'],
            ['production'],
            ['testing'],
          ]);
        });

        it(`RUM services don't report any transaction error rates`, () => {
          // RUM transactions don't have event.outcome set,
          // so they should not have an error rate

          const rumServices = response.body.items.filter(
            (item: any) => item.agentName === 'rum-js'
          );

          expect(rumServices.length).to.be.greaterThan(0);

          expect(rumServices.every((item: any) => isEmpty(item.transactionErrorRate?.value)));
        });

        it('non-RUM services all report transaction error rates', () => {
          const nonRumServices = response.body.items.filter(
            (item: any) => item.agentName !== 'rum-js'
          );

          expect(
            nonRumServices.every((item: any) => {
              return (
                typeof item.transactionErrorRate?.value === 'number' &&
                item.transactionErrorRate.timeseries.length > 0
              );
            })
          ).to.be(true);
        });
      });
    });
  });
}
