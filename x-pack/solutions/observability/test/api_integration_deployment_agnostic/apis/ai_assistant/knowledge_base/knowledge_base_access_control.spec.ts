/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { clearKnowledgeBase } from '../utils/knowledge_base';
import {
  teardownTinyElserModelAndInferenceEndpoint,
  deployTinyElserAndSetupKb,
} from '../utils/model_and_inference';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('Knowledge base: Access control (IDOR prevention)', function () {
    this.tags(['failsOnMKI']);

    before(async () => {
      await deployTinyElserAndSetupKb(getService);
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await clearKnowledgeBase(es);
    });

    describe('reading entries across users in the same space', () => {
      const adminPrivateEntryId = 'admin-private-entry';
      const adminPublicEntryId = 'admin-public-entry';

      before(async () => {
        await clearKnowledgeBase(es);

        const { status: privateStatus } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: {
            body: {
              id: adminPrivateEntryId,
              title: 'Admin private entry',
              text: 'sensitive content',
              public: false,
            },
          },
        });
        expect(privateStatus).to.be(200);

        const { status: publicStatus } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: {
            body: {
              id: adminPublicEntryId,
              title: 'Admin public entry',
              text: 'public content',
              public: true,
            },
          },
        });
        expect(publicStatus).to.be(200);
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('editor cannot see another user private entry', async () => {
        const { body, status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: {
            query: { query: '', sortBy: 'title', sortDirection: 'asc' },
          },
        });
        expect(status).to.be(200);
        const ids = body.entries.map((e: { id: string }) => e.id);
        expect(ids).not.to.contain(adminPrivateEntryId);
      });

      it('editor can see another user public entry', async () => {
        const { body, status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: {
            query: { query: '', sortBy: 'title', sortDirection: 'asc' },
          },
        });
        expect(status).to.be(200);
        const ids = body.entries.map((e: { id: string }) => e.id);
        expect(ids).to.contain(adminPublicEntryId);
      });

      it('admin can see their own private entry', async () => {
        const { body, status } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: {
            query: { query: '', sortBy: 'title', sortDirection: 'asc' },
          },
        });
        expect(status).to.be(200);
        const ids = body.entries.map((e: { id: string }) => e.id);
        expect(ids).to.contain(adminPrivateEntryId);
      });
    });

    describe('deleting another user entry', () => {
      const adminEntryId = 'admin-entry-for-delete';

      before(async () => {
        await clearKnowledgeBase(es);
        const { status } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: {
            body: {
              id: adminEntryId,
              title: 'Admin entry',
              text: 'content',
              public: false,
            },
          },
        });
        expect(status).to.be(200);
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('editor cannot delete another user entry', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: { path: { entryId: adminEntryId } },
        });
        expect(status).to.be(404);
      });

      it('admin can delete their own entry', async () => {
        const { status } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
          params: { path: { entryId: adminEntryId } },
        });
        expect(status).to.be(200);
      });
    });

    describe('overwriting another user entry', () => {
      const adminEntryId = 'admin-entry-for-overwrite';

      before(async () => {
        await clearKnowledgeBase(es);
        const { status } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: {
            body: {
              id: adminEntryId,
              title: 'Original title',
              text: 'original content',
              public: false,
            },
          },
        });
        expect(status).to.be(200);
      });

      after(async () => {
        await clearKnowledgeBase(es);
      });

      it('editor cannot overwrite another user entry', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: {
            body: {
              id: adminEntryId,
              title: 'Poisoned title',
              text: 'poisoned content',
              public: false,
            },
          },
        });
        expect(status).to.be(403);
      });

      it('admin can update their own entry', async () => {
        const { status } = await observabilityAIAssistantAPIClient.admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
          params: {
            body: {
              id: adminEntryId,
              title: 'Updated title',
              text: 'updated content',
              public: false,
            },
          },
        });
        expect(status).to.be(200);
      });
    });
  });
}
