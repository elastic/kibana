/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { verifyErrorResponse } from '../../../../../test/api_integration/apis/search/verify_error';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('search', () => {
    describe('post', () => {
      it('should return 200 with final response if wait_for_completion_timeout is long enough', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
              wait_for_completion_timeout: '1000s',
            },
          })
          .expect(200);

        const { id } = resp.body;
        expect(id).to.be(undefined);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body).to.have.property('rawResponse');
      });

      it('should return 200 with partial response if wait_for_completion_timeout is not long enough', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
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

      it('should retrieve results with id', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const resp2 = await supertest
          .post(`/internal/search/ese/${id}`)
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(200);

        expect(resp2.body.id).not.to.be(undefined);
        expect(resp2.body.isPartial).to.be(false);
        expect(resp2.body.isRunning).to.be(false);
      });

      it('should fail without kbn-xref header', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
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

      it('should return 400 when unknown index type is provided', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: 'baad',
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'Unknown indexType');
      });

      it('should return 400 if invalid id is provided', async () => {
        const resp = await supertest
          .post(`/internal/search/ese/123`)
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

      it('should return 404 if unkown id is provided', async () => {
        const resp = await supertest
          .post(
            `/internal/search/ese/FkxOb21iV1g2VGR1S2QzaWVtRU9fMVEbc3JWeWc1VHlUdDZ6MENxcXlYVG1Fdzo2NDg4`
          )
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
    });

    describe('rollup', () => {
      before(async () => {
        await esArchiver.load('hybrid/rollup');
      });
      after(async () => {
        await esArchiver.unload('hybrid/rollup');
      });

      it('should return 400 if rollup search is called without index', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: 'rollup',
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
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: 'rollup',
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
          .set('kbn-xsrf', 'foo')
          .send({
            indexType: 'rollup',
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
        await supertest.delete(`/internal/search/ese`).set('kbn-xsrf', 'foo').send().expect(404);
      });

      it('should return 400 when trying a delete a bad id', async () => {
        const resp = await supertest
          .delete(`/internal/search/ese/123`)
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(400);
        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      it('should delete a search', async () => {
        const resp = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id } = resp.body;
        await supertest
          .delete(`/internal/search/ese/${id}`)
          .set('kbn-xsrf', 'foo')
          .send()
          .expect(200);

        // try to re-fetch
        await supertest
          .post(`/internal/search/ese/${id}`)
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(404);
      });
    });
  });
}
