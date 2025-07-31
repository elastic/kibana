/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ALL_USERS, USERS } from './common/users';
import { ALL_ROLES } from './common/roles';
import { createUsersAndRoles, deleteUsersAndRoles } from './common/helpers';

const INTERNAL_API_BASE_PATH = '/internal/search_playground/playgrounds';
const INITIAL_REST_VERSION = '1' as const;

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('playgrounds - /internal/search_playground/playgrounds', function () {
    const testPlaygroundIds: Set<string> = new Set<string>();
    let testPlaygroundId: string | undefined;

    before(async () => {
      await createUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });
    after(async () => {
      if (testPlaygroundIds.size > 0) {
        for (const id of testPlaygroundIds) {
          try {
            await supertestWithoutAuth
              .delete(`${INTERNAL_API_BASE_PATH}/${id}`)
              .set('kbn-xsrf', 'xxx')
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .auth(USERS.ALL.username, USERS.ALL.password)
              .expect(200);
          } catch (err) {
            log.warning('[Cleanup error] Error deleting playground', err);
          }
        }
      }

      await deleteUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });
    describe('developer', function () {
      describe('PUT playgrounds', function () {
        it('should allow creating a new playground', async () => {
          const { body } = await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: 'Test Playground',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.id).toBeDefined();
          testPlaygroundIds.add(body._meta.id);
        });
        it('should allow creating chat playground', async () => {
          const { body } = await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: 'Test Chat Playground',
              indices: ['test-index', 'my-index'],
              queryFields: { 'test-index': ['field1', 'field2'], 'my-index': ['field3'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              prompt: 'Test prompt',
              citations: false,
              context: {
                sourceFields: { 'test-index': ['field1', 'field2'], 'my-index': ['field3'] },
                docSize: 3,
              },
              summarizationModel: {
                connectorId: 'connectorId',
              },
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body?._meta?.id).toBeDefined();
          testPlaygroundIds.add(body._meta.id);
        });
        it('should allow creating search playground with custom query', async () => {
          const { body } = await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: 'My awesome Playground',
              indices: ['test-index', 'my-index'],
              queryFields: { 'test-index': ['field1', 'field2'], 'my-index': ['field3'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              userElasticsearchQueryJSON: `{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}`,
              prompt: 'Test prompt',
              citations: false,
              context: {
                sourceFields: { 'test-index': ['field1', 'field2'], 'my-index': ['field3'] },
                docSize: 3,
              },
              summarizationModel: {
                connectorId: 'connectorId',
                modelId: 'modelId',
              },
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body?._meta?.id).toBeDefined();
          testPlaygroundIds.add(body._meta.id);
        });
        it('should allow creating chat playground with custom query', async () => {
          const { body } = await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: 'Another Chat Playground',
              indices: ['test-index', 'my-index'],
              queryFields: { 'test-index': ['field1', 'field2'], 'my-index': ['field3'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              userElasticsearchQueryJSON: `{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body?._meta?.id).toBeDefined();
          testPlaygroundIds.add(body._meta.id);
        });
        it('should validate playground create request', async () => {
          await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: '',
              indices: ['test-index'],
              queryFields: { 'test-index': [''] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });
        it('should validate playground create request with custom query', async () => {
          await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: '',
              indices: ['test-index'],
              queryFields: { 'test-index': [''] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              userElasticsearchQueryJSON: `{"query":{"multi_match":{"query":"{query}","fields":["field1`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });
      });
      describe('GET playgrounds/{id}', function () {
        before(() => {
          expect(testPlaygroundIds.size).toBeGreaterThan(0);
          testPlaygroundId = Array.from(testPlaygroundIds)[0];
        });
        after(() => {
          testPlaygroundId = undefined;
        });
        it('should return existing playground', async () => {
          const { body } = await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.id).toBeDefined();
          expect(body._meta.id).toEqual(testPlaygroundId);
          expect(body.data).toBeDefined();
          expect(body.data.name).toBeDefined();
        });
        it('should return 404 for unknown playground', async () => {
          await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(404);
        });
      });
      describe('GET playgrounds', function () {
        it('should return playgrounds', async () => {
          const { body } = await supertestWithoutAuth
            .get(INTERNAL_API_BASE_PATH)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.total).toBeDefined();
          expect(body.items).toBeDefined();
          expect(body._meta.total).toBeGreaterThan(0);
          expect(body.items.length).toBeGreaterThan(0);
        });
        it('should return playgrounds with pagination & sorting', async () => {
          const { body } = await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}?page=1&size=1&sortOrder=asc`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.total).toBeDefined();
          expect(body.items).toBeDefined();
          expect(body._meta.total).toBeGreaterThan(0);
          expect(body.items.length).toEqual(1);
        });
      });
      describe('PUT playgrounds/{id}', function () {
        before(() => {
          expect(testPlaygroundIds.size).toBeGreaterThan(0);
          testPlaygroundId = Array.from(testPlaygroundIds)[0];
        });
        after(() => {
          testPlaygroundId = undefined;
        });
        it('should update existing playground', async () => {
          await supertestWithoutAuth
            .put(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .send({
              name: 'Updated Test Playground',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          const { body } = await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.id).toEqual(testPlaygroundId);
          expect(body.data).toBeDefined();
          expect(body.data.name).toEqual('Updated Test Playground');
        });
        it('should return 404 for unknown playground', async () => {
          await supertestWithoutAuth
            .put(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
            .send({
              name: 'Updated Test Playground',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(404);
        });
        it('should validate playground update request', async () => {
          await supertestWithoutAuth
            .put(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .send({
              name: '',
              indices: ['test-index'],
              queryFields: { 'test-index': [''] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });
      });
      describe('DELETE playgrounds/{id}', function () {
        it('should allow you to delete an existing playground', async () => {
          expect(testPlaygroundIds.size).toBeGreaterThan(0);
          const playgroundId = Array.from(testPlaygroundIds)[0];
          await supertestWithoutAuth
            .delete(`${INTERNAL_API_BASE_PATH}/${playgroundId}`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);
          testPlaygroundIds.delete(playgroundId);

          await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}/${playgroundId}`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(404);
        });
        it('should return 404 for unknown playground', async () => {
          await supertestWithoutAuth
            .delete(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(404);
        });
      });
    });
    describe('viewer', function () {
      before(async () => {
        expect(testPlaygroundIds.size).toBeGreaterThan(0);
        testPlaygroundId = Array.from(testPlaygroundIds)[0];
      });

      describe('GET playgrounds', function () {
        it('should have playgrounds to test with', async () => {
          const { body } = await supertestWithoutAuth
            .get(INTERNAL_API_BASE_PATH)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.READ.username, USERS.READ.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.total).toBeDefined();
          expect(body.items).toBeDefined();
          expect(body._meta.total).toBeGreaterThan(0);
          expect(body.items.length).toBeGreaterThan(0);
        });
      });
      describe('GET playgrounds/{id}', function () {
        it('should return existing playground', async () => {
          const { body } = await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.READ.username, USERS.READ.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.id).toBeDefined();
          expect(body._meta.id).toEqual(testPlaygroundId);
          expect(body.data).toBeDefined();
          expect(body.data.name).toBeDefined();
        });
      });
      describe('PUT playgrounds', function () {
        it('should fail', async () => {
          await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: 'Viewer Test Playground',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.READ.username, USERS.READ.password)
            .expect(403);
        });
      });
      describe('PUT playgrounds/{id}', function () {
        it('should fail', async () => {
          await supertestWithoutAuth
            .put(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .send({
              name: 'Updated Test Playground viewer',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.READ.username, USERS.READ.password)
            .expect(403);
        });
      });
      describe('DELETE playgrounds/{id}', function () {
        it('should fail', async () => {
          await supertestWithoutAuth
            .delete(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.READ.username, USERS.READ.password)
            .expect(403);
        });
      });
    });
    describe('non-playground users', function () {
      describe('Playground routes should be unavailable', () => {
        it('GET playgrounds', async () => {
          await supertestWithoutAuth
            .get(INTERNAL_API_BASE_PATH)
            .set('kbn-xsrf', 'foo')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
            .expect(403);
        });
        it('GET playgrounds/{id}', async () => {
          await supertestWithoutAuth
            .get(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
            .set('kbn-xsrf', 'foo')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
            .expect(403);
        });
        it('PUT playgrounds', async () => {
          await supertestWithoutAuth
            .put(INTERNAL_API_BASE_PATH)
            .send({
              name: 'Test Playground',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'foo')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
            .expect(403);
        });
        it('PUT playgrounds/{id}', async () => {
          await supertestWithoutAuth
            .put(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
            .send({
              name: 'Test Playground',
              indices: ['test-index'],
              queryFields: { 'test-index': ['field1', 'field2'] },
              elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
            })
            .set('kbn-xsrf', 'foo')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
            .expect(403);
        });
        it('DELETE playgrounds/{id}', async () => {
          await supertestWithoutAuth
            .delete(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
            .set('kbn-xsrf', 'foo')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
            .expect(403);
        });
      });
    });
  });
}
