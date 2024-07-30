/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createKnowledgeBaseModel, deleteKnowledgeBaseModel } from './helpers';

interface KnowledgeBaseEntry {
  id: string;
  text: string;
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');

  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';

  describe('Knowledge base', () => {
    before(async () => {
      await createKnowledgeBaseModel(ml);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
    });

    it('returns 200 on knowledge base setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
        })
        .expect(200);
      expect(res.body).to.eql({});
    });
    describe('when managing a single entry', () => {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-1',
        text: 'My content',
      };
      it('returns 200 on create', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
            params: { body: knowledgeBaseEntry },
          })
          .expect(200);
        const res = await observabilityAIAssistantAPIClient.editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: {
            query: {
              query: '',
              sortBy: 'doc_id',
              sortDirection: 'asc',
            },
          },
        });
        const entry = res.body.entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('returns 200 on get entries and entry exists', async () => {
        const res = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);
        const entry = res.body.entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('returns 200 on delete', async () => {
        const entryId = 'my-doc-id-1';
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId },
            },
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);
        expect(
          res.body.entries.filter((entry: KnowledgeBaseEntry) => entry.id.startsWith('my-doc-id'))
            .length
        ).to.eql(0);
      });

      it('returns 500 on delete not found', async () => {
        const entryId = 'my-doc-id-1';
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId },
            },
          })
          .expect(500);
      });
    });
    describe('when managing multiple entries', () => {
      before(async () => {
        es.deleteByQuery({
          index: KB_INDEX,
          conflicts: 'proceed',
          query: { match_all: {} },
        });
      });
      afterEach(async () => {
        es.deleteByQuery({
          index: KB_INDEX,
          conflicts: 'proceed',
          query: { match_all: {} },
        });
      });
      const knowledgeBaseEntries: KnowledgeBaseEntry[] = [
        {
          id: 'my_doc_a',
          text: 'My content a',
        },
        {
          id: 'my_doc_b',
          text: 'My content b',
        },
        {
          id: 'my_doc_c',
          text: 'My content c',
        },
      ];
      it('returns 200 on create', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: { body: { entries: knowledgeBaseEntries } },
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);
        expect(
          res.body.entries.filter((entry: KnowledgeBaseEntry) => entry.id.startsWith('my_doc'))
            .length
        ).to.eql(3);
      });

      it('allows sorting', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: { body: { entries: knowledgeBaseEntries } },
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'desc',
              },
            },
          })
          .expect(200);

        const entries = res.body.entries.filter((entry: KnowledgeBaseEntry) =>
          entry.id.startsWith('my_doc')
        );
        expect(entries[0].id).to.eql('my_doc_c');
        expect(entries[1].id).to.eql('my_doc_b');
        expect(entries[2].id).to.eql('my_doc_a');

        // asc
        const resAsc = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);

        const entriesAsc = resAsc.body.entries.filter((entry: KnowledgeBaseEntry) =>
          entry.id.startsWith('my_doc')
        );
        expect(entriesAsc[0].id).to.eql('my_doc_a');
        expect(entriesAsc[1].id).to.eql('my_doc_b');
        expect(entriesAsc[2].id).to.eql('my_doc_c');
      });
      it('allows searching', async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: { body: { entries: knowledgeBaseEntries } },
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: 'my_doc_a',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
          })
          .expect(200);

        expect(res.body.entries.length).to.eql(1);
        expect(res.body.entries[0].id).to.eql('my_doc_a');
      });
    });
  });
}
