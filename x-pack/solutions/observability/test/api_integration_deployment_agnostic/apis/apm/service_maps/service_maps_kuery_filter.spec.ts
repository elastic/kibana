/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { timerange, serviceMap } from '@kbn/apm-synthtrace-client';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  extractExitSpansConnections,
  getElements,
  getIds,
  getSpans,
  partitionElements,
} from './utils';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/service-map'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/service-map',
      params: {
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
  }

  describe('service map kuery filter', () => {
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      const events = timerange(start, end)
        .interval('15m')
        .rate(1)
        .generator(
          serviceMap({
            services: [
              { 'synthbeans-go': 'go' },
              { 'synthbeans-java': 'java' },
              { 'synthbeans-node': 'nodejs' },
            ],
            definePaths([go, java, node]) {
              return [
                [go, java],
                [java, go, 'redis'],
                [node, 'redis'],
                {
                  path: [node, java, go, 'elasticsearch'],
                  transaction: (t) => t.defaults({ 'labels.name': 'node-java-go-es' }),
                },
                [go, node, java],
              ];
            },
          })
        );
      await apmSynthtraceEsClient.index(events);
    });

    after(() => apmSynthtraceEsClient.clean());

    it('returns full service map when no kuery is defined', async () => {
      const { status, body } = await callApi();

      expect(status).to.be(200);

      const { nodes, edges } = partitionElements(getElements({ body }));

      expect(getIds(nodes)).to.eql([
        '>elasticsearch',
        '>redis',
        'synthbeans-go',
        'synthbeans-java',
        'synthbeans-node',
      ]);
      expect(getIds(edges)).to.eql([
        'synthbeans-go~>elasticsearch',
        'synthbeans-go~>redis',
        'synthbeans-go~synthbeans-java',
        'synthbeans-go~synthbeans-node',
        'synthbeans-java~synthbeans-go',
        'synthbeans-node~>redis',
        'synthbeans-node~synthbeans-java',
      ]);
    });

    it('returns full service map when no kuery is defined (api v2)', async () => {
      const { status, body } = await callApi({ query: { useV2: true } });

      expect(status).to.be(200);

      const spans = getSpans({ body });

      const exitSpansConnections = extractExitSpansConnections(spans);
      expect(exitSpansConnections).to.eql([
        {
          serviceName: 'synthbeans-go',
          spanDestinationServiceResource: 'elasticsearch',
        },
        {
          serviceName: 'synthbeans-go',
          spanDestinationServiceResource: 'redis',
        },
        {
          destinationService: {
            serviceName: 'synthbeans-java',
          },
          serviceName: 'synthbeans-go',
          spanDestinationServiceResource: 'synthbeans-java',
        },
        {
          destinationService: {
            serviceName: 'synthbeans-node',
          },
          serviceName: 'synthbeans-go',
          spanDestinationServiceResource: 'synthbeans-node',
        },
        {
          destinationService: {
            serviceName: 'synthbeans-go',
          },
          serviceName: 'synthbeans-java',
          spanDestinationServiceResource: 'synthbeans-go',
        },
        {
          serviceName: 'synthbeans-node',
          spanDestinationServiceResource: 'redis',
        },
        {
          destinationService: {
            serviceName: 'synthbeans-java',
          },
          serviceName: 'synthbeans-node',
          spanDestinationServiceResource: 'synthbeans-java',
        },
      ]);
    });

    it('returns only service nodes and connections filtered by given kuery', async () => {
      const { status, body } = await callApi({
        query: { kuery: `labels.name: "node-java-go-es"` },
      });

      expect(status).to.be(200);

      const { nodes, edges } = partitionElements(getElements({ body }));

      expect(getIds(nodes)).to.eql([
        '>elasticsearch',
        'synthbeans-go',
        'synthbeans-java',
        'synthbeans-node',
      ]);
      expect(getIds(edges)).to.eql([
        'synthbeans-go~>elasticsearch',
        'synthbeans-java~synthbeans-go',
        'synthbeans-node~synthbeans-java',
      ]);
    });
  });
}
