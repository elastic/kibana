/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie } from 'tough-cookie';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { DataViewType } from '@kbn/data-views-plugin/common';
import { verifyErrorResponse } from '@kbn/test-suites-src/api_integration/apis/search/verify_error';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');
  const supertestNoAuth = getService('supertestWithoutAuth');

  const shardDelayAgg = (delay: string) => ({
    aggs: {
      delay: {
        shard_delay: {
          value: delay,
        },
      },
    },
  });

  async function markRequiresShardDelayAgg(testContext: Mocha.Context) {
    const body = await es.info();
    if (!body.version.number.includes('SNAPSHOT')) {
      log.debug('Skipping because this build does not have the required shard_delay agg');
      testContext.skip();
    }
  }

  describe('search', () => {
    before(async () => {
      // ensure es not empty
      await es.index({
        index: 'search-api-test',
        id: 'search-api-test-doc',
        body: { message: 'test doc' },
        refresh: 'wait_for',
      });
    });
    after(async () => {
      await es.indices.delete({
        index: 'search-api-test',
      });
    });

    describe('post', () => {
      it('should return 200 with final response without search id if wait_for_completion_timeout is long enough', async function () {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
              wait_for_completion_timeout: '10s',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).to.be(undefined);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body).to.have.property('rawResponse');
      });

      it('should return 200 with search id and partial response if wait_for_completion_timeout is not long enough', async function () {
        await markRequiresShardDelayAgg(this);

        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
                ...shardDelayAgg('3s'),
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).not.to.be(undefined);
        expect(resp.body.isPartial).to.be(true);
        expect(resp.body.isRunning).to.be(true);
        expect(resp.body).to.have.property('rawResponse');
      });

      it('should retrieve results from completed search with search id', async function () {
        await markRequiresShardDelayAgg(this);

        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
                ...shardDelayAgg('3s'),
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).not.to.be(undefined);
        expect(resp.body.isPartial).to.be(true);
        expect(resp.body.isRunning).to.be(true);

        await new Promise((resolve) => setTimeout(resolve, 3000));

        await retry.tryForTime(15000, async () => {
          const resp2 = await supertest
            .post(`/internal/search/ese/${id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(200);

          expect(resp2.body.id).not.to.be(undefined);
          expect(resp2.body.isPartial).to.be(false);
          expect(resp2.body.isRunning).to.be(false);

          return true;
        });
      });

      it('should retrieve results from in-progress search with search id', async function () {
        await markRequiresShardDelayAgg(this);

        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
                ...shardDelayAgg('10s'),
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).not.to.be(undefined);
        expect(resp.body.isPartial).to.be(true);
        expect(resp.body.isRunning).to.be(true);

        const resp2 = await supertest
          .post(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(200);

        expect(resp2.body.id).not.to.be(undefined);
        expect(resp2.body.isPartial).to.be(true);
        expect(resp2.body.isRunning).to.be(true);
      });

      it('should cancel an async search without server crash', async function () {
        await markRequiresShardDelayAgg(this);

        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
                ...shardDelayAgg('10s'),
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).not.to.be(undefined);
        expect(resp.body.isPartial).to.be(true);
        expect(resp.body.isRunning).to.be(true);

        // Send a follow-up request that waits up to 10s for completion
        const req = supertest
          .post(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({ params: { wait_for_completion_timeout: '10s' } })
          .expect(200);

        // After 2s, abort and send the cancellation (to result in a race towards cancellation)
        // This should be swallowed and not kill the Kibana server
        await new Promise((resolve) =>
          setTimeout(() => {
            void req.abort(); // Explicitly ignore any potential promise
            resolve(null);
          }, 2000)
        );
        await supertest
          .delete(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .expect(200);

        let err: Error | undefined;
        try {
          await req;
        } catch (e) {
          err = e;
        }

        expect(err).not.to.be(undefined);

        // Ensure the search was succesfully cancelled
        await supertest
          .post(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(404);
      });

      it('should fail without kbn-xref header', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'Request must contain a kbn-xsrf header.');
      });

      it('should return 400 if invalid id is provided', async () => {
        const resp = await supertest
          .post(`/internal/search/ese/123`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      it('should return 404 if unknown id is provided', async () => {
        const resp = await supertest
          .post(
            `/internal/search/ese/FkxOb21iV1g2VGR1S2QzaWVtRU9fMVEbc3JWeWc1VHlUdDZ6MENxcXlYVG1Fdzo2NDg4`
          )
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(404);
        verifyErrorResponse(resp.body, 404, 'resource_not_found_exception', true);
      });

      it('should return 400 with a bad body', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                index: 'nope nope',
                bad_query: [],
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'parsing_exception', true);
      });

      it('should return 403 for lack of privledges', async () => {
        const username = 'no_access';
        const password = 't0pS3cr3t';

        await security.user.create(username, {
          password,
          roles: ['test_shakespeare_reader'],
        });

        const loginResponse = await supertestNoAuth
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'basic',
            providerName: 'basic',
            currentURL: '/',
            params: { username, password },
          })
          .expect(200);

        const sessionCookie = parseCookie(loginResponse.headers['set-cookie'][0]);

        await supertestNoAuth
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .set('Cookie', sessionCookie!.cookieString())
          .send({
            params: {
              index: 'log*',
              body: {
                query: {
                  match_all: {},
                },
              },
              wait_for_completion_timeout: '10s',
            },
          })
          .expect(403);

        await security.testUser.restoreDefaults();
      });
    });

    describe('rollup', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/hybrid/rollup');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/hybrid/rollup');
      });

      it('should return 400 if rollup search is called without index', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: DataViewType.ROLLUP,
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);
        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      it('should return 400 if rollup search is without non-existent index', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: DataViewType.ROLLUP,
            params: {
              index: 'banana',
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      it('should rollup search', async () => {
        await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: DataViewType.ROLLUP,
            params: {
              index: 'rollup_logstash',
              size: 0,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);
      });
    });

    describe('delete', () => {
      it('should return 404 when no search id provided', async () => {
        await supertest
          .delete(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(404);
      });

      it('should return 400 when trying a delete a bad id', async () => {
        const resp = await supertest
          .delete(`/internal/search/ese/123`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(400);

        expect(resp.body.statusCode).to.be(400);
        expect(resp.body.message).to.include.string('illegal_argument_exception');
        expect(resp.body).to.have.property('attributes');
        expect(resp.body.attributes).to.have.property('root_cause');
      });

      it('should delete an in-progress search', async function () {
        await markRequiresShardDelayAgg(this);

        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
                ...shardDelayAgg('10s'),
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).not.to.be(undefined);
        expect(resp.body.isPartial).to.be(true);
        expect(resp.body.isRunning).to.be(true);

        await supertest
          .delete(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(200);

        // try to re-fetch
        await supertest
          .post(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(404);
      });

      it('should delete a completed search', async function () {
        await markRequiresShardDelayAgg(this);

        const resp = await supertest
          .post(`/internal/search/ese`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
                ...shardDelayAgg('3s'),
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).not.to.be(undefined);
        expect(resp.body.isPartial).to.be(true);
        expect(resp.body.isRunning).to.be(true);

        await new Promise((resolve) => setTimeout(resolve, 3000));

        await retry.tryForTime(30000, async () => {
          const resp2 = await supertest
            .post(`/internal/search/ese/${id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, '1')
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(200);

          expect(resp2.body.id).not.to.be(undefined);
          expect(resp2.body.isPartial).to.be(false);
          expect(resp2.body.isRunning).to.be(false);

          return true;
        });

        await supertest
          .delete(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(200);

        // try to re-fetch
        await supertest
          .post(`/internal/search/ese/${id}`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(404);
      });
    });
  });
}
