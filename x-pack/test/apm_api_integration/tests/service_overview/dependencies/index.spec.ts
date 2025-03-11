/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DependencyNode, NodeType } from '@kbn/apm-plugin/common/connections';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { roundNumber } from '../../../utils';
import { dataConfig, generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const bucketSize = Math.round((end - start) / (60 * 1000));

  const serviceName = 'synth-go';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
      params: {
        path: { serviceName },
        query: {
          environment: 'production',
          numBuckets: 20,
          offset: '1d',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when(
    'Service overview dependencies when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);
        expect(body.serviceDependencies).to.be.empty();
      });
    }
  );

  registry.when('Service overview dependencies', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded ', () => {
      let dependencies: APIReturnType<'GET /internal/apm/services/{serviceName}/dependencies'>;

      after(() => apmSynthtraceEsClient.clean());

      before(async () => {
        await generateData({ apmSynthtraceEsClient, start, end });
        const response = await callApi();
        dependencies = response.body;
      });

      it('returns one dependency', () => {
        expect(dependencies.serviceDependencies.length).to.be(1);
      });

      it('returns correct dependency information', () => {
        const location = dependencies.serviceDependencies[0].location as DependencyNode;
        const { span } = dataConfig;

        expect(location.type).to.be(NodeType.dependency);
        expect(location.dependencyName).to.be(span.destination);
        expect(location.spanType).to.be(span.type);
        expect(location.spanSubtype).to.be(span.subType);
        expect(location).to.have.property('id');
      });

      it("doesn't have previous stats", () => {
        expect(dependencies.serviceDependencies[0].previousStats).to.be(null);
      });

      it('has an "impact" property', () => {
        expect(dependencies.serviceDependencies[0].currentStats).to.have.property('impact');
      });

      it('returns the correct latency', () => {
        const {
          currentStats: { latency },
        } = dependencies.serviceDependencies[0];

        const { transaction } = dataConfig;

        const expectedValue = transaction.duration * 1000;
        expect(latency.value).to.be(expectedValue);
        expect(latency.timeseries?.every(({ y }) => y === expectedValue)).to.be(true);
      });

      it('returns the correct throughput', () => {
        const {
          currentStats: { throughput },
        } = dependencies.serviceDependencies[0];
        const { rate, errorRate } = dataConfig;

        const expectedThroughput = rate + errorRate;
        expect(roundNumber(throughput.value)).to.be(roundNumber(expectedThroughput));
        expect(
          throughput.timeseries?.every(
            ({ y }) => roundNumber(y) === roundNumber(expectedThroughput / bucketSize)
          )
        ).to.be(true);
      });

      it('returns the correct total time', () => {
        const {
          currentStats: { totalTime },
        } = dependencies.serviceDependencies[0];
        const { rate, transaction, errorRate } = dataConfig;

        const expectedValuePerBucket = (rate + errorRate) * transaction.duration * 1000;
        expect(totalTime.value).to.be(expectedValuePerBucket * bucketSize);
        expect(
          totalTime.timeseries?.every(
            ({ y }) => roundNumber(y) === roundNumber(expectedValuePerBucket)
          )
        ).to.be(true);
      });

      it('returns the correct error rate', () => {
        const {
          currentStats: { errorRate },
        } = dependencies.serviceDependencies[0];
        const { rate, errorRate: dataConfigErroRate } = dataConfig;
        const expectedValue = dataConfigErroRate / (rate + dataConfigErroRate);
        expect(errorRate.value).to.be(expectedValue);
        expect(errorRate.timeseries?.every(({ y }) => y === expectedValue)).to.be(true);
      });
    });
  });
}
