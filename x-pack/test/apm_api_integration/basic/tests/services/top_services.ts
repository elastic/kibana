/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import * as t from 'io-ts';
import { isEmpty } from 'lodash';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getValueOrThrow } from '../../../../../plugins/apm/common/utils/get_value_or_throw';
import archives_metadata from '../../archives_metadata';

const metricType = t.strict({
  value: t.number,
  timeseries: t.array(
    t.type({
      x: t.number,
      y: t.union([t.number, t.null]),
    })
  ),
});

const serviceType = t.strict({
  serviceName: t.string,
  agentName: t.string,
  transactionsPerMinute: metricType,
  avgResponseTime: metricType,
  // the RUM service will not have transaction error data
  transactionErrorRate: t.union([metricType, t.undefined]),
  environments: t.array(t.string),
  // basic license should not have anomaly scores
  severity: t.undefined,
});

const responseType = t.type({
  items: t.array(serviceType),
  hasHistoricalData: t.literal(true),
  hasLegacyData: t.literal(false),
});

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

        it('the response outline matches the shape we expect', () => {
          expect(() => {
            getValueOrThrow(responseType, response.body);
          }).not.throwError();
        });

        it(`RUM services don't report any transaction error rates`, () => {
          // RUM transactions don't have event.outcome set,
          // so they should not have an error rate

          const data = getValueOrThrow(responseType, response.body);

          const rumServices = data.items.filter((item) => item.agentName === 'rum-js');

          expect(rumServices.length).to.be.greaterThan(0);

          expect(rumServices.every((item) => isEmpty(item.transactionErrorRate?.value)));
        });

        it('non-RUM services all report transaction error rates', () => {
          const data = getValueOrThrow(responseType, response.body);

          const nonRumServices = data.items.filter((item) => item.agentName !== 'rum-js');

          expect(
            nonRumServices.every((item) => {
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
