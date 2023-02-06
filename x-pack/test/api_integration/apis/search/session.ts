/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchSessionStatus } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const retry = getService('retry');
  const spacesService = getService('spaces');

  describe('search session', () => {
    describe('session management', () => {
      it('should fail to create a session with no name', async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(400);
      });

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
            locatorId: 'discover',
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
            locatorId: 'discover',
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
            locatorId: 'discover',
          })
          .expect(200);

        await supertest
          .post(`/internal/session/${sessionId}/cancel`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const resp = await supertest
          .get(`/internal/session/${sessionId}/status`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const { status } = resp.body;
        expect(status).to.equal(SearchSessionStatus.CANCELLED);
      });

      it('should rename a session', async () => {
        const sessionId = `my-session-${Math.random()}`;
        const oldName = 'name1';
        const newName = 'name2';
        const {
          body: { attributes: originalSession },
        } = await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: oldName,
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        const {
          body: { attributes: updatedSession },
        } = await supertest
          .put(`/internal/session/${sessionId}`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: newName,
          })
          .expect(200);

        expect(originalSession.name).not.to.equal(updatedSession.name);
        expect(updatedSession.name).to.equal(newName);
      });

      it('should sync search ids into saved session', async () => {
        const sessionId = `my-session-${Math.random()}`;

        // run search, this will not be persisted because session is not saved yet
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

        // save session
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        // run search
        const searchRes2 = await supertest
          .post(`/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            isStored: true,
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

        await retry.waitFor('a search persisted into session', async () => {
          const resp = await supertest
            .get(`/internal/session/${sessionId}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);

          const { name, created, idMapping } = resp.body.attributes;
          expect(name).to.be('My Session');
          expect(created).not.to.be(undefined);

          const idMappings = Object.values(idMapping).map((value: any) => value.id);
          expect(idMappings).not.to.contain(id1);
          expect(idMappings).to.contain(id2);
          return true;
        });
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
            locatorId: 'discover',
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

    it('should complete session when searches complete', async () => {
      const sessionId = `my-session-${Math.random()}`;
      const searchParams = {
        body: {
          query: {
            term: {
              agent: '1',
            },
          },
        },
        wait_for_completion_timeout: '1ms',
      };

      // run search
      const searchRes = await supertest
        .post(`/internal/search/ese`)
        .set('kbn-xsrf', 'foo')
        .send({
          sessionId,
          params: searchParams,
        })
        .expect(200);

      const { id } = searchRes.body;

      // persist session
      await supertest
        .post(`/internal/session`)
        .set('kbn-xsrf', 'foo')
        .send({
          sessionId,
          name: 'My Session',
          appId: 'discover',
          expires: '123',
          locatorId: 'discover',
        })
        .expect(200);

      // run search to persist into a session
      await supertest
        .post(`/internal/search/ese/${id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          sessionId,
          params: searchParams,
          isStored: true,
        })
        .expect(200);

      await retry.waitFor('searches persisted into session', async () => {
        const resp = await supertest
          .get(`/internal/session/${sessionId}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const { created, idMapping } = resp.body.attributes;
        expect(created).not.to.be(undefined);

        const idMappings = Object.values(idMapping).map((value: any) => value.id);
        expect(idMappings).to.contain(id);
        return true;
      });

      await retry.waitFor(
        'searches eventually complete and session gets into the complete state',
        async () => {
          const resp = await supertest
            .get(`/internal/session/${sessionId}/status`)
            .set('kbn-xsrf', 'foo')
            .expect(200);

          const { status } = resp.body;

          expect(status).to.be(SearchSessionStatus.COMPLETE);

          return true;
        }
      );
    });

    describe('with security', () => {
      before(async () => {
        await security.user.create('other_user', {
          password: 'password',
          roles: ['superuser'],
          full_name: 'other user',
        });
      });

      after(async () => {
        await security.user.delete('other_user');
      });

      it(`should prevent users from accessing other users' sessions`, async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        await supertestWithoutAuth
          .get(`/internal/session/${sessionId}`)
          .set('kbn-xsrf', 'foo')
          .auth('other_user', 'password')
          .expect(404);
      });

      it(`should prevent users from deleting other users' sessions`, async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        await supertestWithoutAuth
          .delete(`/internal/session/${sessionId}`)
          .set('kbn-xsrf', 'foo')
          .auth('other_user', 'password')
          .expect(404);
      });

      it(`should prevent users from cancelling other users' sessions`, async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        await supertestWithoutAuth
          .post(`/internal/session/${sessionId}/cancel`)
          .set('kbn-xsrf', 'foo')
          .auth('other_user', 'password')
          .expect(404);
      });

      it(`should prevent users from extending other users' sessions`, async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertest
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        await supertestWithoutAuth
          .post(`/internal/session/${sessionId}/_extend`)
          .set('kbn-xsrf', 'foo')
          .auth('other_user', 'password')
          .send({
            expires: '2021-02-26T21:02:43.742Z',
          })
          .expect(404);
      });

      it(`should prevent unauthorized users from creating sessions`, async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertestWithoutAuth
          .post(`/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(401);
      });
    });

    describe('search session permissions', () => {
      before(async () => {
        await security.role.create('data_analyst', {
          elasticsearch: {},
          kibana: [
            {
              feature: {
                dashboard: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create('analyst', {
          password: 'analyst-password',
          roles: ['data_analyst'],
          full_name: 'test user',
        });
      });
      after(async () => {
        await security.role.delete('data_analyst');
        await security.user.delete('analyst');
      });

      it('should 403 if no app gives permissions to store search sessions', async () => {
        const sessionId = `my-session-${Math.random()}`;
        await supertestWithoutAuth
          .post(`/internal/session`)
          .auth('analyst', 'analyst-password')
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(403);

        await supertestWithoutAuth
          .get(`/internal/session/${sessionId}`)
          .auth('analyst', 'analyst-password')
          .set('kbn-xsrf', 'foo')
          .expect(403);
      });
    });

    describe('in non-default space', () => {
      const spaceId = 'foo-space';
      before(async () => {
        try {
          await spacesService.create({
            id: spaceId,
            name: 'Foo Space',
          });
        } catch {
          // might already be created
        }
      });

      after(async () => {
        await spacesService.delete(spaceId);
      });

      it('should complete persisted session', async () => {
        const sessionId = `my-session-${Math.random()}`;

        const searchParams = {
          body: {
            query: {
              term: {
                agent: '1',
              },
            },
          },
          wait_for_completion_timeout: '1ms',
        };

        // run search
        const searchRes = await supertest
          .post(`/s/${spaceId}/internal/search/ese`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            params: searchParams,
          })
          .expect(200);

        const { id } = searchRes.body;

        // persist session
        await supertest
          .post(`/s/${spaceId}/internal/session`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            name: 'My Session',
            appId: 'discover',
            expires: '123',
            locatorId: 'discover',
          })
          .expect(200);

        // run search to persist into a session
        await supertest
          .post(`/s/${spaceId}/internal/search/ese/${id}`)
          .set('kbn-xsrf', 'foo')
          .send({
            sessionId,
            params: searchParams,
            isStored: true,
          })
          .expect(200);

        await retry.waitFor('searches persisted into session', async () => {
          const resp = await supertest
            .get(`/s/${spaceId}/internal/session/${sessionId}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);

          const { created, idMapping } = resp.body.attributes;
          expect(created).not.to.be(undefined);

          const idMappings = Object.values(idMapping).map((value: any) => value.id);
          expect(idMappings).to.contain(id);
          return true;
        });

        await retry.waitFor(
          'searches eventually complete and session gets into the complete state',
          async () => {
            const resp = await supertest
              .get(`/s/${spaceId}/internal/session/${sessionId}/status`)
              .set('kbn-xsrf', 'foo')
              .expect(200);

            const { status } = resp.body;

            expect(status).to.be(SearchSessionStatus.COMPLETE);
            return true;
          }
        );
      });
    });
  });
}
