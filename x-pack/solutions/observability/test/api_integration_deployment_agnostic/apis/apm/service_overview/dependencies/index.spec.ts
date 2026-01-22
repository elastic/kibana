/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { DependencyNode } from '@kbn/apm-plugin/common/connections';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { NodeType } from '@kbn/apm-plugin/common/connections';
import { SPANS_PER_DESTINATION_METRIC } from '@kbn/synthtrace/src/lib/apm/aggregators/create_span_metrics_aggregator';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { roundNumber } from '../../utils/common';
import { generateData, dataConfig } from './generate_data';
import { generateManyDependencies } from '../../dependencies/generate_many_dependencies';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const bucketSize = Math.round((end - start) / (60 * 1000));

  const serviceName = 'synth-go';

  async function callApi(serviceNameOverride?: string) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
      params: {
        path: { serviceName: serviceNameOverride ?? serviceName },
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

  describe('Dependency for service', () => {
    describe('when data is not loaded', () => {
      it('handles empty state #1', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.serviceDependencies).to.be.empty();
      });
    });

    describe('when specific data is loaded', () => {
      let dependencies: APIReturnType<'GET /internal/apm/services/{serviceName}/dependencies'>;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateData({ apmSynthtraceEsClient, start, end });
        const response = await callApi();
        dependencies = response.body;
      });

      after(() => apmSynthtraceEsClient.clean());

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

        const { transaction, rate, errorRate } = dataConfig;

        // Example: ((20 successful + 5 errors) × span duration x 5 spans per metric x 1000 (convert to microseconds)) / ((20 successful + 5 errors) × 5 spans per metric) = 1000 ms
        const expectedValue =
          ((rate + errorRate) * transaction.duration * SPANS_PER_DESTINATION_METRIC * 1000) /
          ((rate + errorRate) * SPANS_PER_DESTINATION_METRIC);
        expect(latency.value).to.be(expectedValue);
        expect(latency.timeseries?.every(({ y }) => y === expectedValue)).to.be(true);
      });

      it('returns the correct throughput', () => {
        const {
          currentStats: { throughput },
        } = dependencies.serviceDependencies[0];
        const { rate, errorRate } = dataConfig;

        // Example: (20 successful + 5 errors) × 5 spans per metric = 125 spans per minute
        const expectedThroughput = (rate + errorRate) * SPANS_PER_DESTINATION_METRIC;
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
        const { rate, errorRate, transaction } = dataConfig;

        // Example: (20 successful + 5 errors) × 5 spans per metric × 1000 transaction duration × 1000 (convert to microseconds)  = 125.000.000 us
        const expectedValuePerBucket =
          (rate + errorRate) * SPANS_PER_DESTINATION_METRIC * transaction.duration * 1000;
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

    describe('when a high volume of data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateManyDependencies({ apmSynthtraceEsClient, from: start, to: end });
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns dependency data without error', async () => {
        const response = await callApi('synth-java-0');
        expect(response.status).to.be(200);
        expect(response.body.serviceDependencies.length).to.be.greaterThan(0);
      });
    });
  });
}
