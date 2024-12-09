/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { type KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  TINY_ELSER,
  clearKnowledgeBase,
  createKnowledgeBaseModel,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
} from './helpers';
import { ForbiddenApiError } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('Knowledge base', () => {
    before(async () => {
      await createKnowledgeBaseModel(ml);

      await observabilityAIAssistantAPIClient
        .admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
      await clearKnowledgeBase(es);
    });

    describe('when managing a single entry', () => {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-1',
        title: 'My title',
        text: 'My content',
      };
      it('returns 200 on create', async () => {
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
            params: { body: knowledgeBaseEntry },
          })
          .expect(200);
        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: {
            query: {
              query: '',
              sortBy: 'title',
              sortDirection: 'asc',
            },
          },
        });
        const entry = res.body.entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.title).to.equal(knowledgeBaseEntry.title);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('returns 200 on get entries and entry exists', async () => {
        const res = await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'title',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);
        const entry = res.body.entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.title).to.equal(knowledgeBaseEntry.title);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('returns 200 on delete', async () => {
        const entryId = 'my-doc-id-1';
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId },
            },
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'title',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);
        expect(res.body.entries.filter((entry) => entry.id.startsWith('my-doc-id')).length).to.eql(
          0
        );
      });

      it('returns 500 on delete not found', async () => {
        const entryId = 'my-doc-id-1';
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId },
            },
          })
          .expect(500);
      });
    });

    describe('when managing multiple entries', () => {
      async function getEntries({
        query = '',
        sortBy = 'title',
        sortDirection = 'asc',
      }: { query?: string; sortBy?: string; sortDirection?: 'asc' | 'desc' } = {}) {
        const res = await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: { query, sortBy, sortDirection },
            },
          })
          .expect(200);

        return omitCategories(res.body.entries);
      }

      beforeEach(async () => {
        await clearKnowledgeBase(es);

        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: {
              body: {
                entries: [
                  {
                    id: 'my_doc_a',
                    title: 'My title a',
                    text: 'My content a',
                  },
                  {
                    id: 'my_doc_b',
                    title: 'My title b',
                    text: 'My content b',
                  },
                  {
                    id: 'my_doc_c',
                    title: 'My title c',
                    text: 'My content c',
                  },
                ],
              },
            },
          })
          .expect(200);
      });

      afterEach(async () => {
        await clearKnowledgeBase(es);
      });

      it('returns 200 on create', async () => {
        const entries = await getEntries();
        expect(omitCategories(entries).length).to.eql(3);
      });

      describe('when sorting ', () => {
        const ascendingOrder = ['my_doc_a', 'my_doc_b', 'my_doc_c'];

        it('allows sorting ascending', async () => {
          const entries = await getEntries({ sortBy: 'title', sortDirection: 'asc' });
          expect(entries.map(({ id }) => id)).to.eql(ascendingOrder);
        });

        it('allows sorting descending', async () => {
          const entries = await getEntries({ sortBy: 'title', sortDirection: 'desc' });
          expect(entries.map(({ id }) => id)).to.eql([...ascendingOrder].reverse());
        });
      });

      it('allows searching by title', async () => {
        const entries = await getEntries({ query: 'b' });
        expect(entries.length).to.eql(1);
        expect(entries[0].title).to.eql('My title b');
      });
    });

    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        it('POST /internal/observability_ai_assistant/kb/entries/save', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
              params: {
                body: {
                  id: 'my-doc-id-1',
                  title: 'My title',
                  text: 'My content',
                },
              },
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });

        it('GET /internal/observability_ai_assistant/kb/entries', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
              params: {
                query: { query: '', sortBy: 'title', sortDirection: 'asc' },
              },
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });

        it('DELETE /internal/observability_ai_assistant/kb/entries/{entryId}', async () => {
          try {
            await observabilityAIAssistantAPIClient.unauthorizedUser({
              endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
              params: {
                path: { entryId: 'my-doc-id-1' },
              },
            });
            throw new ForbiddenApiError(
              'Expected unauthorizedUser() to throw a 403 Forbidden error'
            );
          } catch (e) {
            expect(e.status).to.be(403);
          }
        });
      });
    });
  });
}

function omitCategories(entries: KnowledgeBaseEntry[]) {
  return entries.filter((entry) => entry.labels?.category === undefined);
}
