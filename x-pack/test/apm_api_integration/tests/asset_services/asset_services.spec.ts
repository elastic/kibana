/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import {
  apm,
  timerange,
  log,
  generateShortId,
  Instance,
  Serializable,
} from '@kbn/apm-synthtrace-client';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import expect from '@kbn/expect';
import moment from 'moment';
import {
  APIReturnType,
  APIClientRequestParamsOf,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const assetsSynthtraceClient = getService('assetsSynthtraceEsClient');

  const start = new Date(moment().subtract(10, 'minutes').valueOf()).toISOString();
  const end = new Date(moment().valueOf()).toISOString();
  const range = timerange(start, end);

  async function getServiceAssets(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/assets/services'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/assets/services',
      params: {
        query: {
          start,
          end,
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  let response: {
    status: number;
    body: APIReturnType<'GET /internal/apm/assets/services'>;
  };

  registry.when('Asset services when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      response = await getServiceAssets({ query: { start, end } });
      expect(response.status).to.be(200);
      expect(response.body.services.length).to.be(0);
    });
  });

  registry.when('Asset services when data is loaded', { config: 'basic', archives: [] }, () => {
    before(async () => {
      const transactionName = '240rpm/75% 1000ms';

      const successfulTimestamps = range.interval('1m').rate(1);
      const failedTimestamps = range.interval('1m').rate(1);
      const serviceNames = ['multisignal-service', 'apm-only-service'];

      const instances = serviceNames.map((serviceName) =>
        apm
          .service({ name: serviceName, environment: 'testing', agentName: 'nodejs' })
          .instance('instance')
      );
      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(1000)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp),
              instance
                .span({ spanName: 'custom_operation', spanType: 'custom' })
                .duration(100)
                .success()
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
                .timestamp(timestamp + 50)
            )
        );

        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [...successfulTraceEvents, ...failedTraceEvents, ...metricsets];
      };

      const logEvents = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return [
            log
              .create()
              .message('this is a log message')
              .service('logs-only-service')
              .logLevel('error')
              .defaults({
                'trace.id': generateShortId(),
                'agent.name': 'synth-agent',
              })
              .timestamp(timestamp),
            log
              .create()
              .message('this is a log message')
              .service('multisignal-service')
              .logLevel('error')
              .defaults({
                'trace.id': generateShortId(),
                'agent.name': 'synth-agent',
              })
              .timestamp(timestamp),
          ];
        });

      function* createGeneratorFromArray(arr: Array<Serializable<any>>) {
        yield* arr;
      }
      const traces = instances.flatMap((instance) => instanceSpans(instance));
      const tracesGenAssets = createGeneratorFromArray(traces);

      //
      return await assetsSynthtraceClient.index(
        Readable.from(Array.from(logEvents).concat(Array.from(tracesGenAssets)))
      );
    });

    after(async () => {
      await assetsSynthtraceClient.clean();
    });

    describe('when no additional filters are applied', () => {
      before(async () => {
        response = await getServiceAssets({ query: { start, end } });
      });

      it('returns a successful response', async () => {
        expect(response.status).to.be(200);
        expect(response.body.services.length).to.be(3);
      });

      it('returns all services', () => {
        const multisignal = response.body.services.find(
          (item) => item.service.name === 'multisignal-service'
        );

        expect(multisignal?.asset.signalTypes).to.eql({
          'asset.traces': true,
          'asset.logs': true,
        });
        expect(multisignal?.service.environment).to.be('testing');

        const apmOnly = response.body.services.find(
          (item) => item.service.name === 'apm-only-service'
        );

        expect(apmOnly?.asset.signalTypes).to.eql({ 'asset.traces': true });
        expect(apmOnly?.service.environment).to.be('testing');

        const logsOnly = response.body.services.find(
          (item) => item.service.name === 'logs-only-service'
        );

        expect(logsOnly?.asset.signalTypes).to.eql({ 'asset.logs': true });
        expect(logsOnly?.service.environment).not.to.be('testing');
      });
    });

    describe('when additional filters are applied', () => {
      it('returns no services when the time range is outside the data range', async () => {
        response = await getServiceAssets({
          query: { start: '2022-10-01T00:00:00.000Z', end: '2022-10-01T01:00:00.000Z' },
        });
        expect(response.status).to.be(200);
        expect(response.body.services.length).to.be(0);
      });

      it('returns services when the time range is within the data range', async () => {
        response = await getServiceAssets({
          query: {
            start: new Date(moment().subtract(2, 'days').valueOf()).toISOString(),
            end: new Date(moment().add(1, 'days').valueOf()).toISOString(),
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.services.length).to.be(3);
      });

      it('returns services when filtering by service.name', async () => {
        response = await getServiceAssets({
          query: { start, end, kuery: 'service.name: "logs-only-*" ' },
        });
        expect(response.status).to.be(200);
        const service = response.body.services[0];
        expect(service.service.name).to.be('logs-only-service');
        expect(service.asset.signalTypes['asset.logs']).to.be(true);
      });

      it('returns not services when filtering by a field that does not exist in assets', async () => {
        response = await getServiceAssets({
          query: { start, end, kuery: 'transaction.name: "240rpm/75% 1000ms" ' },
        });

        expect(response.status).to.be(200);
        expect(response.body.services.length).to.be(0);
      });
    });
  });
}
