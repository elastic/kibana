/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { kbnTestConfig } from '@kbn/test';
import { SecurityService } from '@kbn/test-suites-src/common/services/security/security';
import { sortBy } from 'lodash';
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
    const secondaryUser = 'john';

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

    describe('when creating private and public user instructions', () => {
      before(async () => {
        await clearKnowledgeBase(es);

        const promises = [
          {
            username: 'editor',
            isPublic: true,
          },
          {
            username: 'editor',
            isPublic: false,
          },
          {
            username: 'john',
            isPublic: true,
          },
          {
            username: 'john',
            isPublic: false,
          },
        ].map(async ({ username, isPublic }) => {
          const visibility = isPublic ? 'Public' : 'Private';
          await getScopedApiClientForUsername(username)({
            endpoint: 'PUT /internal/observability_ai_assistant/kb/user_instructions',
            params: {
              body: {
                id: `${visibility.toLowerCase()}-doc-from-${username}`,
                text: `${visibility} user instruction from "${username}"`,
                public: isPublic,
              },
            },
          }).expect(200);
        });

        await Promise.all(promises);
      });

      it('"editor" can retrieve their own private instructions and the public instruction', async () => {
        const res = await observabilityAIAssistantAPIClient.editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });
        const instructions = res.body.userInstructions;

        const sortByDocId = (data: any) => sortBy(data, 'doc_id');
        expect(sortByDocId(instructions)).to.eql(
          sortByDocId([
            {
              doc_id: 'private-doc-from-editor',
              public: false,
              text: 'Private user instruction from "editor"',
            },
            {
              doc_id: 'public-doc-from-editor',
              public: true,
              text: 'Public user instruction from "editor"',
            },
            {
              doc_id: 'public-doc-from-john',
              public: true,
              text: 'Public user instruction from "john"',
            },
          ])
        );
      });

      it('"john" can retrieve their own private instructions and the public instruction', async () => {
        const res = await getScopedApiClientForUsername('john')({
          endpoint: 'GET /internal/observability_ai_assistant/kb/user_instructions',
        });
        const instructions = res.body.userInstructions;

        const sortByDocId = (data: any) => sortBy(data, 'doc_id');
        expect(sortByDocId(instructions)).to.eql(
          sortByDocId([
            {
              doc_id: 'public-doc-from-editor',
              public: true,
              text: 'Public user instruction from "editor"',
            },
            {
              doc_id: 'public-doc-from-john',
              public: true,
              text: 'Public user instruction from "john"',
            },
            {
              doc_id: 'private-doc-from-john',
              public: false,
              text: 'Private user instruction from "john"',
            },
          ])
        );
      });
    });
  });
}
