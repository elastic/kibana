/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { SearchSessionStatus } from '../../../../plugins/data_enhanced/common';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('search session', () => {
    describe('session management', () => {
      it('should create and get a session', async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            urlGeneratorId: 'discover',
          })
          .expect(200);

        await supertest.get(`/internal/session/${sessionId}`).set('kbn-xsrf', 'foo').expect(200);
      });

      it('should fail to delete an unknown session', async () => {
        await supertest.delete(`/internal/session/123`).set('kbn-xsrf', 'foo').expect(404);
      });

      it('should create and delete a session', async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            urlGeneratorId: 'discover',
          })
          .expect(200);

        await supertest.delete(`/internal/session/${sessionId}`).set('kbn-xsrf', 'foo').expect(200);

        await supertest.get(`/internal/session/${sessionId}`).set('kbn-xsrf', 'foo').expect(404);
      });

      it('should create and cancel a session', async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            urlGeneratorId: 'discover',
          })
          .expect(200);

        await supertest
          .post(`/internal/session/${sessionId}/cancel`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const resp = await supertest
          .get(`/internal/session/${sessionId}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const { status } = resp.body.attributes;
        expect(status).to.equal(SearchSessionStatus.CANCELLED);
      });

      it('should sync search ids into session', async () => {
        const sessionId = `my-session-${Math.random()}`;

        // run search
        const searchRes1 = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            params: {
              body: {
                query: {
                  term: {
                    agent: '1',
                  },
                },
              },
              wait_for_completion_timeout: '1ms',
            },
          })
          .expect(200);

        const { id: id1 } = searchRes1.body;

        // create session
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            urlGeneratorId: 'discover',
          })
          .expect(200);

        // run search
        const searchRes2 = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
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

        const { id: id2 } = searchRes2.body;

        // wait 10 seconds for ids to be synced
        // TODO: make the refresh interval dynamic, so we can speed it up!
        await new Promise((resolve) => setTimeout(resolve, 10000));

        const resp = await supertest
          .get(`/internal/session/${sessionId}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const { idMapping } = resp.body.attributes;

        const idMappings = Object.values(idMapping).map((value: any) => value.id);
        expect(idMappings).to.contain(id1);
        expect(idMappings).to.contain(id2);
      });

      it('should create and extend a session', async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            urlGeneratorId: 'discover',
          })
          .expect(200);

        await supertest
          .post(`/internal/session/${sessionId}/_extend`)
          .set('kbn-xsrf', 'foo')
          .send({
            expires: '2021-02-26T21:02:43.742Z',
          })
          .expect(200);
      });
    });

    it('should fail to extend a nonexistent session', async () => {
      await supertest
        .post(`/internal/session/123/_extend`)
        .set('kbn-xsrf', 'foo')
        .send({
          expires: '2021-02-26T21:02:43.742Z',
        })
        .expect(404);
    });
  });
}
