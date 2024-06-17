/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getAggregatedCriticalPathRootNodes } from '@kbn/apm-plugin/common';
import { apm, ApmFields, SynthtraceGenerator, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { Assign } from '@kbn/utility-types';
import { compact, invert, sortBy, uniq } from 'lodash';
import { Readable } from 'stream';
import { SupertestReturnType } from '../../common/apm_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  type Node = ReturnType<typeof getAggregatedCriticalPathRootNodes>['rootNodes'][0];
  type Metadata = NonNullable<
    SupertestReturnType<'POST /internal/apm/traces/aggregated_critical_path'>['body']['criticalPath']
  >['metadata'][string];
  type HydratedNode = Assign<Node, { metadata?: Metadata; children: HydratedNode[] }>;

  interface FormattedNode {
    name: string;
    value: number;
    children: FormattedNode[];
  }

  // format tree in somewhat concise format for easier testing
  function formatTree(nodes: HydratedNode[]): FormattedNode[] {
    return sortBy(
      nodes.map((node) => {
        const name =
          node.metadata?.['processor.event'] === 'transaction'
            ? node.metadata['transaction.name']
            : node.metadata?.['span.name'] || 'root';
        return { name, value: node.countExclusive, children: formatTree(node.children) };
      }),
      (node) => node.name
    );
  }

  async function fetchAndBuildCriticalPathTree(
    options: { fn: () => SynthtraceGenerator<ApmFields> } & (
      | { serviceName: string; transactionName: string }
      | {}
    )
  ) {
    const { fn } = options;

    const generator = fn();

    const unserialized = Array.from(generator);

    const serialized = unserialized.flatMap((event) => event.serialize());

    const traceIds = compact(uniq(serialized.map((event) => event['trace.id'])));

    await apmSynthtraceEsClient.index(Readable.from(unserialized));

    return apmApiClient
      .readUser({
        endpoint: 'POST /internal/apm/traces/aggregated_critical_path',
        params: {
          body: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            traceIds,
            serviceName: 'serviceName' in options ? options.serviceName : null,
            transactionName: 'transactionName' in options ? options.transactionName : null,
          },
        },
      })
      .then((response) => {
        const criticalPath = response.body.criticalPath!;

        const nodeIdByOperationId = invert(criticalPath.operationIdByNodeId);

        const { rootNodes, maxDepth } = getAggregatedCriticalPathRootNodes({
          criticalPath,
        });

        function hydrateNode(node: Node): HydratedNode {
          return {
            ...node,
            metadata: criticalPath.metadata[criticalPath.operationIdByNodeId[node.nodeId]],
            children: node.children.map(hydrateNode),
          };
        }

        return {
          rootNodes: rootNodes.map(hydrateNode),
          maxDepth,
          criticalPath,
          nodeIdByOperationId,
        };
      });
  }

  // FLAKY: https://github.com/elastic/kibana/issues/177542
  registry.when('Aggregated critical path', { config: 'basic', archives: [] }, () => {
    it('builds up the correct tree for a single transaction', async () => {
      const java = apm
        .service({ name: 'java', environment: 'production', agentName: 'java' })
        .instance('java');

      const duration = 1000;
      const rate = 10;

      const { rootNodes } = await fetchAndBuildCriticalPathTree({
        fn: () =>
          timerange(start, end)
            .interval('15m')
            .rate(rate)
            .generator((timestamp) => {
              return java.transaction('GET /api').timestamp(timestamp).duration(duration);
            }),
      });

      expect(rootNodes.length).to.be(1);

      expect(rootNodes[0].countInclusive).to.eql(duration * rate * 1000);
      expect(rootNodes[0].countExclusive).to.eql(duration * rate * 1000);

      expect(rootNodes[0].metadata).to.eql({
        'processor.event': 'transaction',
        'transaction.type': 'request',
        'service.name': 'java',
        'agent.name': 'java',
        'transaction.name': 'GET /api',
      });
    });

    it('builds up the correct tree for a complicated trace', async () => {
      const java = apm
        .service({ name: 'java', environment: 'production', agentName: 'java' })
        .instance('java');

      const rate = 10;

      const { rootNodes } = await fetchAndBuildCriticalPathTree({
        fn: () =>
          timerange(start, end)
            .interval('15m')
            .rate(rate)
            .generator((timestamp) => {
              return java
                .transaction('GET /api')
                .timestamp(timestamp)
                .duration(1000)
                .children(
                  java
                    .span('GET /_search', 'db', 'elasticsearch')
                    .timestamp(timestamp)
                    .duration(400),
                  java
                    .span('get index stats', 'custom')
                    .timestamp(timestamp)
                    .duration(500)
                    .children(
                      java
                        .span('GET /*/_stats', 'db', 'elasticsearch')
                        .timestamp(timestamp + 50)
                        .duration(450)
                    )
                );
            }),
      });

      expect(rootNodes.length).to.be(1);

      expect(rootNodes[0].countInclusive).to.eql(1000 * rate * 1000);

      expect(rootNodes[0].children.length).to.eql(1);

      expect(formatTree(rootNodes)).to.eql([
        {
          name: 'GET /api',
          value: 500 * 1000 * rate,
          children: [
            {
              name: 'get index stats',
              value: 50 * 1000 * rate,
              children: [{ name: 'GET /*/_stats', value: 450 * 1000 * rate, children: [] }],
            },
          ],
        },
      ]);
    });

    it('slices traces and merges root nodes if service name and transaction name are set', async () => {
      // this test also fails when hashCode() is used in the scripted metric aggregation,
      // due to collisions.

      const upstreamA = apm
        .service({ name: 'upstreamA', environment: 'production', agentName: 'java' })
        .instance('upstreamA');

      const upstreamB = apm
        .service({ name: 'upstreamB', environment: 'production', agentName: 'java' })
        .instance('upstreamB');

      const downstream = apm
        .service({ name: 'downstream', environment: 'production', agentName: 'java' })
        .instance('downstream');

      const rate = 10;

      function generateTrace() {
        return timerange(start, end)
          .interval('15m')
          .rate(rate)
          .generator((timestamp) => {
            return [
              upstreamA
                .transaction('GET /upstreamA')
                .timestamp(timestamp)
                .duration(500)
                .children(
                  upstreamA
                    .span('GET /downstream', 'external', 'http')
                    .timestamp(timestamp)
                    .duration(500)
                    .children(
                      downstream
                        .transaction('downstream')
                        .timestamp(timestamp + 50)
                        .duration(400)
                        .children(
                          downstream
                            .span('from upstreamA', 'custom')
                            .timestamp(timestamp + 100)
                            .duration(300)
                        )
                    )
                ),
              upstreamB
                .transaction('GET /upstreamB')
                .timestamp(timestamp)
                .duration(500)
                .children(
                  upstreamB
                    .span('GET /downstream', 'external', 'http')
                    .timestamp(timestamp)
                    .duration(500)
                    .children(
                      downstream
                        .transaction('downstream')
                        .timestamp(timestamp + 50)
                        .duration(400)
                        .children(
                          downstream
                            .span('from upstreamB', 'custom')
                            .timestamp(timestamp + 100)
                            .duration(300)
                        )
                    )
                ),
            ];
          });
      }

      const { rootNodes: unfilteredRootNodes } = await fetchAndBuildCriticalPathTree({
        fn: () => generateTrace(),
      });

      await apmSynthtraceEsClient.clean();

      const { rootNodes: filteredRootNodes } = await fetchAndBuildCriticalPathTree({
        fn: () => generateTrace(),
        serviceName: 'downstream',
        transactionName: 'downstream',
      });

      expect(formatTree(unfilteredRootNodes)).eql([
        {
          name: 'GET /upstreamA',
          value: 0,
          children: [
            {
              name: 'GET /downstream',
              value: 100 * 1000 * rate,
              children: [
                {
                  name: 'downstream',
                  value: 100 * 1000 * rate,
                  children: [
                    {
                      name: 'from upstreamA',
                      value: 300 * 1000 * rate,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'GET /upstreamB',
          value: 0,
          children: [
            {
              name: 'GET /downstream',
              value: 100 * 1000 * rate,
              children: [
                {
                  name: 'downstream',
                  value: 100 * 1000 * rate,
                  children: [
                    {
                      name: 'from upstreamB',
                      value: 300 * 1000 * rate,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      expect(formatTree(filteredRootNodes)).eql([
        {
          name: 'downstream',
          value: 2 * 100 * 1000 * rate,
          children: [
            {
              name: 'from upstreamA',
              value: 300 * 1000 * rate,
              children: [],
            },
            {
              name: 'from upstreamB',
              value: 300 * 1000 * rate,
              children: [],
            },
          ],
        },
      ]);
    });

    it('calculates the critical path for a specific transaction if its not part of the critical path of the entire trace', async () => {
      const upstream = apm
        .service({ name: 'upstream', environment: 'production', agentName: 'java' })
        .instance('upstream');

      const downstreamA = apm
        .service({ name: 'downstreamA', environment: 'production', agentName: 'java' })
        .instance('downstreamB');

      const downstreamB = apm
        .service({ name: 'downstreamB', environment: 'production', agentName: 'java' })
        .instance('downstreamB');

      const rate = 10;

      function generateTrace() {
        return timerange(start, end)
          .interval('15m')
          .rate(rate)
          .generator((timestamp) => {
            return [
              upstream
                .transaction('GET /upstream')
                .timestamp(timestamp)
                .duration(500)
                .children(
                  upstream
                    .span('GET /downstreamA', 'external', 'http')
                    .timestamp(timestamp)
                    .duration(500)
                    .children(
                      downstreamA
                        .transaction('downstreamA')
                        .timestamp(timestamp + 50)
                        .duration(400)
                    ),
                  upstream
                    .span('GET /downstreamB', 'external', 'http')
                    .timestamp(timestamp)
                    .duration(400)
                    .children(
                      downstreamB
                        .transaction('downstreamB')
                        .timestamp(timestamp + 50)
                        .duration(400)
                    )
                ),
            ];
          });
      }

      const { rootNodes: unfilteredRootNodes } = await fetchAndBuildCriticalPathTree({
        fn: () => generateTrace(),
      });

      expect(formatTree(unfilteredRootNodes)[0].children[0].children).to.eql([
        {
          name: 'downstreamA',
          value: 400 * rate * 1000,
          children: [],
        },
      ]);

      await apmSynthtraceEsClient.clean();

      const { rootNodes: filteredRootNodes } = await fetchAndBuildCriticalPathTree({
        fn: () => generateTrace(),
        serviceName: 'downstreamB',
        transactionName: 'downstreamB',
      });

      expect(formatTree(filteredRootNodes)).to.eql([
        {
          name: 'downstreamB',
          value: 400 * rate * 1000,
          children: [],
        },
      ]);
    });

    after(() => apmSynthtraceEsClient.clean());
  });
}
