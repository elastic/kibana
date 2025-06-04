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

const INITIAL_REST_VERSION = '1' as const;

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const roleScopedSupertest = getService('roleScopedSupertest');

  let supertestDeveloperWithCookieCredentials: SupertestWithRoleScopeType;

  describe('playgrounds - /internal/search_playground', function () {
    before(async () => {
      supertestDeveloperWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'developer',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );

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
        expect(body.books.source_fields).toEqual(expect.arrayContaining(['title', 'description']));
        expect(body.users.source_fields).toEqual(expect.arrayContaining(['name', 'address']));
      });
    });

    describe('viewer', function () {
      let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;
      before(async () => {
        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'viewer',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
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
        expect(body.books.source_fields).toEqual(expect.arrayContaining(['title', 'description']));
        expect(body.users.source_fields).toEqual(expect.arrayContaining(['name', 'address']));
      });
    });
  });
}
