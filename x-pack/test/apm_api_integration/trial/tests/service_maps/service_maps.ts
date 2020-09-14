/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import expect from '@kbn/expect';
import { isEmpty } from 'lodash';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

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
          expect(response.body.elements.length).to.be(0);
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

          expectSnapshot(response.body).toMatchInline(`
            Object {
              "elements": Array [
                Object {
                  "data": Object {
                    "id": "client~opbeans-node",
                    "source": "client",
                    "sourceData": Object {
                      "agent.name": "rum-js",
                      "id": "client",
                      "service.name": "client",
                    },
                    "target": "opbeans-node",
                    "targetData": Object {
                      "agent.name": "nodejs",
                      "id": "opbeans-node",
                      "service.environment": "production",
                      "service.name": "opbeans-node",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "id": "opbeans-java~>opbeans-java:3000",
                    "source": "opbeans-java",
                    "sourceData": Object {
                      "agent.name": "java",
                      "id": "opbeans-java",
                      "service.environment": "production",
                      "service.name": "opbeans-java",
                    },
                    "target": ">opbeans-java:3000",
                    "targetData": Object {
                      "id": ">opbeans-java:3000",
                      "label": "opbeans-java:3000",
                      "span.destination.service.resource": "opbeans-java:3000",
                      "span.subtype": "http",
                      "span.type": "external",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "id": "opbeans-java~>postgresql",
                    "source": "opbeans-java",
                    "sourceData": Object {
                      "agent.name": "java",
                      "id": "opbeans-java",
                      "service.environment": "production",
                      "service.name": "opbeans-java",
                    },
                    "target": ">postgresql",
                    "targetData": Object {
                      "id": ">postgresql",
                      "label": "postgresql",
                      "span.destination.service.resource": "postgresql",
                      "span.subtype": "postgresql",
                      "span.type": "db",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "bidirectional": true,
                    "id": "opbeans-java~opbeans-node",
                    "source": "opbeans-java",
                    "sourceData": Object {
                      "agent.name": "java",
                      "id": "opbeans-java",
                      "service.environment": "production",
                      "service.name": "opbeans-java",
                    },
                    "target": "opbeans-node",
                    "targetData": Object {
                      "agent.name": "nodejs",
                      "id": "opbeans-node",
                      "service.environment": "production",
                      "service.name": "opbeans-node",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "id": "opbeans-node~>93.184.216.34:80",
                    "source": "opbeans-node",
                    "sourceData": Object {
                      "agent.name": "nodejs",
                      "id": "opbeans-node",
                      "service.environment": "production",
                      "service.name": "opbeans-node",
                    },
                    "target": ">93.184.216.34:80",
                    "targetData": Object {
                      "id": ">93.184.216.34:80",
                      "label": "93.184.216.34:80",
                      "span.destination.service.resource": "93.184.216.34:80",
                      "span.subtype": "http",
                      "span.type": "external",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "id": "opbeans-node~>postgresql",
                    "source": "opbeans-node",
                    "sourceData": Object {
                      "agent.name": "nodejs",
                      "id": "opbeans-node",
                      "service.environment": "production",
                      "service.name": "opbeans-node",
                    },
                    "target": ">postgresql",
                    "targetData": Object {
                      "id": ">postgresql",
                      "label": "postgresql",
                      "span.destination.service.resource": "postgresql",
                      "span.subtype": "postgresql",
                      "span.type": "db",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "id": "opbeans-node~>redis",
                    "source": "opbeans-node",
                    "sourceData": Object {
                      "agent.name": "nodejs",
                      "id": "opbeans-node",
                      "service.environment": "production",
                      "service.name": "opbeans-node",
                    },
                    "target": ">redis",
                    "targetData": Object {
                      "id": ">redis",
                      "label": "redis",
                      "span.destination.service.resource": "redis",
                      "span.subtype": "redis",
                      "span.type": "cache",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "id": "opbeans-node~opbeans-java",
                    "isInverseEdge": true,
                    "source": "opbeans-node",
                    "sourceData": Object {
                      "agent.name": "nodejs",
                      "id": "opbeans-node",
                      "service.environment": "production",
                      "service.name": "opbeans-node",
                    },
                    "target": "opbeans-java",
                    "targetData": Object {
                      "agent.name": "java",
                      "id": "opbeans-java",
                      "service.environment": "production",
                      "service.name": "opbeans-java",
                    },
                  },
                },
                Object {
                  "data": Object {
                    "agent.name": "java",
                    "id": "opbeans-java",
                    "service.environment": "production",
                    "service.name": "opbeans-java",
                  },
                },
                Object {
                  "data": Object {
                    "agent.name": "nodejs",
                    "id": "opbeans-node",
                    "service.environment": "production",
                    "service.name": "opbeans-node",
                  },
                },
                Object {
                  "data": Object {
                    "id": ">opbeans-java:3000",
                    "label": "opbeans-java:3000",
                    "span.destination.service.resource": "opbeans-java:3000",
                    "span.subtype": "http",
                    "span.type": "external",
                  },
                },
                Object {
                  "data": Object {
                    "agent.name": "rum-js",
                    "id": "client",
                    "service.name": "client",
                  },
                },
                Object {
                  "data": Object {
                    "id": ">redis",
                    "label": "redis",
                    "span.destination.service.resource": "redis",
                    "span.subtype": "redis",
                    "span.type": "cache",
                  },
                },
                Object {
                  "data": Object {
                    "id": ">postgresql",
                    "label": "postgresql",
                    "span.destination.service.resource": "postgresql",
                    "span.subtype": "postgresql",
                    "span.type": "db",
                  },
                },
                Object {
                  "data": Object {
                    "id": ">93.184.216.34:80",
                    "label": "93.184.216.34:80",
                    "span.destination.service.resource": "93.184.216.34:80",
                    "span.subtype": "http",
                    "span.type": "external",
                  },
                },
              ],
            }
          `);
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

    describe('when there is data with anomalies', () => {
      before(() => esArchiver.load('apm_8.0.0'));
      after(() => esArchiver.unload('apm_8.0.0'));

      it('returns service map elements', async () => {
        const start = encodeURIComponent('2020-09-10T06:00:00.000Z');
        const end = encodeURIComponent('2020-09-10T07:00:00.000Z');

        const response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);

        expect(response.status).to.be(200);
        const dataWithAnomalies = response.body.elements.filter(
          (el: { data: { serviceAnomalyStats?: {} } }) => !isEmpty(el.data.serviceAnomalyStats)
        );
        expect(dataWithAnomalies).to.not.empty();
        dataWithAnomalies.forEach(({ data }: any) => {
          expect(
            Object.values(data.serviceAnomalyStats).filter((value) => isEmpty(value))
          ).to.not.empty();
        });
      });
    });
  });
}
