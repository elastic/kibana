/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '@kbn/apm-plugin/common/environment_filter_values';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import { cloneDeep, isPlainObject, merge } from 'lodash';
import { ApmApiError } from '../../common/apm_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { expectToReject } from '../../common/utils/expect_to_reject';

const DEFAULT_INDEX_NAME = 'observability-annotations';

export default function annotationApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');

  function expectContainsObj(
    source: APIReturnType<'POST /api/apm/services/{serviceName}/annotation'>,
    expected: JsonObject
  ) {
    expect(source).to.eql(
      merge(cloneDeep(source), expected, (a: any, b: any) => {
        if (isPlainObject(a) && isPlainObject(b)) {
          return undefined;
        }
        return b;
      })
    );
  }

  function createAnnotation(
    body: APIClientRequestParamsOf<'POST /api/apm/services/{serviceName}/annotation'>['params']['body']
  ) {
    return apmApiClient.annotationWriterUser({
      endpoint: 'POST /api/apm/services/{serviceName}/annotation',
      params: {
        path: {
          serviceName: 'opbeans-java',
        },
        body,
      },
    });
  }

  function getAnnotation(
    query: RecursivePartial<
      APIClientRequestParamsOf<'GET /api/apm/services/{serviceName}/annotation/search'>['params']['query']
    >
  ) {
    return apmApiClient.readUser({
      endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
      params: {
        path: {
          serviceName: 'opbeans-java',
        },
        query: {
          environment: ENVIRONMENT_ALL.value,
          start: new Date().toISOString(),
          end: new Date().toISOString(),
          ...query,
        },
      },
    });
  }

  registry.when('Annotations with a basic license', { config: 'basic', archives: [] }, () => {
    describe('when creating an annotation', () => {
      it('fails with a 403 forbidden', async () => {
        const err = await expectToReject<ApmApiError>(() =>
          createAnnotation({
            '@timestamp': new Date().toISOString(),
            message: 'New deployment',
            tags: ['foo'],
            service: {
              version: '1.1',
              environment: 'production',
            },
          })
        );

        expect(err.res.status).to.be(403);
        expect(err.res.body.message).eql(
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
        const err = await expectToReject<ApmApiError>(() =>
          // @ts-expect-error
          createAnnotation()
        );

        expect(err.res.status).to.be(400);
      });

      it('fails with a 400 bad request if timestamp is invalid', async () => {
        const invalidTimestampErr = await expectToReject<ApmApiError>(() =>
          // @ts-expect-error
          createAnnotation({
            '@timestamp': 'foo',
            message: 'foo',
          })
        );

        expect(invalidTimestampErr.res.status).to.be(400);
      });

      it('fails with a 400 bad request if data is invalid', async () => {
        const err = await expectToReject<ApmApiError>(() =>
          // @ts-expect-error
          createAnnotation({
            '@timestamp': new Date().toISOString(),
            message: 'New deployment',
          })
        );

        expect(err.res.status).to.be(400);
      });

      it('completes with a 200 and the created annotation if data is complete and valid', async () => {
        const timestamp = new Date().toISOString();

        const response = await createAnnotation({
          '@timestamp': timestamp,
          message: 'New deployment',
          tags: ['foo'],
          service: {
            version: '1.1',
            environment: 'production',
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

        const response = await createAnnotation({
          '@timestamp': timestamp,
          service: {
            version: '1.1',
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

        const response = await getAnnotation({
          start: range.start,
          end: range.end,
          environment: ENVIRONMENT_ALL.value,
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
            await createAnnotation({
              service: {
                version: '1.3',
              },
              '@timestamp': new Date(2020, 4, 2, 21, 30).toISOString(),
            })
          ).status
        ).to.be(200);

        const response = await getAnnotation({
          start: range.start,
          end: range.end,
          environment: ENVIRONMENT_ALL.value,
        });

        expect(response.body.annotations.length).to.be(1);
        expect(response.body.annotations[0].text).to.be('1.3');

        const earlierRange = {
          start: new Date(2020, 4, 2, 18).toISOString(),
          end: new Date(2020, 4, 2, 20).toISOString(),
        };

        expect(
          (
            await createAnnotation({
              service: {
                version: '1.3',
              },
              '@timestamp': new Date(2020, 4, 2, 21, 30).toISOString(),
            })
          ).status
        ).to.be(200);

        const responseFromEarlierRange = await getAnnotation({
          start: earlierRange.start,
          end: earlierRange.end,
          environment: ENVIRONMENT_ALL.value,
        });

        expect(responseFromEarlierRange.body.annotations.length).to.be(2);
        expect(responseFromEarlierRange.body.annotations[0].text).to.be('1.1');
        expect(responseFromEarlierRange.body.annotations[1].text).to.be('1.2');
      });

      it('returns stored annotations for the given environment', async () => {
        expect(
          (
            await createAnnotation({
              service: {
                version: '1.3',
              },
              '@timestamp': new Date(2020, 4, 2, 21, 30).toISOString(),
            })
          ).status
        ).to.be(200);

        expect(
          (
            await createAnnotation({
              service: {
                version: '1.4',
                environment: 'production',
              },
              '@timestamp': new Date(2020, 4, 2, 21, 31).toISOString(),
            })
          ).status
        ).to.be(200);

        const range = {
          start: new Date(2020, 4, 2, 18).toISOString(),
          end: new Date(2020, 4, 2, 23).toISOString(),
        };

        const allEnvironmentsResponse = await getAnnotation({
          start: range.start,
          end: range.end,
          environment: ENVIRONMENT_ALL.value,
        });

        expect(allEnvironmentsResponse.body.annotations.length).to.be(2);

        const productionEnvironmentResponse = await getAnnotation({
          start: range.start,
          end: range.end,
          environment: 'production',
        });

        expect(productionEnvironmentResponse.body.annotations.length).to.be(1);
        expect(productionEnvironmentResponse.body.annotations[0].text).to.be('1.4');

        const missingEnvironmentsResponse = await getAnnotation({
          start: range.start,
          end: range.end,
          environment: ENVIRONMENT_NOT_DEFINED.value,
        });

        expect(missingEnvironmentsResponse.body.annotations.length).to.be(1);
        expect(missingEnvironmentsResponse.body.annotations[0].text).to.be('1.3');
      });
    });
  });
}
