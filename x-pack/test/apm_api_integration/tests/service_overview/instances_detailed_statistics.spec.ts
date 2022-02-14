/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { Coordinate } from '../../../../plugins/apm/typings/timeseries';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { getServiceNodeIds } from './get_service_node_ids';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const serviceName = 'opbeans-java';
  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  interface Response {
    status: number;
    body: APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;
  }

  registry.when(
    'Service overview instances detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
            params: {
              path: { serviceName },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                numBuckets: 20,
                transactionType: 'request',
                serviceNodeIds: JSON.stringify(
                  await getServiceNodeIds({ apmApiClient, start, end })
                ),
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
        });
      });
    }
  );

  registry.when(
    'Service overview instances detailed statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('fetching data without comparison', () => {
        let response: Response;
        let serviceNodeIds: string[];

        beforeEach(async () => {
          serviceNodeIds = await getServiceNodeIds({
            apmApiClient,
            start,
            end,
          });
        });

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
            params: {
              path: { serviceName },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                numBuckets: 20,
                transactionType: 'request',
                serviceNodeIds: JSON.stringify(serviceNodeIds),
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
        });

        it('returns a service node item', () => {
          expect(Object.values(response.body.currentPeriod).length).to.be.greaterThan(0);
          expect(Object.values(response.body.previousPeriod)).to.eql(0);
        });

        it('returns statistics for each service node', async () => {
          const item = response.body.currentPeriod[serviceNodeIds[0]];

          expect(item?.cpuUsage?.some((point) => isFiniteNumber(point.y))).to.be(true);
          expect(item?.memoryUsage?.some((point) => isFiniteNumber(point.y))).to.be(true);
          expect(item?.errorRate?.some((point) => isFiniteNumber(point.y))).to.be(true);
          expect(item?.throughput?.some((point) => isFiniteNumber(point.y))).to.be(true);
          expect(item?.latency?.some((point) => isFiniteNumber(point.y))).to.be(true);
        });

        it('returns the right data', () => {
          expectSnapshot(Object.values(response.body.currentPeriod).length).toMatchInline(`1`);

          expectSnapshot(Object.keys(response.body.currentPeriod)).toMatchInline(`
            Array [
              "31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad",
            ]
          `);

          expectSnapshot(response.body).toMatch();
        });
      });

      describe('fetching data with comparison', () => {
        let response: Response;
        let serviceNodeIds: string[];

        beforeEach(async () => {
          serviceNodeIds = await getServiceNodeIds({
            apmApiClient,
            start,
            end,
          });
        });

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
            params: {
              path: { serviceName },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                numBuckets: 20,
                transactionType: 'request',
                serviceNodeIds: JSON.stringify(serviceNodeIds),
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
        });

        it('returns a service node item for current and previous periods', () => {
          expect(Object.values(response.body.currentPeriod).length).to.be.greaterThan(0);
          expect(Object.values(response.body.previousPeriod).length).to.be.greaterThan(0);
        });

        it('returns statistics for current and previous periods', () => {
          const currentPeriodItem = response.body.currentPeriod[serviceNodeIds[0]];

          function hasValidYCoordinate(point: Coordinate) {
            return isFiniteNumber(point.y);
          }

          expect(currentPeriodItem?.cpuUsage?.some(hasValidYCoordinate)).to.be(true);
          expect(currentPeriodItem?.memoryUsage?.some(hasValidYCoordinate)).to.be(true);
          expect(currentPeriodItem?.errorRate?.some(hasValidYCoordinate)).to.be(true);
          expect(currentPeriodItem?.throughput?.some(hasValidYCoordinate)).to.be(true);
          expect(currentPeriodItem?.latency?.some(hasValidYCoordinate)).to.be(true);

          const previousPeriodItem = response.body.previousPeriod[serviceNodeIds[0]];

          expect(previousPeriodItem?.cpuUsage?.some(hasValidYCoordinate)).to.be(true);
          expect(previousPeriodItem?.memoryUsage?.some(hasValidYCoordinate)).to.be(true);
          expect(previousPeriodItem?.errorRate?.some(hasValidYCoordinate)).to.be(true);
          expect(previousPeriodItem?.throughput?.some(hasValidYCoordinate)).to.be(true);
          expect(previousPeriodItem?.latency?.some(hasValidYCoordinate)).to.be(true);
        });

        it('returns the right data for current and previous periods', () => {
          expectSnapshot(Object.values(response.body.currentPeriod).length).toMatchInline(`1`);
          expectSnapshot(Object.values(response.body.previousPeriod).length).toMatchInline(`1`);

          expectSnapshot(Object.keys(response.body.currentPeriod)).toMatchInline(`
            Array [
              "31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad",
            ]
          `);
          expectSnapshot(Object.keys(response.body.previousPeriod)).toMatchInline(`
            Array [
              "31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad",
            ]
          `);

          expectSnapshot(response.body).toMatch();
        });

        it('matches x-axis on current period and previous period', () => {
          const currentLatencyItems = response.body.currentPeriod[serviceNodeIds[0]]?.latency;
          const previousLatencyItems = response.body.previousPeriod[serviceNodeIds[0]]?.latency;

          expect(currentLatencyItems?.map(({ x }) => x)).to.be.eql(
            previousLatencyItems?.map(({ x }) => x)
          );
        });
      });
    }
  );
}
