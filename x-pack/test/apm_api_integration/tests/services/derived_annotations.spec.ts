/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';

import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function annotationApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');

  const dates = [
    new Date('2021-02-01T00:00:00.000Z'),
    new Date('2021-02-01T01:00:00.000Z'),
    new Date('2021-02-01T02:00:00.000Z'),
    new Date('2021-02-01T03:00:00.000Z'),
  ];

  const indexName = 'apm-8.0.0-transaction';

  registry.when(
    'Derived deployment annotations with a basic license',
    { config: 'basic', archives: [] },
    () => {
      describe('when there are multiple service versions', () => {
        let response: APIReturnType<'GET /api/apm/services/{serviceName}/annotation/search'>;

        before(async () => {
          const indexExists = await es.indices.exists({ index: indexName });
          if (indexExists) {
            await es.indices.delete({
              index: indexName,
            });
          }

          await es.indices.create({
            index: indexName,
            body: {
              mappings: {
                properties: {
                  service: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                      version: {
                        type: 'keyword',
                      },
                      environment: {
                        type: 'keyword',
                      },
                    },
                  },
                  transaction: {
                    properties: {
                      type: {
                        type: 'keyword',
                      },
                      duration: {
                        type: 'long',
                      },
                    },
                  },
                  processor: {
                    properties: {
                      event: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
            },
          });

          const docs = dates.flatMap((date, index) => {
            const baseAnnotation = {
              transaction: {
                type: 'request',
                duration: 1000000,
              },

              service: {
                name: 'opbeans-java',
                environment: 'production',
                version: index + 1,
              },
              processor: {
                event: 'transaction',
              },
            };
            return [
              {
                ...baseAnnotation,
                '@timestamp': date.toISOString(),
              },
              {
                ...baseAnnotation,
                '@timestamp': new Date(date.getTime() + 30000),
              },
              {
                ...baseAnnotation,
                '@timestamp': new Date(date.getTime() + 60000),
              },
            ];
          });

          await es.bulk({
            index: indexName,
            body: docs.flatMap((doc) => [{ index: {} }, doc]),
            refresh: true,
          });

          response = (
            await apmApiClient.readUser({
              endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
              params: {
                path: {
                  serviceName: 'opbeans-java',
                },
                query: {
                  start: dates[1].toISOString(),
                  end: dates[2].toISOString(),
                  environment: 'production',
                },
              },
            })
          ).body;
        });

        it('annotations are displayed for the service versions in the given time range', async () => {
          expect(response.annotations.length).to.be(2);
          expect(response.annotations[0]['@timestamp']).to.be(dates[1].getTime());
          expect(response.annotations[1]['@timestamp']).to.be(dates[2].getTime());

          expectSnapshot(response.annotations[0]).toMatchInline(`
            Object {
              "@timestamp": 1612141200000,
              "id": "2",
              "text": "2",
              "type": "version",
            }
          `);
        });

        it('annotations are not displayed for the service versions outside of the given time range', () => {
          expect(
            response.annotations.some((annotation) => {
              return (
                annotation['@timestamp'] !== dates[0].getTime() &&
                annotation['@timestamp'] !== dates[2].getTime()
              );
            })
          );
        });

        after(async () => {
          await es.indices.delete({
            index: indexName,
          });
        });
      });
    }
  );
}
