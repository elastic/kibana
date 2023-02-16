/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateTrace } from '../traces/generate_trace';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

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

  registry.when('Service map', { config: 'trial', archives: [] }, () => {
    describe('optional kuery param', () => {
      before(async () => {
        const go = apm
          .service({ name: 'synthbeans-go', environment: 'test', agentName: 'go' })
          .instance('synthbeans-go');
        const java = apm
          .service({ name: 'synthbeans-java', environment: 'test', agentName: 'java' })
          .instance('synthbeans-java');
        const node = apm
          .service({ name: 'synthbeans-node', environment: 'test', agentName: 'nodejs' })
          .instance('synthbeans-node');

        const events = timerange(start, end)
          .interval('15m')
          .rate(1)
          .generator((timestamp) => {
            return [
              generateTrace(timestamp, [go, java]),
              generateTrace(timestamp, [java, go], 'redis'),
              generateTrace(timestamp, [node], 'redis'),
              generateTrace(timestamp, [node, java, go], 'elasticsearch').defaults({
                'labels.name': 'node-java-go-es',
              }),
              generateTrace(timestamp, [go, node, java]),
            ];
          });
        await synthtraceEsClient.index(events);
      });

      after(() => synthtraceEsClient.clean());

      it('returns full service map when no kuery is defined', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);

        const { nodes, edges } = partitionElements(body.elements);

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

      it('returns only service nodes and connections filtered by given kuery', async () => {
        const { status, body } = await callApi({
          query: { kuery: `labels.name: "node-java-go-es"` },
        });

        expect(status).to.be(200);

        const { nodes, edges } = partitionElements(body.elements);

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
  });
}

type ConnectionElements = APIReturnType<'GET /internal/apm/service-map'>['elements'];

function partitionElements(elements: ConnectionElements) {
  const edges = elements.filter(({ data }) => 'source' in data && 'target' in data);
  const nodes = elements.filter((element) => !edges.includes(element));
  return { edges, nodes };
}

function getIds(elements: ConnectionElements) {
  return elements.map(({ data }) => data.id).sort();
}
