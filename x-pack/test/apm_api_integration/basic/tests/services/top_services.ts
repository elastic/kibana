/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
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
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns a list of services', async () => {
        const response = await supertest.get(
          `/api/apm/services?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
        // sort services to mitigate unstable sort order
        const services = sortBy(response.body.items, ['serviceName']);

        expect(response.status).to.be(200);
        expect(services).to.eql([
          {
            serviceName: 'client',
            agentName: 'rum-js',
            transactionsPerMinute: 2,
            errorsPerMinute: 2.75,
            avgResponseTime: 116375,
            environments: [],
          },
          {
            serviceName: 'opbeans-java',
            agentName: 'java',
            transactionsPerMinute: 30.75,
            errorsPerMinute: 4.5,
            avgResponseTime: 25636.349593495936,
            environments: ['production'],
          },
          {
            serviceName: 'opbeans-node',
            agentName: 'nodejs',
            transactionsPerMinute: 31,
            errorsPerMinute: 3.75,
            avgResponseTime: 38682.52419354839,
            environments: ['production'],
          },
        ]);

        expect(response.body.hasHistoricalData).to.be(true);
        expect(response.body.hasLegacyData).to.be(false);
      });
    });
  });
}
