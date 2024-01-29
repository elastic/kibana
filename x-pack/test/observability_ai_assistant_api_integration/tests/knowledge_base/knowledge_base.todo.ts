/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import getPort from 'get-port';
import http, { Server } from 'http';
import { FtrProviderContext } from '../../common/ftr_provider_context';

/*
  This test is disabled because the Knowledge base requires a trained model (ELSER) 
  which is not available in FTR tests. 
  
  When a comparable, less expensive trained model is available, this test should be re-enabled.
*/

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const KNOWLEDGE_BASE_API_URL = `/internal/observability_ai_assistant/kb`;

  describe('Knowledge base', () => {
    const requestHandler = (
      request: http.IncomingMessage,
      response: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage }
    ) => {};

    let server: Server;

    before(async () => {
      const port = await getPort({ port: getPort.makeRange(9000, 9100) });

      server = http
        .createServer((request, response) => {
          requestHandler(request, response);
        })
        .listen(port);
    });

    after(() => {
      server.close();
    });

    it('should be possible to set up the knowledge base', async () => {
      return supertest
        .get(`${KNOWLEDGE_BASE_API_URL}/setup`)
        .set('kbn-xsrf', 'foo')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({ entries: [] });
        });
    });

    describe('when creating a single entry', () => {
      it('returns a 200 when using the right payload', async () => {
        const knowledgeBaseEntry = {
          id: 'my-doc-id-1',
          text: 'My content',
        };

        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/save`)
          .set('kbn-xsrf', 'foo')
          .send(knowledgeBaseEntry)
          .expect(200);

        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({ entries: [knowledgeBaseEntry] });
          });
      });

      it('returns a 500 when using the wrong payload', async () => {
        const knowledgeBaseEntry = {
          foo: 'my-doc-id-1',
        };

        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/save`)
          .set('kbn-xsrf', 'foo')
          .send(knowledgeBaseEntry)
          .expect(500);
      });
    });

    describe('when importing multiple entries', () => {
      it('returns a 200 when using the right payload', async () => {
        const knowledgeBaseEntries = [
          {
            id: 'my-doc-id-2',
            text: 'My content 2',
          },
          {
            id: 'my-doc-id-3',
            text: 'My content 3',
          },
        ];

        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/import`)
          .set('kbn-xsrf', 'foo')
          .send(knowledgeBaseEntries)
          .expect(200);

        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({ entries: knowledgeBaseEntries });
          });
      });

      it('returns a 500 when using the wrong payload', async () => {
        const knowledgeBaseEntry = {
          foo: 'my-doc-id-1',
        };

        await supertest
          .post(`${KNOWLEDGE_BASE_API_URL}/entries/import`)
          .set('kbn-xsrf', 'foo')
          .send(knowledgeBaseEntry)
          .expect(500);
      });
    });

    describe('when deleting an entry', () => {
      it('returns a 200 when the item is found and the item is deleted', async () => {
        await supertest
          .delete(`${KNOWLEDGE_BASE_API_URL}/entries/delete/my-doc-id-2`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              entries: [
                {
                  id: 'my-doc-id-1',
                  text: 'My content 1',
                  confidence: 'high',
                },
                {
                  id: 'my-doc-id-3',
                  text: 'My content 3',
                },
              ],
            });
          });
      });

      it('returns a 500 when the item is not found ', async () => {
        return await supertest
          .delete(`${KNOWLEDGE_BASE_API_URL}/entries/delete/my-doc-id-2`)
          .set('kbn-xsrf', 'foo')
          .expect(500);
      });
    });

    describe('when retrieving entries', () => {
      it('returns a 200 when calling get entries with the right parameters', async () => {
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({ entries: [] });
          });
      });

      it('allows sorting', async () => {
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=&sortBy=doc_id&sortDirection=desc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              entries: [
                {
                  id: 'my-doc-id-3',
                  text: 'My content 3',
                },
                {
                  id: 'my-doc-id-1',
                  text: 'My content 1',
                },
              ],
            });
          });
      });

      it('allows searching', async () => {
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries?query=my-doc-3&sortBy=doc_id&sortDirection=asc`)
          .set('kbn-xsrf', 'foo')
          .expect(200)
          .then((response) => {
            expect(response.body).to.eql({
              entries: [
                {
                  id: 'my-doc-id-3',
                  text: 'My content 3',
                },
              ],
            });
          });
      });

      it('returns a 500 when calling get entries with the wrong parameters', async () => {
        return supertest
          .get(`${KNOWLEDGE_BASE_API_URL}/entries`)
          .set('kbn-xsrf', 'foo')
          .expect(500);
      });
    });
  });
}
