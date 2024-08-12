/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { kbnTestConfig } from '@kbn/test';
import { SecurityService } from '@kbn/test-suites-src/common/services/security/security';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ObservabilityAIAssistantApiClient } from '../../common/observability_ai_assistant_api_client';
import { clearKnowledgeBase, createKnowledgeBaseModel, deleteKnowledgeBaseModel } from './helpers';

export async function createUserAndApiClient({
  getScopedApiClientForUsername,
  security,
  username,
  roles,
}: {
  getScopedApiClientForUsername: (username: string) => ObservabilityAIAssistantApiClient;
  security: SecurityService;
  username: string;
  roles: string[];
}) {
  const password = kbnTestConfig.getUrlParts().password!;
  await security.user.create(username, { password, roles });
  return getScopedApiClientForUsername('editor');
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const getScopedApiClientForUsername = getService('getScopedApiClientForUsername');
  const security = getService('security');
  const es = getService('es');
  const ml = getService('ml');

  describe('Knowledge base user instructions', () => {
    const secondaryUser = 'another-editor';

    before(async () => {
      // create user
      const password = kbnTestConfig.getUrlParts().password!;
      await security.user.create(secondaryUser, { password, roles: ['editor'] });
      await createKnowledgeBaseModel(ml);

      await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await security.user.delete(secondaryUser);
      await clearKnowledgeBase(es);
    });

    describe('when creating a private user instruction', () => {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-1',
        text: 'My private user instruction',
        public: false,
      };

      before(async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: { body: knowledgeBaseEntry },
          })
          .expect(200);
      });

      it('can be retrieved by the author', async () => {
        const res = await observabilityAIAssistantAPIClient.editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });
        const entry = res.body.userInstructions[0];
        expect(entry.doc_id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('cannot be retrieved by another user', async () => {
        const apiClient = getScopedApiClientForUsername(secondaryUser);
        const res = await apiClient({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });

        expect(res.body.userInstructions.length).to.equal(0);
      });
    });

    describe('when creating a public user instruction', () => {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-2',
        text: 'My public user instruction',
        public: true,
      };

      before(async () => {
        await observabilityAIAssistantAPIClient
          .editorUser({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: { body: knowledgeBaseEntry },
          })
          .expect(200);
      });

      it('can be retrieved by the author', async () => {
        const res = await observabilityAIAssistantAPIClient.editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });
        const entry = res.body.userInstructions[0];
        expect(entry.doc_id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('can be retrieved by another user', async () => {
        const apiClient = getScopedApiClientForUsername(secondaryUser);
        const res = await apiClient({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });

        const entry = res.body.userInstructions[0];
        expect(entry.doc_id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });
    });
  });
}
