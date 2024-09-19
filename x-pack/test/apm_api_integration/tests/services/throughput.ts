/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { service, timerange } from '@elastic/apm-generator';
import expect from '@kbn/expect';
import { first, last, mean, uniq } from 'lodash';
import moment from 'moment';
import { ENVIRONMENT_ALL } from '../../../../plugins/apm/common/environment_filter_values';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type ThroughputReturn = APIReturnType<'GET /api/apm/services/{serviceName}/throughput'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const traceData = getService('traceData');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  registry.when(
    'Throughput with statically generated data',
    { config: 'basic', archives: ['apm_8.0.0_empty'] },
    () => {
      const start = new Date('2021-01-01T00:00:00.000Z').getTime();
      const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

      const GO_PROD_RATE = 10;
      const GO_DEV_RATE = 5;
      const JAVA_PROD_RATE = 20;

      before(async () => {
        const serviceGoProdInstance = service('synth-go', 'production', 'go').instance(
          'instance-a'
        );
        const serviceGoDevInstance = service('synth-go', 'development', 'go').instance(
          'instance-b'
        );
        const serviceJavaInstance = service('synth-java', 'production', 'java').instance(
          'instance-c'
        );

        await traceData.index([
          ...timerange(start, end)
            .interval('1s')
            .rate(GO_PROD_RATE)
            .flatMap((timestamp) =>
              serviceGoProdInstance
                .transaction('GET /api/product/list')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
          ...timerange(start, end)
            .interval('1s')
            .rate(GO_DEV_RATE)
            .flatMap((timestamp) =>
              serviceGoDevInstance
                .transaction('GET /api/product/:id')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
          ...timerange(start, end)
            .interval('1s')
            .rate(JAVA_PROD_RATE)
            .flatMap((timestamp) =>
              serviceJavaInstance
                .transaction('POST /api/product/buy')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
        ]);
      });

      after(() => traceData.clean());

      async function callApi(overrides?: {
        start?: string;
        end?: string;
        transactionType?: string;
        environment?: string;
        kuery?: string;
      }) {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/services/{serviceName}/throughput',
          params: {
            path: {
              serviceName: 'synth-go',
            },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              transactionType: 'request',
              environment: 'production',
              kuery: 'processor.event:transaction',
              ...overrides,
            },
          },
        });

        return response.body;
      }

      describe('when calling it with the default parameters', () => {
        let body: PromiseReturnType<typeof callApi>;

        before(async () => {
          body = await callApi();
        });

        it('returns the throughput in seconds', () => {
          expect(body.throughputUnit).to.eql('second');
        });

        it('returns the expected throughput', () => {
          const throughputValues = uniq(body.currentPeriod.map((coord) => coord.y));
          expect(throughputValues).to.eql([GO_PROD_RATE]);
        });
      });

      describe('when setting environment to all', () => {
        let body: PromiseReturnType<typeof callApi>;

        before(async () => {
          body = await callApi({
            environment: ENVIRONMENT_ALL.value,
          });
        });

        it('returns data for all environments', () => {
          const throughputValues = body.currentPeriod.map(({ y }) => y);
          expect(uniq(throughputValues)).to.eql([GO_PROD_RATE + GO_DEV_RATE]);
          expect(body.throughputUnit).to.eql('second');
        });
      });

      describe('when defining a kuery', () => {
        let body: PromiseReturnType<typeof callApi>;

        before(async () => {
          body = await callApi({
            kuery: `processor.event:transaction and transaction.name:"GET /api/product/:id"`,
            environment: ENVIRONMENT_ALL.value,
          });
        });

        it('returns data that matches the kuery', () => {
          const throughputValues = body.currentPeriod.map(({ y }) => y);
          expect(uniq(throughputValues)).to.eql([GO_DEV_RATE]);
          expect(body.throughputUnit).to.eql('second');
        });
      });
    }
  );

  registry.when('Throughput when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint: 'GET /api/apm/services/{serviceName}/throughput',
        params: {
          path: {
            serviceName: 'opbeans-java',
          },
          query: {
            start: metadata.start,
            end: metadata.end,
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
          },
        },
      });

      expect(response.status).to.be(200);
      expect(response.body.currentPeriod.length).to.be(0);
      expect(response.body.previousPeriod.length).to.be(0);
    });
  });

  let throughputResponse: ThroughputReturn;
  registry.when(
    'Throughput when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('when querying without kql filter', () => {
        before(async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/services/{serviceName}/throughput',
            params: {
              path: {
                serviceName: 'opbeans-java',
              },
              query: {
                start: metadata.start,
                end: metadata.end,
                transactionType: 'request',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
          throughputResponse = response.body;
        });

        it('returns some data', () => {
          expect(throughputResponse.currentPeriod.length).to.be.greaterThan(0);
          expect(throughputResponse.previousPeriod.length).not.to.be.greaterThan(0);

          const nonNullDataPoints = throughputResponse.currentPeriod.filter(({ y }) =>
            isFiniteNumber(y)
          );

          expect(nonNullDataPoints.length).to.be.greaterThan(0);
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(first(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T06:50:00.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(last(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T07:20:00.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(throughputResponse.currentPeriod.length).toMatchInline(`31`);
        });

        it('has the correct throughput in tpm', () => {
          const avg = mean(throughputResponse.currentPeriod.map((d) => d.y));
          expectSnapshot(avg).toMatchInline(`6.19354838709677`);
          expectSnapshot(throughputResponse.throughputUnit).toMatchInline(`"minute"`);
        });
      });

      describe('with kql filter to force transaction-based UI', () => {
        before(async () => {
          const response = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/services/{serviceName}/throughput',
            params: {
              path: {
                serviceName: 'opbeans-java',
              },
              query: {
                kuery: 'processor.event : "transaction"',
                start: metadata.start,
                end: metadata.end,
                transactionType: 'request',
                environment: 'ENVIRONMENT_ALL',
              },
            },
          });
          throughputResponse = response.body;
        });

        it('has the correct throughput in tps', async () => {
          const avgTps = mean(throughputResponse.currentPeriod.map((d) => d.y));
          expectSnapshot(avgTps).toMatchInline(`0.124043715846995`);
          expectSnapshot(throughputResponse.throughputUnit).toMatchInline(`"second"`);

          // this tpm value must be similar tp tpm value calculated in the previous spec where metric docs were used
          const avgTpm = avgTps * 60;
          expectSnapshot(avgTpm).toMatchInline(`7.44262295081967`);
        });
      });
    }
  );

  registry.when(
    'Throughput when data is loaded with time comparison',
    { config: 'basic', archives: [archiveName] },
    () => {
      before(async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/services/{serviceName}/throughput',
          params: {
            path: {
              serviceName: 'opbeans-java',
            },
            query: {
              transactionType: 'request',
              start: moment(metadata.end).subtract(15, 'minutes').toISOString(),
              end: metadata.end,
              comparisonStart: metadata.start,
              comparisonEnd: moment(metadata.start).add(15, 'minutes').toISOString(),
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        throughputResponse = response.body;
      });

      it('returns some data', () => {
        expect(throughputResponse.currentPeriod.length).to.be.greaterThan(0);
        expect(throughputResponse.previousPeriod.length).to.be.greaterThan(0);

        const currentPeriodNonNullDataPoints = throughputResponse.currentPeriod.filter(({ y }) =>
          isFiniteNumber(y)
        );
        const previousPeriodNonNullDataPoints = throughputResponse.previousPeriod.filter(({ y }) =>
          isFiniteNumber(y)
        );

        expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
        expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);
      });

      it('has the correct start date', () => {
        expectSnapshot(
          new Date(first(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-08-03T07:05:00.000Z"`);

        expectSnapshot(
          new Date(first(throughputResponse.previousPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-08-03T07:05:00.000Z"`);
      });

      it('has the correct end date', () => {
        expectSnapshot(
          new Date(last(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-08-03T07:20:00.000Z"`);

        expectSnapshot(
          new Date(last(throughputResponse.previousPeriod)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-08-03T07:20:00.000Z"`);
      });

      it('has the correct number of buckets', () => {
        expectSnapshot(throughputResponse.currentPeriod.length).toMatchInline(`16`);
        expectSnapshot(throughputResponse.previousPeriod.length).toMatchInline(`16`);
      });

      it('has the correct throughput in tpm', () => {
        expectSnapshot(throughputResponse).toMatch();
        expectSnapshot(throughputResponse.throughputUnit).toMatchInline(`"minute"`);
      });
    }
  );
}
