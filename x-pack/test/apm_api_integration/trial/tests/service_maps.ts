/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Service Maps with a trial license', () => {
    describe('/api/apm/service-map', () => {
      describe('when there is no data', () => {
        it('returns empty list', async () => {
          const response = await supertest.get(
            '/api/apm/service-map?start=2020-06-28T10%3A24%3A46.055Z&end=2020-06-29T10%3A24%3A46.055Z'
          );

          expect(response.status).to.be(200);
          expect(response.body).to.eql({ elements: [] });
        });
      });

      describe('when there is data', () => {
        before(() => esArchiver.load('8.0.0'));
        after(() => esArchiver.unload('8.0.0'));

        it('returns service map elements', async () => {
          const response = await supertest.get(
            '/api/apm/service-map?start=2020-06-28T10%3A24%3A46.055Z&end=2020-06-29T10%3A24%3A46.055Z'
          );

          expect(response.status).to.be(200);

          expect(response.body).to.eql({
            elements: [
              {
                data: {
                  source: 'client',
                  target: 'opbeans-node',
                  id: 'client~opbeans-node',
                  sourceData: {
                    id: 'client',
                    'service.name': 'client',
                    'agent.name': 'rum-js',
                  },
                  targetData: {
                    id: 'opbeans-node',
                    'service.environment': 'production',
                    'service.name': 'opbeans-node',
                    'agent.name': 'nodejs',
                  },
                },
              },
              {
                data: {
                  source: 'opbeans-java',
                  target: '>opbeans-java:3000',
                  id: 'opbeans-java~>opbeans-java:3000',
                  sourceData: {
                    id: 'opbeans-java',
                    'service.environment': 'production',
                    'service.name': 'opbeans-java',
                    'agent.name': 'java',
                  },
                  targetData: {
                    'span.subtype': 'http',
                    'span.destination.service.resource': 'opbeans-java:3000',
                    'span.type': 'external',
                    id: '>opbeans-java:3000',
                    label: 'opbeans-java:3000',
                  },
                },
              },
              {
                data: {
                  source: 'opbeans-java',
                  target: '>postgresql',
                  id: 'opbeans-java~>postgresql',
                  sourceData: {
                    id: 'opbeans-java',
                    'service.environment': 'production',
                    'service.name': 'opbeans-java',
                    'agent.name': 'java',
                  },
                  targetData: {
                    'span.subtype': 'postgresql',
                    'span.destination.service.resource': 'postgresql',
                    'span.type': 'db',
                    id: '>postgresql',
                    label: 'postgresql',
                  },
                },
              },
              {
                data: {
                  source: 'opbeans-java',
                  target: 'opbeans-node',
                  id: 'opbeans-java~opbeans-node',
                  sourceData: {
                    id: 'opbeans-java',
                    'service.environment': 'production',
                    'service.name': 'opbeans-java',
                    'agent.name': 'java',
                  },
                  targetData: {
                    id: 'opbeans-node',
                    'service.environment': 'production',
                    'service.name': 'opbeans-node',
                    'agent.name': 'nodejs',
                  },
                  bidirectional: true,
                },
              },
              {
                data: {
                  source: 'opbeans-node',
                  target: '>93.184.216.34:80',
                  id: 'opbeans-node~>93.184.216.34:80',
                  sourceData: {
                    id: 'opbeans-node',
                    'service.environment': 'production',
                    'service.name': 'opbeans-node',
                    'agent.name': 'nodejs',
                  },
                  targetData: {
                    'span.subtype': 'http',
                    'span.destination.service.resource': '93.184.216.34:80',
                    'span.type': 'external',
                    id: '>93.184.216.34:80',
                    label: '93.184.216.34:80',
                  },
                },
              },
              {
                data: {
                  source: 'opbeans-node',
                  target: '>postgresql',
                  id: 'opbeans-node~>postgresql',
                  sourceData: {
                    id: 'opbeans-node',
                    'service.environment': 'production',
                    'service.name': 'opbeans-node',
                    'agent.name': 'nodejs',
                  },
                  targetData: {
                    'span.subtype': 'postgresql',
                    'span.destination.service.resource': 'postgresql',
                    'span.type': 'db',
                    id: '>postgresql',
                    label: 'postgresql',
                  },
                },
              },
              {
                data: {
                  source: 'opbeans-node',
                  target: '>redis',
                  id: 'opbeans-node~>redis',
                  sourceData: {
                    id: 'opbeans-node',
                    'service.environment': 'production',
                    'service.name': 'opbeans-node',
                    'agent.name': 'nodejs',
                  },
                  targetData: {
                    'span.subtype': 'redis',
                    'span.destination.service.resource': 'redis',
                    'span.type': 'cache',
                    id: '>redis',
                    label: 'redis',
                  },
                },
              },
              {
                data: {
                  source: 'opbeans-node',
                  target: 'opbeans-java',
                  id: 'opbeans-node~opbeans-java',
                  sourceData: {
                    id: 'opbeans-node',
                    'service.environment': 'production',
                    'service.name': 'opbeans-node',
                    'agent.name': 'nodejs',
                  },
                  targetData: {
                    id: 'opbeans-java',
                    'service.environment': 'production',
                    'service.name': 'opbeans-java',
                    'agent.name': 'java',
                  },
                  isInverseEdge: true,
                },
              },
              {
                data: {
                  id: 'opbeans-java',
                  'service.environment': 'production',
                  'service.name': 'opbeans-java',
                  'agent.name': 'java',
                },
              },
              {
                data: {
                  id: 'opbeans-node',
                  'service.environment': 'production',
                  'service.name': 'opbeans-node',
                  'agent.name': 'nodejs',
                },
              },
              {
                data: {
                  'span.subtype': 'http',
                  'span.destination.service.resource': 'opbeans-java:3000',
                  'span.type': 'external',
                  id: '>opbeans-java:3000',
                  label: 'opbeans-java:3000',
                },
              },
              {
                data: {
                  id: 'client',
                  'service.name': 'client',
                  'agent.name': 'rum-js',
                },
              },
              {
                data: {
                  'span.subtype': 'redis',
                  'span.destination.service.resource': 'redis',
                  'span.type': 'cache',
                  id: '>redis',
                  label: 'redis',
                },
              },
              {
                data: {
                  'span.subtype': 'postgresql',
                  'span.destination.service.resource': 'postgresql',
                  'span.type': 'db',
                  id: '>postgresql',
                  label: 'postgresql',
                },
              },
              {
                data: {
                  'span.subtype': 'http',
                  'span.destination.service.resource': '93.184.216.34:80',
                  'span.type': 'external',
                  id: '>93.184.216.34:80',
                  label: '93.184.216.34:80',
                },
              },
            ],
          });
        });
      });
    });

    describe('/api/apm/service-map/service/{serviceName}', () => {
      describe('when there is no data', () => {
        it('returns an object with nulls', async () => {
          const q = querystring.stringify({
            start: '2020-06-28T10:24:46.055Z',
            end: '2020-06-29T10:24:46.055Z',
            uiFilters: {},
          });
          const response = await supertest.get(`/api/apm/service-map/service/opbeans-node?${q}`);

          expect(response.status).to.be(200);

          expect(response.body).to.eql({
            avgCpuUsage: null,
            avgErrorRate: null,
            avgMemoryUsage: null,
            transactionStats: {
              avgRequestsPerMinute: null,
              avgTransactionDuration: null,
            },
          });
        });
      });
    });
  });
}
