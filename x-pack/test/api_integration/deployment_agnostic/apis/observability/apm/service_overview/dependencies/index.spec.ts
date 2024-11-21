/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { last, pick } from 'lodash';
import type { ValuesType } from 'utility-types';
import { type Node, NodeType } from '@kbn/apm-plugin/common/connections';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '@kbn/apm-plugin/common/environment_filter_values';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { roundNumber } from '../../utils/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import { apmDependenciesMapping, createServiceDependencyDocs } from './es_utils';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const es = getService('es');

  const { start, end } = {
    start: '2021-08-03T06:50:15.910Z',
    end: '2021-08-03T07:20:15.910Z',
  };

  function getName(node: Node) {
    return node.type === NodeType.service ? node.serviceName : node.dependencyName;
  }

  describe('Service Overview', () => {
    describe('Dependencies', () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/{serviceName}/dependencies`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                start,
                end,
                numBuckets: 20,
                environment: ENVIRONMENT_ALL.value,
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body.serviceDependencies).to.eql([]);
        });
      });

      describe('when specific data is loaded', () => {
        let response: {
          status: number;
          body: APIReturnType<'GET /internal/apm/services/{serviceName}/dependencies'>;
        };

        const indices = {
          metric: 'apm-dependencies-metric',
          transaction: 'apm-dependencies-transaction',
          span: 'apm-dependencies-span',
        };

        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();

        after(async () => {
          const allIndices = Object.values(indices).join(',');
          const indexExists = await es.indices.exists({ index: allIndices });
          if (indexExists) {
            await es.indices.delete({
              index: allIndices,
            });
          }
        });

        before(async () => {
          await es.indices.create({
            index: indices.metric,
            body: {
              mappings: apmDependenciesMapping,
            },
          });

          await es.indices.create({
            index: indices.transaction,
            body: {
              mappings: apmDependenciesMapping,
            },
          });

          await es.indices.create({
            index: indices.span,
            body: {
              mappings: apmDependenciesMapping,
            },
          });

          const docs = [
            ...createServiceDependencyDocs({
              service: {
                name: 'opbeans-java',
                environment: 'production',
              },
              agentName: 'java',
              span: {
                type: 'external',
                subtype: 'http',
              },
              resource: 'opbeans-node:3000',
              outcome: 'success',
              responseTime: {
                count: 2,
                sum: 10,
              },
              time: startTime,
              to: {
                service: {
                  name: 'opbeans-node',
                },
                agentName: 'nodejs',
              },
            }),
            ...createServiceDependencyDocs({
              service: {
                name: 'opbeans-java',
                environment: 'production',
              },
              agentName: 'java',
              span: {
                type: 'external',
                subtype: 'http',
              },
              resource: 'opbeans-node:3000',
              outcome: 'failure',
              responseTime: {
                count: 1,
                sum: 10,
              },
              time: startTime,
            }),
            ...createServiceDependencyDocs({
              service: {
                name: 'opbeans-java',
                environment: 'production',
              },
              agentName: 'java',
              span: {
                type: 'external',
                subtype: 'http',
              },
              resource: 'postgres',
              outcome: 'success',
              responseTime: {
                count: 1,
                sum: 3,
              },
              time: startTime,
            }),
            ...createServiceDependencyDocs({
              service: {
                name: 'opbeans-java',
                environment: 'production',
              },
              agentName: 'java',
              span: {
                type: 'external',
                subtype: 'http',
              },
              resource: 'opbeans-node-via-proxy',
              outcome: 'success',
              responseTime: {
                count: 1,
                sum: 1,
              },
              time: endTime - 1,
              to: {
                service: {
                  name: 'opbeans-node',
                },
                agentName: 'nodejs',
              },
            }),
          ];

          const bulkActions = docs.reduce(
            (prev, doc) => {
              return [...prev, { index: { _index: indices[doc.processor.event] } }, doc];
            },
            [] as Array<
              | {
                  index: {
                    _index: string;
                  };
                }
              | ValuesType<typeof docs>
            >
          );

          await es.bulk({
            body: bulkActions,
            refresh: 'wait_for',
          });

          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/{serviceName}/dependencies`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                start,
                end,
                numBuckets: 20,
                environment: ENVIRONMENT_ALL.value,
              },
            },
          });
        });

        it('returns a 200', () => {
          expect(response.status).to.be(200);
        });

        it('returns two dependencies', () => {
          expect(response.body.serviceDependencies.length).to.be(2);
        });

        it('returns opbeans-node as a dependency', () => {
          const opbeansNode = response.body.serviceDependencies.find(
            (item) => getName(item.location) === 'opbeans-node'
          );

          expect(opbeansNode !== undefined).to.be(true);

          const values = {
            latency: roundNumber(opbeansNode?.currentStats.latency.value),
            throughput: roundNumber(opbeansNode?.currentStats.throughput.value),
            errorRate: roundNumber(opbeansNode?.currentStats.errorRate.value),
            impact: opbeansNode?.currentStats.impact,
            ...pick(opbeansNode?.location, 'serviceName', 'type', 'agentName', 'environment'),
          };

          const count = 4;
          const sum = 21;
          const errors = 1;

          expect(values).to.eql({
            agentName: 'nodejs',
            environment: ENVIRONMENT_NOT_DEFINED.value,
            serviceName: 'opbeans-node',
            type: 'service',
            errorRate: roundNumber(errors / count),
            latency: roundNumber(sum / count),
            throughput: roundNumber(count / ((endTime - startTime) / 1000 / 60)),
            impact: 100,
          });

          const firstValue = roundNumber(opbeansNode?.currentStats.latency.timeseries[0].y);
          const lastValue = roundNumber(last(opbeansNode?.currentStats.latency.timeseries)?.y);

          expect(firstValue).to.be(roundNumber(20 / 3));
          expect(lastValue).to.be(1);
        });

        it('returns postgres as an external dependency', () => {
          const postgres = response.body.serviceDependencies.find(
            (item) => getName(item.location) === 'postgres'
          );

          expect(postgres !== undefined).to.be(true);

          const values = {
            latency: roundNumber(postgres?.currentStats.latency.value),
            throughput: roundNumber(postgres?.currentStats.throughput.value),
            errorRate: roundNumber(postgres?.currentStats.errorRate.value),
            impact: postgres?.currentStats.impact,
            ...pick(postgres?.location, 'spanType', 'spanSubtype', 'dependencyName', 'type'),
          };

          const count = 1;
          const sum = 3;
          const errors = 0;

          expect(values).to.eql({
            spanType: 'external',
            spanSubtype: 'http',
            dependencyName: 'postgres',
            type: 'dependency',
            errorRate: roundNumber(errors / count),
            latency: roundNumber(sum / count),
            throughput: roundNumber(count / ((endTime - startTime) / 1000 / 60)),
            impact: 0,
          });
        });
      });

      // UNSUPPORTED TEST CASES - when data is loaded
      // TODO: These tests should be migrated to use synthtrace: https://github.com/elastic/kibana/issues/200743
    });
  });
}
