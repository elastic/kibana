/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { merge, cloneDeep, isPlainObject } from 'lodash';
import { JsonObject } from '@kbn/utility-types';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const DEFAULT_INDEX_NAME = 'observability-annotations';

export default function annotationApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertestRead = getService('legacySupertestAsApmReadUser');
  const supertestWrite = getService('legacySupertestAsApmAnnotationsWriteUser');
  const es = getService('es');

  function expectContainsObj(source: JsonObject, expected: JsonObject) {
    expect(source).to.eql(
      merge(cloneDeep(source), expected, (a: any, b: any) => {
        if (isPlainObject(a) && isPlainObject(b)) {
          return undefined;
        }
        return b;
      })
    );
  }

  function request({ method, url, data }: { method: string; url: string; data?: JsonObject }) {
    switch (method.toLowerCase()) {
      case 'get':
        return supertestRead.get(url).set('kbn-xsrf', 'foo');

      case 'post':
        return supertestWrite.post(url).send(data).set('kbn-xsrf', 'foo');

      default:
        throw new Error(`Unsupported method ${method}`);
    }
  }

  registry.when('Annotations with a basic license', { config: 'basic', archives: [] }, () => {
    describe('when creating an annotation', () => {
      it('fails with a 403 forbidden', async () => {
        const response = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
          data: {
            '@timestamp': new Date().toISOString(),
            message: 'New deployment',
            tags: ['foo'],
            service: {
              version: '1.1',
              environment: 'production',
            },
          },
        });

        expect(response.status).to.be(403);
        expect(response.body.message).to.be(
          'Annotations require at least a gold license or a trial license.'
        );
      });
    });
  });

  registry.when('Annotations with a trial license', { config: 'trial', archives: [] }, () => {
    describe('when creating an annotation', () => {
      afterEach(async () => {
        const indexExists = await es.indices.exists({ index: DEFAULT_INDEX_NAME });
        if (indexExists) {
          await es.indices.delete({
            index: DEFAULT_INDEX_NAME,
          });
        }
      });

      it('fails with a 400 bad request if data is missing', async () => {
        const response = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
        });

        expect(response.status).to.be(400);
      });

      it('fails with a 400 bad request if data is invalid', async () => {
        const invalidTimestampResponse = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
          data: {
            '@timestamp': 'foo',
            message: 'foo',
          },
        });

        expect(invalidTimestampResponse.status).to.be(400);

        const missingServiceVersionResponse = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
          data: {
            '@timestamp': new Date().toISOString(),
            message: 'New deployment',
          },
        });

        expect(missingServiceVersionResponse.status).to.be(400);
      });

      it('completes with a 200 and the created annotation if data is complete and valid', async () => {
        const timestamp = new Date().toISOString();

        const response = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
          data: {
            '@timestamp': timestamp,
            message: 'New deployment',
            tags: ['foo'],
            service: {
              version: '1.1',
              environment: 'production',
            },
          },
        });

        expect(response.status).to.be(200);

        expectContainsObj(response.body, {
          _source: {
            annotation: {
              type: 'deployment',
            },
            tags: ['apm', 'foo'],
            message: 'New deployment',
            '@timestamp': timestamp,
            service: {
              name: 'opbeans-java',
              version: '1.1',
              environment: 'production',
            },
          },
        });
      });

      it('prefills `message` and `tags`', async () => {
        const timestamp = new Date().toISOString();

        const response = await request({
          url: '/api/apm/services/opbeans-java/annotation',
          method: 'POST',
          data: {
            '@timestamp': timestamp,
            service: {
              version: '1.1',
            },
          },
        });

        expectContainsObj(response.body, {
          _source: {
            annotation: {
              type: 'deployment',
            },
            tags: ['apm'],
            message: '1.1',
            '@timestamp': timestamp,
            service: {
              name: 'opbeans-java',
              version: '1.1',
            },
          },
        });
      });
    });

    describe('when mixing stored and derived annotations', () => {
      const transactionIndexName = 'apm-8.0.0-transaction';
      const serviceName = 'opbeans-java';

      beforeEach(async () => {
        await es.indices.create({
          index: transactionIndexName,
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
                '@timestamp': {
                  type: 'date',
                },
              },
            },
          },
        });

        await es.index({
          index: transactionIndexName,
          body: {
            '@timestamp': new Date(2020, 4, 2, 18, 30).toISOString(),
            processor: {
              event: 'transaction',
            },
            service: {
              name: serviceName,
              version: '1.1',
            },
          },
          refresh: 'wait_for',
        });

        await es.index({
          index: transactionIndexName,
          body: {
            '@timestamp': new Date(2020, 4, 2, 19, 30).toISOString(),
            processor: {
              event: 'transaction',
            },
            service: {
              name: serviceName,
              version: '1.2',
              environment: 'production',
            },
          },
          refresh: 'wait_for',
        });
      });

      afterEach(async () => {
        await es.indices.delete({
          index: transactionIndexName,
        });

        const annotationIndexExists = await es.indices.exists({
          index: DEFAULT_INDEX_NAME,
        });

        if (annotationIndexExists) {
          await es.indices.delete({
            index: DEFAULT_INDEX_NAME,
          });
        }
      });

      it('returns the derived annotations if there are no stored annotations', async () => {
        const range = {
          start: new Date(2020, 4, 2, 18).toISOString(),
          end: new Date(2020, 4, 2, 20).toISOString(),
        };

        const response = await request({
          url: `/api/apm/services/${serviceName}/annotation/search?start=${range.start}&end=${range.end}&environment=ENVIRONMENT_ALL`,
          method: 'GET',
        });

        expect(response.status).to.be(200);

        expect(response.body.annotations.length).to.be(2);
        expect(response.body.annotations[0].text).to.be('1.1');
        expect(response.body.annotations[1].text).to.be('1.2');
      });

      it('returns the stored annotations only if there are any', async () => {
        const range = {
          start: new Date(2020, 4, 2, 18).toISOString(),
          end: new Date(2020, 4, 2, 23).toISOString(),
        };

        expect(
          (
            await request({
              url: `/api/apm/services/${serviceName}/annotation`,
              method: 'POST',
              data: {
                service: {
                  version: '1.3',
                },
                '@timestamp': new Date(2020, 4, 2, 21, 30).toISOString(),
              },
            })
          ).status
        ).to.be(200);

        const response = await request({
          url: `/api/apm/services/${serviceName}/annotation/search?start=${range.start}&end=${range.end}&environment=ENVIRONMENT_ALL`,
          method: 'GET',
        });

        expect(response.body.annotations.length).to.be(1);
        expect(response.body.annotations[0].text).to.be('1.3');

        const earlierRange = {
          start: new Date(2020, 4, 2, 18).toISOString(),
          end: new Date(2020, 4, 2, 20).toISOString(),
        };

        expect(
          (
            await request({
              url: `/api/apm/services/${serviceName}/annotation`,
              method: 'POST',
              data: {
                service: {
                  version: '1.3',
                },
                '@timestamp': new Date(2020, 4, 2, 21, 30).toISOString(),
              },
            })
          ).status
        ).to.be(200);

        const responseFromEarlierRange = await request({
          url: `/api/apm/services/${serviceName}/annotation/search?start=${earlierRange.start}&end=${earlierRange.end}&environment=ENVIRONMENT_ALL`,
          method: 'GET',
        });

        expect(responseFromEarlierRange.body.annotations.length).to.be(2);
        expect(responseFromEarlierRange.body.annotations[0].text).to.be('1.1');
        expect(responseFromEarlierRange.body.annotations[1].text).to.be('1.2');
      });

      it('returns stored annotations for the given environment', async () => {
        expect(
          (
            await request({
              url: `/api/apm/services/${serviceName}/annotation`,
              method: 'POST',
              data: {
                service: {
                  version: '1.3',
                },
                '@timestamp': new Date(2020, 4, 2, 21, 30).toISOString(),
              },
            })
          ).status
        ).to.be(200);

        expect(
          (
            await request({
              url: `/api/apm/services/${serviceName}/annotation`,
              method: 'POST',
              data: {
                service: {
                  version: '1.4',
                  environment: 'production',
                },
                '@timestamp': new Date(2020, 4, 2, 21, 31).toISOString(),
              },
            })
          ).status
        ).to.be(200);

        const range = {
          start: new Date(2020, 4, 2, 18).toISOString(),
          end: new Date(2020, 4, 2, 23).toISOString(),
        };

        const allEnvironmentsResponse = await request({
          url: `/api/apm/services/${serviceName}/annotation/search?start=${range.start}&end=${range.end}&environment=ENVIRONMENT_ALL`,
          method: 'GET',
        });

        expect(allEnvironmentsResponse.body.annotations.length).to.be(2);

        const productionEnvironmentResponse = await request({
          url: `/api/apm/services/${serviceName}/annotation/search?start=${range.start}&end=${range.end}&environment=production`,
          method: 'GET',
        });

        expect(productionEnvironmentResponse.body.annotations.length).to.be(1);
        expect(productionEnvironmentResponse.body.annotations[0].text).to.be('1.4');

        const missingEnvironmentsResponse = await request({
          url: `/api/apm/services/${serviceName}/annotation/search?start=${range.start}&end=${range.end}&environment=ENVIRONMENT_NOT_DEFINED`,
          method: 'GET',
        });

        expect(missingEnvironmentsResponse.body.annotations.length).to.be(1);
        expect(missingEnvironmentsResponse.body.annotations[0].text).to.be('1.3');
      });
    });
  });
}
