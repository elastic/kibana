/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import url from 'url';
import { sortBy, pick, last } from 'lodash';
import { ValuesType } from 'utility-types';
import { Maybe } from '../../../../../../plugins/apm/typings/common';
import { isFiniteNumber } from '../../../../../../plugins/apm/common/utils/is_finite_number';
import { APIReturnType } from '../../../../../../plugins/apm/public/services/rest/createCallApmApi';
import { ENVIRONMENT_ALL } from '../../../../../../plugins/apm/common/environment_filter_values';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import archives from '../../../../common/archives_metadata';
import { apmDependenciesMapping, createServiceDependencyDocs } from './es_utils';

const round = (num: Maybe<number>): string => (isFiniteNumber(num) ? num.toPrecision(4) : '');

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  describe('Service overview dependencies', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/dependencies`,
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql([]);
      });
    });

    describe('when specific data is loaded', () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;
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
        const indexExists = (await es.indices.exists({ index: allIndices })).body;
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

        response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/dependencies`,
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          })
        );
      });

      it('returns a 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns two dependencies', () => {
        expect(response.body.length).to.be(2);
      });

      it('returns opbeans-node as a dependency', () => {
        const opbeansNode = response.body.find(
          (item) => item.type === 'service' && item.serviceName === 'opbeans-node'
        );

        expect(opbeansNode !== undefined).to.be(true);

        const values = {
          latency: round(opbeansNode?.latency.value),
          throughput: round(opbeansNode?.throughput.value),
          errorRate: round(opbeansNode?.errorRate.value),
          ...pick(opbeansNode, 'serviceName', 'type', 'agentName', 'environment', 'impact'),
        };

        const count = 4;
        const sum = 21;
        const errors = 1;

        expect(values).to.eql({
          agentName: 'nodejs',
          environment: '',
          serviceName: 'opbeans-node',
          type: 'service',
          errorRate: round(errors / count),
          latency: round(sum / count),
          throughput: round(count / ((endTime - startTime) / 1000 / 60)),
          impact: 100,
        });

        const firstValue = round(opbeansNode?.latency.timeseries[0].y);
        const lastValue = round(last(opbeansNode?.latency.timeseries)?.y);

        expect(firstValue).to.be(round(20 / 3));
        expect(lastValue).to.be('1.000');
      });

      it('returns postgres as an external dependency', () => {
        const postgres = response.body.find(
          (item) => item.type === 'external' && item.name === 'postgres'
        );

        expect(postgres !== undefined).to.be(true);

        const values = {
          latency: round(postgres?.latency.value),
          throughput: round(postgres?.throughput.value),
          errorRate: round(postgres?.errorRate.value),
          ...pick(postgres, 'spanType', 'spanSubtype', 'name', 'impact', 'type'),
        };

        const count = 1;
        const sum = 3;
        const errors = 0;

        expect(values).to.eql({
          spanType: 'external',
          spanSubtype: 'http',
          name: 'postgres',
          type: 'external',
          errorRate: round(errors / count),
          latency: round(sum / count),
          throughput: round(count / ((endTime - startTime) / 1000 / 60)),
          impact: 0,
        });
      });
    });

    describe('when data is loaded', () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;
      };

      before(async () => {
        await esArchiver.load(archiveName);

        response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/dependencies`,
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          })
        );
      });

      after(() => esArchiver.unload(archiveName));

      it('returns a successful response', () => {
        expect(response.status).to.be(200);
      });

      it('returns at least one item', () => {
        expect(response.body.length).to.be.greaterThan(0);
      });

      it('returns the right names', () => {
        const names = response.body.map((item) => item.name);
        expectSnapshot(names.sort()).toMatchInline(`
          Array [
            "opbeans-go",
            "postgresql",
          ]
        `);
      });

      it('returns the right service names', () => {
        const serviceNames = response.body
          .map((item) => (item.type === 'service' ? item.serviceName : undefined))
          .filter(Boolean);

        expectSnapshot(serviceNames.sort()).toMatchInline(`
          Array [
            "opbeans-go",
          ]
        `);
      });

      it('returns the right latency values', () => {
        const latencyValues = sortBy(
          response.body.map((item) => ({ name: item.name, latency: item.latency.value })),
          'name'
        );

        expectSnapshot(latencyValues).toMatchInline(`
          Array [
            Object {
              "latency": 38506.4285714286,
              "name": "opbeans-go",
            },
            Object {
              "latency": 5908.77272727273,
              "name": "postgresql",
            },
          ]
        `);
      });

      it('returns the right throughput values', () => {
        const throughputValues = sortBy(
          response.body.map((item) => ({ name: item.name, latency: item.throughput.value })),
          'name'
        );

        expectSnapshot(throughputValues).toMatchInline(`
          Array [
            Object {
              "latency": 0.466666666666667,
              "name": "opbeans-go",
            },
            Object {
              "latency": 3.66666666666667,
              "name": "postgresql",
            },
          ]
        `);
      });
    });
  });
}
