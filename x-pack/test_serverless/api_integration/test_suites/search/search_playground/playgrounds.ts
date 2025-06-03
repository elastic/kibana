/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SupertestWithRoleScopeType } from '../../../services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const INTERNAL_API_BASE_PATH = '/internal/search_playground/playgrounds';
const INITIAL_REST_VERSION = '1' as const;

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const roleScopedSupertest = getService('roleScopedSupertest');

  let supertestDeveloperWithCookieCredentials: SupertestWithRoleScopeType;

  describe('playgrounds API integration', function () {
    describe('playgrounds - /internal/search_playground', function () {
      before(async () => {
        supertestDeveloperWithCookieCredentials =
          await roleScopedSupertest.getSupertestWithRoleScope('developer', {
            useCookieHeader: true,
            withInternalHeaders: true,
          });

        // Create a books index with sample documents
        await es.indices.create({
          index: 'books',
          mappings: {
            properties: {
              title: { type: 'text' },
              description: { type: 'text' },
            },
          },
        });
        await es.index({
          index: 'books',
          document: {
            title: 'The Great Gatsby',
            description: 'A novel written by American author F. Scott Fitzgerald.',
          },
        });
        await es.index({
          index: 'books',
          document: {
            title: 'To Kill a Mockingbird',
            description: 'A novel by Harper Lee published in 1960.',
          },
        });

        // Create a users index with sample documents
        await es.indices.create({
          index: 'users',
          mappings: {
            properties: {
              name: { type: 'text' },
              address: { type: 'text' },
            },
          },
        });
        await es.index({
          index: 'users',
          document: {
            name: 'Alice',
            address: '123 Main St',
          },
        });
        await es.index({
          index: 'users',
          document: {
            name: 'Bob',
            address: '456 Elm St',
          },
        });
      });

      after(async () => {
        await es.indices.delete({ index: 'books' });
        await es.indices.delete({ index: 'users' });
      });

      describe('developer', function () {
        it('should list all available indices', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .get('/internal/search_playground/indices')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .expect(200);

          expect(body).toBeDefined();
          expect(body.indices).toEqual(['books', 'users']);
        });

        it('should return mappings for the specified indices', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .post('/internal/search_playground/mappings')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({ indices: ['books', 'users'] })
            .expect(200);

          expect(body).toBeDefined();
          expect(body).toEqual({
            mappings: {
              books: {
                mappings: {
                  properties: { description: { type: 'text' }, title: { type: 'text' } },
                },
              },
              users: {
                mappings: {
                  properties: { name: { type: 'text' }, address: { type: 'text' } },
                },
              },
            },
          });
        });

        it('should return search results for a test query', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .post('/internal/search_playground/query_test')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({
              elasticsearch_query: JSON.stringify({
                retriever: {
                  standard: { query: { multi_match: { query: '{query}', fields: ['title'] } } },
                },
              }),
              indices: ['books'],
              query: 'Gatsby',
              chat_context: { source_fields: '{"books":["title"]}', doc_size: 1 },
            })
            .expect(200);

          expect(body).toBeDefined();
          expect(body.searchResponse).toBeDefined();
        });

        it('should return paginated search results for a search query', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .post('/internal/search_playground/search')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({
              elasticsearch_query: JSON.stringify({
                retriever: {
                  standard: { query: { multi_match: { query: '{query}', fields: ['title'] } } },
                },
              }),
              indices: ['books'],
              search_query: 'Mockingbird',
              size: 10,
              from: 0,
            })
            .expect(200);

          expect(body).toBeDefined();
          expect(body.results).toBeDefined();
          expect(body.executionTime).toBeDefined();
          expect(body.pagination).toBeDefined();
        });

        it('should return the source fields for each index', async () => {
          const { body } = await supertestDeveloperWithCookieCredentials
            .post('/internal/search_playground/query_source_fields')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({ indices: ['books', 'users'] })
            .expect(200);

          expect(body).toBeDefined();
          expect(body.books).toBeDefined();
          expect(body.users).toBeDefined();
          expect(body.books.source_fields).toEqual(
            expect.arrayContaining(['title', 'description'])
          );
          expect(body.users.source_fields).toEqual(expect.arrayContaining(['name', 'address']));
        });
      });

      describe('viewer', function () {
        let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;
        before(async () => {
          supertestViewerWithCookieCredentials =
            await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
              useCookieHeader: true,
              withInternalHeaders: true,
            });
        });

        it('should list all available indices', async () => {
          const { body } = await supertestViewerWithCookieCredentials
            .get('/internal/search_playground/indices')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .expect(200);

          expect(body).toBeDefined();
          expect(body.indices).toEqual(['books', 'users']);
        });

        it('should return mappings for the specified indices', async () => {
          const { body } = await supertestViewerWithCookieCredentials
            .post('/internal/search_playground/mappings')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({ indices: ['books', 'users'] })
            .expect(200);

          expect(body).toBeDefined();
          expect(body).toEqual({
            mappings: {
              books: {
                mappings: {
                  properties: { description: { type: 'text' }, title: { type: 'text' } },
                },
              },
              users: {
                mappings: {
                  properties: { name: { type: 'text' }, address: { type: 'text' } },
                },
              },
            },
          });
        });

        it('should allow running a test query and return results', async () => {
          const { body } = await supertestViewerWithCookieCredentials
            .post('/internal/search_playground/query_test')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({
              elasticsearch_query: JSON.stringify({
                retriever: {
                  standard: { query: { multi_match: { query: '{query}', fields: ['title'] } } },
                },
              }),
              indices: ['books'],
              query: 'Gatsby',
              chat_context: { source_fields: '{"books":["title"]}', doc_size: 1 },
            })
            .expect(200);

          expect(body).toBeDefined();
          expect(body.searchResponse).toBeDefined();
        });

        it('should allow running a paginated search query and return results', async () => {
          const { body } = await supertestViewerWithCookieCredentials
            .post('/internal/search_playground/search')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({
              elasticsearch_query: JSON.stringify({
                retriever: {
                  standard: { query: { multi_match: { query: '{query}', fields: ['title'] } } },
                },
              }),
              indices: ['books'],
              search_query: 'Mockingbird',
              size: 10,
              from: 0,
            })
            .expect(200);

          expect(body).toBeDefined();
          expect(body.results).toBeDefined();
          expect(body.executionTime).toBeDefined();
          expect(body.pagination).toBeDefined();
        });

        it('should return the source fields for each index', async () => {
          const { body } = await supertestViewerWithCookieCredentials
            .post('/internal/search_playground/query_source_fields')
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            .send({ indices: ['books', 'users'] })
            .expect(200);

          expect(body).toBeDefined();
          expect(body.books).toBeDefined();
          expect(body.users).toBeDefined();
          expect(body.books.source_fields).toEqual(
            expect.arrayContaining(['title', 'description'])
          );
          expect(body.users.source_fields).toEqual(expect.arrayContaining(['name', 'address']));
        });
      });
    });
    describe('playgrounds - /internal/search_playground/playgrounds', function () {
      const testPlaygroundIds: Set<string> = new Set<string>();
      let testPlaygroundId: string | undefined;

      before(async () => {
        supertestDeveloperWithCookieCredentials =
          await roleScopedSupertest.getSupertestWithRoleScope('developer', {
            useCookieHeader: true,
            withInternalHeaders: true,
          });
      });
      after(async () => {
        if (testPlaygroundIds.size > 0) {
          for (const id of testPlaygroundIds) {
            try {
              await supertestDeveloperWithCookieCredentials
                .delete(`${INTERNAL_API_BASE_PATH}/${id}`)
                .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
                .expect(200);
            } catch (err) {
              log.warning('[Cleanup error] Error deleting playground', err);
            }
          }
        }
      });
      describe('developer', function () {
        describe('PUT playgrounds', function () {
          it('should allow creating a new playground', async () => {
            const { body } = await supertestDeveloperWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: 'Test Playground',
                indices: ['test-index'],
                queryFields: { 'test-index': ['field1', 'field2'] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              })
              .expect(200);

            expect(body).toBeDefined();
            expect(body._meta).toBeDefined();
            expect(body._meta.id).toBeDefined();
            testPlaygroundIds.add(body._meta.id);
          });
          it('should allow creating chat playground', async () => {
            const { body } = await supertestDeveloperWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
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
              .expect(200);

            expect(body?._meta?.id).toBeDefined();
            testPlaygroundIds.add(body._meta.id);
          });
          it('should allow creating search playground with custom query', async () => {
            const { body } = await supertestDeveloperWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
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
              .expect(200);

            expect(body?._meta?.id).toBeDefined();
            testPlaygroundIds.add(body._meta.id);
          });
          it('should allow creating chat playground with custom query', async () => {
            const { body } = await supertestDeveloperWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: 'Another Chat Playground',
                indices: ['test-index', 'my-index'],
                queryFields: { 'test-index': ['field1', 'field2'], 'my-index': ['field3'] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
                userElasticsearchQueryJSON: `{"query":{"multi_match":{"query":"{query}","fields":["field1"]}}}`,
              })
              .expect(200);

            expect(body?._meta?.id).toBeDefined();
            testPlaygroundIds.add(body._meta.id);
          });
          it('should validate playground create request', async () => {
            await supertestDeveloperWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: '',
                indices: ['test-index'],
                queryFields: { 'test-index': [''] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}`,
              })
              .expect(400);
          });
          it('should validate playground create request with custom query', async () => {
            await supertestDeveloperWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: '',
                indices: ['test-index'],
                queryFields: { 'test-index': [''] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
                userElasticsearchQueryJSON: `{"query":{"multi_match":{"query":"{query}","fields":["field1`,
              })
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
            const { body } = await supertestDeveloperWithCookieCredentials
              .get(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(200);

            expect(body).toBeDefined();
            expect(body._meta).toBeDefined();
            expect(body._meta.id).toBeDefined();
            expect(body._meta.id).toEqual(testPlaygroundId);
            expect(body.data).toBeDefined();
            expect(body.data.name).toBeDefined();
          });
          it('should return 404 for unknown playground', async () => {
            await supertestDeveloperWithCookieCredentials
              .get(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(404);
          });
        });
        describe('GET playgrounds', function () {
          it('should return playgrounds', async () => {
            const { body } = await supertestDeveloperWithCookieCredentials
              .get(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(200);

            expect(body).toBeDefined();
            expect(body._meta).toBeDefined();
            expect(body._meta.total).toBeDefined();
            expect(body.items).toBeDefined();
            expect(body._meta.total).toBeGreaterThan(0);
            expect(body.items.length).toBeGreaterThan(0);
          });
          it('should return playgrounds with pagination & sorting', async () => {
            const { body } = await supertestDeveloperWithCookieCredentials
              .get(`${INTERNAL_API_BASE_PATH}?page=1&size=1&sortOrder=asc`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
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
            await supertestDeveloperWithCookieCredentials
              .put(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: 'Updated Test Playground',
                indices: ['test-index'],
                queryFields: { 'test-index': ['field1', 'field2'] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              })
              .expect(200);

            const { body } = await supertestDeveloperWithCookieCredentials
              .get(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(200);

            expect(body).toBeDefined();
            expect(body._meta).toBeDefined();
            expect(body._meta.id).toEqual(testPlaygroundId);
            expect(body.data).toBeDefined();
            expect(body.data.name).toEqual('Updated Test Playground');
          });
          it('should return 404 for unknown playground', async () => {
            await supertestDeveloperWithCookieCredentials
              .put(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: 'Updated Test Playground',
                indices: ['test-index'],
                queryFields: { 'test-index': ['field1', 'field2'] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              })
              .expect(404);
          });
          it('should validate playground update request', async () => {
            await supertestDeveloperWithCookieCredentials
              .put(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: '',
                indices: ['test-index'],
                queryFields: { 'test-index': [''] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}`,
              })
              .expect(400);
          });
        });
        describe('DELETE playgrounds/{id}', function () {
          it('should allow you to delete an existing playground', async () => {
            expect(testPlaygroundIds.size).toBeGreaterThan(0);
            const playgroundId = Array.from(testPlaygroundIds)[0];
            await supertestDeveloperWithCookieCredentials
              .delete(`${INTERNAL_API_BASE_PATH}/${playgroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(200);
            testPlaygroundIds.delete(playgroundId);

            await supertestDeveloperWithCookieCredentials
              .get(`${INTERNAL_API_BASE_PATH}/${playgroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(404);
          });
          it('should return 404 for unknown playground', async () => {
            await supertestDeveloperWithCookieCredentials
              .delete(`${INTERNAL_API_BASE_PATH}/some-fake-id`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(404);
          });
        });
      });
      describe('viewer', function () {
        let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;
        before(async () => {
          expect(testPlaygroundIds.size).toBeGreaterThan(0);
          testPlaygroundId = Array.from(testPlaygroundIds)[0];

          supertestViewerWithCookieCredentials =
            await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
              useCookieHeader: true,
              withInternalHeaders: true,
            });
        });

        describe('GET playgrounds', function () {
          it('should have playgrounds to test with', async () => {
            const { body } = await supertestViewerWithCookieCredentials
              .get(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
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
            const { body } = await supertestViewerWithCookieCredentials
              .get(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
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
            await supertestViewerWithCookieCredentials
              .put(INTERNAL_API_BASE_PATH)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: 'Viewer Test Playground',
                indices: ['test-index'],
                queryFields: { 'test-index': ['field1', 'field2'] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              })
              .expect(403);
          });
        });
        describe('PUT playgrounds/{id}', function () {
          it('should fail', async () => {
            await supertestViewerWithCookieCredentials
              .put(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .send({
                name: 'Updated Test Playground viewer',
                indices: ['test-index'],
                queryFields: { 'test-index': ['field1', 'field2'] },
                elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["field1","field2"]}}}}}`,
              })
              .expect(403);
          });
        });
        describe('DELETE playgrounds/{id}', function () {
          it('should fail', async () => {
            await supertestViewerWithCookieCredentials
              .delete(`${INTERNAL_API_BASE_PATH}/${testPlaygroundId}`)
              .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
              .expect(403);
          });
        });
      });
    });
  });
}
