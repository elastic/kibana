/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  type KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
} from '@kbn/observability-ai-assistant-plugin/common';
import { orderBy, size, toPairs } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  clearKnowledgeBase,
  getKnowledgeBaseEntriesFromEs,
  addKnowledgeBaseEntryToEs,
} from '../utils/knowledge_base';
import {
  teardownTinyElserModelAndInferenceEndpoint,
  deployTinyElserAndSetupKb,
} from '../utils/model_and_inference';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  async function getEntries({
    query = '',
    sortBy = 'title',
    sortDirection = 'asc',
    spaceId,
    user = 'editor',
  }: {
    query?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    spaceId?: string;
    user?: 'admin' | 'editor' | 'viewer';
  } = {}): Promise<KnowledgeBaseEntry[]> {
    const res = await observabilityAIAssistantAPIClient[user]({
      endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
      params: {
        query: { query, sortBy, sortDirection },
      },
      spaceId,
    });
    expect(res.status).to.be(200);

    return res.body.entries;
  }

  async function saveEntry(knowledgeBaseEntry: { title: string; text: string; id: string }) {
    const { status } = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
      params: { body: knowledgeBaseEntry },
    });
    expect(status).to.be(200);
  }

  describe('Knowledge base: Basic operations', function () {
    before(async () => {
      await deployTinyElserAndSetupKb(getService);
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await clearKnowledgeBase(es);
    });

    describe('when managing a single entry', () => {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-1',
        title: 'My title',
        text: 'My content',
      };

      before(async () => {
        await saveEntry(knowledgeBaseEntry);
      });

      it('can retrieve the entry', async () => {
        const entries = await getEntries();
        const entry = entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.title).to.equal(knowledgeBaseEntry.title);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('does not retrieve deprecated properties', async () => {
        await clearKnowledgeBase(es);
        await addKnowledgeBaseEntryToEs(es, {
          confidence: 'high' as const,
          '@timestamp': new Date().toISOString(),
          role: KnowledgeBaseEntryRole.UserEntry,
          is_correction: true,
          public: false,
          labels: {},
          ...knowledgeBaseEntry,
        });

        const hits = await getKnowledgeBaseEntriesFromEs(es);
        const hitSource = hits[0]._source;
        expect(hitSource).to.have.property('is_correction');
        expect(hitSource).to.have.property('confidence');

        const entries = await getEntries();
        const entry = entries[0];
        expect(entry).not.to.have.property('confidence');
        expect(entry).not.to.have.property('is_correction');

        await clearKnowledgeBase(es);

        await saveEntry(knowledgeBaseEntry);
      });

      it('generates sparse embeddings', async () => {
        const hits = await getKnowledgeBaseEntriesFromEs(es);
        const embeddings =
          hits[0]._source?._inference_fields?.semantic_text?.inference.chunks.semantic_text[0]
            .embeddings;

        const sorted = orderBy(toPairs(embeddings), [1], ['desc']).slice(0, 5);

        expect(size(embeddings)).to.be.greaterThan(10);
        expect(sorted).to.eql([
          ['temperature', 0.07421875],
          ['used', 0.068359375],
          ['definition', 0.03955078],
          ['only', 0.038208008],
          ['what', 0.028930664],
        ]);
      });

      it('can delete the entry', async () => {
        const entryId = 'my-doc-id-1';
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: {
            path: { entryId },
          },
        });
        expect(status).to.be(200);

        const entries = await getEntries();
        expect(entries.length).to.eql(0);
      });

      it('returns 500 on delete not found', async () => {
        const entryId = 'my-doc-id-1';
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: {
            path: { entryId },
          },
        });
        expect(status).to.be(500);
      });
    });

    describe('when managing multiple entries', () => {
      beforeEach(async () => {
        await clearKnowledgeBase(es);

        const { status } = await observabilityAIAssistantAPIClient.editor({
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
        });
        expect(status).to.be(200);
      });

      afterEach(async () => {
        await clearKnowledgeBase(es);
      });

      it('creates multiple entries', async () => {
        const entries = await getEntries();
        expect(entries.length).to.eql(3);
      });

      describe('when sorting ', () => {
        it('allows sorting ascending', async () => {
          const entries = await getEntries({ sortBy: 'title', sortDirection: 'asc' });
          expect(entries.map(({ id }) => id)).to.eql(['my_doc_a', 'my_doc_b', 'my_doc_c']);
        });

        it('allows sorting descending', async () => {
          const entries = await getEntries({ sortBy: 'title', sortDirection: 'desc' });
          expect(entries.map(({ id }) => id)).to.eql(['my_doc_c', 'my_doc_b', 'my_doc_a']);
        });
      });

      it('allows searching by title', async () => {
        const entries = await getEntries({ query: 'b' });
        expect(entries.length).to.eql(1);
        expect(entries[0].title).to.eql('My title b');
      });
    });

    describe('when managing multiple entries across spaces', () => {
      const SPACE_A_ID = 'space_a';
      const SPACE_B_ID = 'space_b';

      before(async () => {
        await clearKnowledgeBase(es);

        const { status: importStatusForSpaceA } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
          params: {
            body: {
              entries: [
                {
                  id: 'my-doc-1',
                  title: `Entry in Space A by Admin 1`,
                  text: `This is a public entry in Space A created by Admin`,
                  public: true,
                },
                {
                  id: 'my-doc-2',
                  title: `Entry in Space A by Admin 2`,
                  text: `This is a private entry in Space A created by Admin`,
                  public: false,
                },
              ],
            },
          },
          spaceId: SPACE_A_ID,
        });
        expect(importStatusForSpaceA).to.be(200);

        const { status: importStatusForSpaceB } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
          params: {
            body: {
              entries: [
                {
                  id: 'my-doc-3',
                  title: `Entry in Space B by Admin 3`,
                  text: `This is a public entry in Space B created by Admin`,
                  public: true,
                },
                {
                  id: 'my-doc-4',
                  title: `Entry in Space B by Admin 4`,
                  text: `This is a private entry in Space B created by Admin`,
                  public: false,
                },
              ],
            },
          },
          spaceId: SPACE_B_ID,
        });
        expect(importStatusForSpaceB).to.be(200);
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('ensures users can only access entries relevant to their namespace', async () => {
        // User (admin) in space A should only see entries in space A
        const spaceAEntries = await getEntries({
          user: 'admin',
          spaceId: SPACE_A_ID,
        });

        expect(spaceAEntries.length).to.be(2);

        expect(spaceAEntries[0].id).to.equal('my-doc-1');
        expect(spaceAEntries[0].public).to.be(true);
        expect(spaceAEntries[0].title).to.equal('Entry in Space A by Admin 1');

        expect(spaceAEntries[1].id).to.equal('my-doc-2');
        expect(spaceAEntries[1].public).to.be(false);
        expect(spaceAEntries[1].title).to.equal('Entry in Space A by Admin 2');

        // User (admin) in space B should only see entries in space B
        const spaceBEntries = await getEntries({
          user: 'admin',
          spaceId: SPACE_B_ID,
        });

        expect(spaceBEntries.length).to.be(2);

        expect(spaceBEntries[0].id).to.equal('my-doc-3');
        expect(spaceBEntries[0].public).to.be(true);
        expect(spaceBEntries[0].title).to.equal('Entry in Space B by Admin 3');

        expect(spaceBEntries[1].id).to.equal('my-doc-4');
        expect(spaceBEntries[1].public).to.be(false);
        expect(spaceBEntries[1].title).to.equal('Entry in Space B by Admin 4');
      });

      it('should allow a user who is not the owner of the entries to access entries relevant to their namespace', async () => {
        // User (editor) in space B should only see entries in space B
        const spaceBEntries = await getEntries({
          user: 'editor',
          spaceId: SPACE_B_ID,
        });

        expect(spaceBEntries.length).to.be(2);

        expect(spaceBEntries[0].id).to.equal('my-doc-3');
        expect(spaceBEntries[0].public).to.be(true);
        expect(spaceBEntries[0].title).to.equal('Entry in Space B by Admin 3');

        expect(spaceBEntries[1].id).to.equal('my-doc-4');
        expect(spaceBEntries[1].public).to.be(false);
        expect(spaceBEntries[1].title).to.equal('Entry in Space B by Admin 4');
      });
    });

    describe('security roles and access privileges', () => {
      describe('should deny access for users without the ai_assistant privilege', () => {
        it('POST /internal/observability_ai_assistant/kb/entries/save', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
            params: {
              body: {
                id: 'my-doc-id-1',
                title: 'My title',
                text: 'My content',
              },
            },
          });
          expect(status).to.be(403);
        });

        it('GET /internal/observability_ai_assistant/kb/entries', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: { query: '', sortBy: 'title', sortDirection: 'asc' },
            },
          });
          expect(status).to.be(403);
        });

        it('DELETE /internal/observability_ai_assistant/kb/entries/{entryId}', async () => {
          const { status } = await observabilityAIAssistantAPIClient.viewer({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId: 'my-doc-id-1' },
            },
          });
          expect(status).to.be(403);
        });
      });
    });
  });
}
