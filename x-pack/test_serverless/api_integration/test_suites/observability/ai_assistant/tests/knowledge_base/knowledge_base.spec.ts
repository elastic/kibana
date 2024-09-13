/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  clearKnowledgeBase,
  createKnowledgeBaseModel,
  deleteKnowledgeBaseModel,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/tests/knowledge_base/helpers';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  // TODO: https://github.com/elastic/kibana/issues/192886
  describe.skip('Knowledge base', function () {
    // TODO: https://github.com/elastic/kibana/issues/192757
    this.tags(['skipMKI']);
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await createKnowledgeBaseModel(ml);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns 200 on knowledge base setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          roleAuthc,
          internalReqHeader,
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
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
            params: { body: knowledgeBaseEntry },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);
        const res = await observabilityAIAssistantAPIClient.slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
          params: {
            query: {
              query: '',
              sortBy: 'doc_id',
              sortDirection: 'asc',
            },
          },
          roleAuthc,
          internalReqHeader,
        });
        const entry = res.body.entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('returns 200 on get entries and entry exists', async () => {
        const res = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);
        const entry = res.body.entries[0];
        expect(entry.id).to.equal(knowledgeBaseEntry.id);
        expect(entry.text).to.equal(knowledgeBaseEntry.text);
      });

      it('returns 200 on delete', async () => {
        const entryId = 'my-doc-id-1';
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);
        expect(res.body.entries.filter((entry) => entry.id.startsWith('my-doc-id')).length).to.eql(
          0
        );
      });

      it('returns 500 on delete not found', async () => {
        const entryId = 'my-doc-id-1';
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'DELETE /internal/observability_ai_assistant/kb/entries/{entryId}',
            params: {
              path: { entryId },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(500);
      });
    });
    describe('when managing multiple entries', () => {
      before(async () => {
        await clearKnowledgeBase(es);
      });
      afterEach(async () => {
        await clearKnowledgeBase(es);
      });
      const knowledgeBaseEntries = [
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
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: { body: { entries: knowledgeBaseEntries } },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);
        expect(res.body.entries.filter((entry) => entry.id.startsWith('my_doc')).length).to.eql(3);
      });

      it('allows sorting', async () => {
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: { body: { entries: knowledgeBaseEntries } },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'desc',
              },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        const entries = res.body.entries.filter((entry) => entry.id.startsWith('my_doc'));
        expect(entries[0].id).to.eql('my_doc_c');
        expect(entries[1].id).to.eql('my_doc_b');
        expect(entries[2].id).to.eql('my_doc_a');

        // asc
        const resAsc = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: '',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        const entriesAsc = resAsc.body.entries.filter((entry) => entry.id.startsWith('my_doc'));
        expect(entriesAsc[0].id).to.eql('my_doc_a');
        expect(entriesAsc[1].id).to.eql('my_doc_b');
        expect(entriesAsc[2].id).to.eql('my_doc_c');
      });
      it('allows searching', async () => {
        await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
            params: { body: { entries: knowledgeBaseEntries } },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        const res = await observabilityAIAssistantAPIClient
          .slsUser({
            endpoint: 'GET /internal/observability_ai_assistant/kb/entries',
            params: {
              query: {
                query: 'my_doc_a',
                sortBy: 'doc_id',
                sortDirection: 'asc',
              },
            },
            roleAuthc,
            internalReqHeader,
          })
          .expect(200);

        expect(res.body.entries.length).to.eql(1);
        expect(res.body.entries[0].id).to.eql('my_doc_a');
      });
    });
  });
}
