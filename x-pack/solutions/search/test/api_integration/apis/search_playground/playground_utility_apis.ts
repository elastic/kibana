/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ALL_USERS, USERS } from './common/users';
import { ALL_ROLES } from './common/roles';
import { createUsersAndRoles, deleteUsersAndRoles } from './common/helpers';

const archivedBooksIndex = 'x-pack/test/functional_search/fixtures/search-books';
const archiveDenseVectorIndex = 'x-pack/test/functional_search/fixtures/search-national-parks';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const createIndices = async () => {
    await esArchiver.load(archivedBooksIndex);
    await esArchiver.load(archiveDenseVectorIndex);
  };

  const deleteIndices = async () => {
    await esArchiver.unload(archivedBooksIndex);
    await esArchiver.unload(archiveDenseVectorIndex);
  };

  describe('playgrounds - /internal/search_playground', function () {
    before(async () => {
      await createUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
      await createIndices();
    });

    after(async () => {
      await deleteIndices();
      await deleteUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });

    describe('developer', function () {
      it('should list all available indices', async () => {
        const { body } = await supertestWithoutAuth
          .get('/internal/search_playground/indices')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        expect(body).toBeDefined();
        expect(body.indices).toEqual(['search-books', 'search-national-parks']);
      });

      it('should return mappings for the specified indices', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/mappings')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.ALL.username, USERS.ALL.password)
          .send({ indices: ['search-books', 'search-national-parks'] })
          .expect(200);

        expect(body).toBeDefined();
        expect(body).toEqual({
          mappings: expect.objectContaining({
            'search-books': {
              mappings: {
                properties: {
                  author: { type: 'text' },
                  name: { type: 'text' },
                  page_count: { type: 'float' },
                  release_date: { type: 'date' },
                },
              },
            },
          }),
        });
      });

      it('should return search results for a test query', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/query_test')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.ALL.username, USERS.ALL.password)
          .send({
            elasticsearch_query: JSON.stringify({
              retriever: {
                standard: { query: { multi_match: { query: '{query}', fields: ['description'] } } },
              },
            }),
            indices: ['search-national-parks'],
            query: 'Banff',
            chat_context: {
              source_fields: '{"search-national-parks":["description"]}',
              doc_size: 1,
            },
          })
          .expect(200);

        expect(body).toBeDefined();
        expect(body.searchResponse).toBeDefined();
      });

      it('should return paginated search results for a search query', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/search')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.ALL.username, USERS.ALL.password)
          .send({
            elasticsearch_query: JSON.stringify({
              retriever: {
                standard: { query: { multi_match: { query: '{query}', fields: ['description'] } } },
              },
            }),
            indices: ['search-national-parks'],
            search_query: 'Banff',
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
          .auth(USERS.ALL.username, USERS.ALL.password)
          .send({ indices: ['search-books', 'search-national-parks'] })
          .expect(200);

        expect(body).toBeDefined();
        expect(body['search-books']).toBeDefined();
        expect(body['search-national-parks']).toBeDefined();
        expect(body['search-books'].source_fields).toEqual(
          expect.arrayContaining(['author', 'name'])
        );
        expect(body['search-national-parks'].source_fields).toEqual(
          expect.arrayContaining(['acres', 'date_established', 'description'])
        );
      });
    });

    describe('viewer', function () {
      it('should NOT allow listing all available indices (returns 403)', async () => {
        await supertestWithoutAuth
          .get('/internal/search_playground/indices')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.READ.username, USERS.READ.password)
          .expect(403);
      });

      it('should NOT allow retrieving mappings for the specified indices (returns 400)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/mappings')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.READ.username, USERS.READ.password)
          .send({ indices: ['search-books', 'search-national-parks'] })
          .expect(400);
      });

      it('should allow running a test query and return results', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/query_test')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.READ.username, USERS.READ.password)
          .send({
            elasticsearch_query: JSON.stringify({
              retriever: {
                standard: { query: { multi_match: { query: '{query}', fields: ['description'] } } },
              },
            }),
            indices: ['search-national-parks'],
            query: 'Banff',
            chat_context: {
              source_fields: '{"search-national-parks":["description"]}',
              doc_size: 1,
            },
          })
          .expect(200);

        expect(body).toBeDefined();
        expect(body.searchResponse).toBeDefined();
      });

      it('should allow running a paginated search query and return results', async () => {
        const { body } = await supertestWithoutAuth
          .post('/internal/search_playground/search')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.READ.username, USERS.READ.password)
          .send({
            elasticsearch_query: JSON.stringify({
              retriever: {
                standard: { query: { multi_match: { query: '{query}', fields: ['description'] } } },
              },
            }),
            indices: ['search-national-parks'],
            search_query: 'Banff',
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
          .auth(USERS.READ.username, USERS.READ.password)
          .send({ indices: ['search-books', 'search-national-parks'] })
          .expect(403);
      });
    });

    describe('non-playground users', function () {
      it('should NOT allow access to list all available indices (returns 403)', async () => {
        await supertestWithoutAuth
          .get('/internal/search_playground/indices')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .expect(403);
      });

      it('should NOT allow access to retrieve mappings for the specified indices (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/mappings')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .send({ indices: ['search-books', 'search-national-parks'] })
          .expect(403);
      });

      it('should NOT allow running a test query (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/query_test')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .send({
            elasticsearch_query: JSON.stringify({
              retriever: {
                standard: { query: { multi_match: { query: '{query}', fields: ['description'] } } },
              },
            }),
            indices: ['search-national-parks'],
            query: 'Banff',
            chat_context: {
              source_fields: '{"search-national-parks":["description"]}',
              doc_size: 1,
            },
          })
          .expect(403);
      });

      it('should NOT allow running a paginated search query (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/search')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .send({
            elasticsearch_query: JSON.stringify({
              retriever: {
                standard: { query: { multi_match: { query: '{query}', fields: ['description'] } } },
              },
            }),
            indices: ['search-national-parks'],
            search_query: 'Banff',
            size: 10,
            from: 0,
          })
          .expect(403);
      });

      it('should NOT allow access to retrieve source fields for indices (returns 403)', async () => {
        await supertestWithoutAuth
          .post('/internal/search_playground/query_source_fields')
          .set('kbn-xsrf', 'xxx')
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .send({ indices: ['search-books', 'search-national-parks'] })
          .expect(403);
      });
    });
  });
}
