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

const INITIAL_REST_VERSION = '1' as const;

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('playgrounds - /internal/search_playground', function () {
    before(async () => {
      await createUsersAndRoles(getService, ALL_USERS, ALL_ROLES);

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
      await deleteUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });

    describe('developer', function () {
      it('should list all available indices', async () => {
        const { body } = await supertestWithoutAuth
          .get('/internal/search_playground/indices')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        expect(body).toBeDefined();
        expect(body.indices).toEqual(['books', 'users']);
      });

      it('should return mappings for the specified indices', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/mappings')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
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
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/query_test')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
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
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/search')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
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
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/query_source_fields')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
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
      it('should NOT allow listing all available indices (returns 403)', async () => {
        await supertestWithoutAuth
          .get('/internal/search_playground/indices')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.READ.username, USERS.READ.password)
          .expect(403);
      });

      it('should NOT allow retrieving mappings for the specified indices (returns 400)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/mappings')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.READ.username, USERS.READ.password)
          .send({ indices: ['books', 'users'] })
          .expect(400);
      });

      it('should allow running a test query and return results', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/query_test')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.READ.username, USERS.READ.password)
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
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/search')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.READ.username, USERS.READ.password)
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

      it('should NOT allow retrieving source fields for indices (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/query_source_fields')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.READ.username, USERS.READ.password)
          .send({ indices: ['books', 'users'] })
          .expect(403);
      });
    });

    describe('non-playground users', function () {
      it('should NOT allow access to list all available indices (returns 403)', async () => {
        await supertestWithoutAuth
          .get('/internal/search_playground/indices')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .expect(403);
      });

      it('should NOT allow access to retrieve mappings for the specified indices (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/mappings')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .send({ indices: ['books', 'users'] })
          .expect(403);
      });

      it('should NOT allow running a test query (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/query_test')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
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
          .expect(403);
      });

      it('should NOT allow running a paginated search query (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/search')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
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
          .expect(403);
      });

      it('should NOT allow access to retrieve source fields for indices (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/query_source_fields')
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .send({ indices: ['books', 'users'] })
          .expect(403);
      });
    });
  });
}
