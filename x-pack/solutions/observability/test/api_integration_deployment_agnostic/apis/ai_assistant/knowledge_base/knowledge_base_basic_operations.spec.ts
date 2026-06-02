/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { clearKnowledgeBase } from '../utils/knowledge_base';
import {
  teardownTinyElserModelAndInferenceEndpoint,
  deployTinyElserAndSetupKb,
} from '../utils/model_and_inference';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  async function getEntries({
    query = '',
    spaceId,
    user,
  }: {
    query?: string;
    spaceId?: string;
    user: 'admin' | 'editor' | 'viewer';
  }): Promise<KnowledgeBaseEntry[]> {
    const res = await observabilityAIAssistantAPIClient[user]({
      endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
      params: { query: { query, sortBy: 'title', sortDirection: 'asc' } },
      spaceId,
    });
    expect(res.status).to.be(200);
    return res.body.entries;
  }

  async function saveEntry({
    user,
    entry,
  }: {
    user: 'admin' | 'editor' | 'viewer';
    entry: { id: string; title: string; text: string };
  }) {
    const { status } = await observabilityAIAssistantAPIClient[user]({
      endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
      params: { body: entry },
    });
    expect(status).to.be(200);
  }

  describe('Knowledge base: Basic operations', function () {
    // fails/flaky on MKI, see https://github.com/elastic/kibana/issues/233089
    this.tags(['failsOnMKI']);

    before(async () => {
      await deployTinyElserAndSetupKb(getService);
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await clearKnowledgeBase(es);
    });

    describe('when managing a single entry', () => {
      const entry = { id: 'my-doc-id-1', title: 'My title', text: 'My content' };

      before(async () => {
        await saveEntry({ user: 'editor', entry });
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('can retrieve the entry', async () => {
        const entries = await getEntries({ user: 'editor' });
        expect(entries[0].id).to.equal(entry.id);
        expect(entries[0].title).to.equal(entry.title);
        expect(entries[0].text).to.equal(entry.text);
      });

      it('can delete the entry', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: { path: { entryId: entry.id } },
        });
        expect(status).to.be(200);
        expect(await getEntries({ user: 'editor' })).to.have.length(0);
      });

      it('returns 404 on delete not found', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: { path: { entryId: entry.id } },
        });
        expect(status).to.be(404);
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
                { id: 'my_doc_a', title: 'My title a', text: 'My content a' },
                { id: 'my_doc_b', title: 'My title b', text: 'My content b' },
                { id: 'my_doc_c', title: 'My title c', text: 'My content c' },
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
        const entries = await getEntries({ user: 'editor' });
        expect(entries).to.have.length(3);
      });

      it('allows searching by title', async () => {
        const entries = await getEntries({ user: 'editor', query: 'b' });
        expect(entries).to.have.length(1);
        expect(entries[0].title).to.eql('My title b');
      });
    });

    describe('when managing entries across spaces', () => {
      const SPACE_A_ID = 'space_a';
      const SPACE_B_ID = 'space_b';

      before(async () => {
        await clearKnowledgeBase(es);

        const { status: spaceAStatus } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
          params: {
            body: {
              entries: [
                {
                  id: 'my-doc-1',
                  title: 'Space A entry 1',
                  text: 'public entry in Space A',
                  public: true,
                },
                {
                  id: 'my-doc-2',
                  title: 'Space A entry 2',
                  text: 'private entry in Space A',
                  public: false,
                },
              ],
            },
          },
          spaceId: SPACE_A_ID,
        });
        expect(spaceAStatus).to.be(200);

        const { status: spaceBStatus } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
          params: {
            body: {
              entries: [
                {
                  id: 'my-doc-3',
                  title: 'Space B entry 3',
                  text: 'public entry in Space B',
                  public: true,
                },
                {
                  id: 'my-doc-4',
                  title: 'Space B entry 4',
                  text: 'private entry in Space B',
                  public: false,
                },
              ],
            },
          },
          spaceId: SPACE_B_ID,
        });
        expect(spaceBStatus).to.be(200);
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('only returns entries from the user own space', async () => {
        const spaceAEntries = await getEntries({ user: 'admin', spaceId: SPACE_A_ID });
        expect(spaceAEntries.map(({ id }) => id)).to.eql(['my-doc-1', 'my-doc-2']);

        const spaceBEntries = await getEntries({ user: 'admin', spaceId: SPACE_B_ID });
        expect(spaceBEntries.map(({ id }) => id)).to.eql(['my-doc-3', 'my-doc-4']);
      });

      it('only returns public entries to a non-owner in the same space', async () => {
        const spaceAEntries = await getEntries({ user: 'editor', spaceId: SPACE_A_ID });
        expect(spaceAEntries.map(({ id }) => id)).to.eql(['my-doc-1']);

        const spaceBEntries = await getEntries({ user: 'editor', spaceId: SPACE_B_ID });
        expect(spaceBEntries.map(({ id }) => id)).to.eql(['my-doc-3']);
      });
    });

    describe('security roles and access privileges', () => {
      it('denies POST /kb/entries/save for viewer', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: { body: { id: 'my-doc-id-1', title: 'My title', text: 'My content' } },
        });
        expect(status).to.be(403);
      });

      it('denies GET /kb/entries for viewer', async () => {
        const res = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: { query: { query: '', sortBy: 'title', sortDirection: 'asc' as const } },
        });
        expect(res.status).to.be(403);
      });

      it('denies DELETE /kb/entries/{entryId} for viewer', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: { path: { entryId: 'my-doc-id-1' } },
        });
        expect(status).to.be(403);
      });
    });
  });
}
