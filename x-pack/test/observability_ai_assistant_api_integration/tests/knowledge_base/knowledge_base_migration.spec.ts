/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import expect from '@kbn/expect';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/inference_endpoint';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  createKnowledgeBaseModel,
  clearKnowledgeBase,
  deleteInferenceEndpoint,
  TINY_ELSER,
} from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const ml = getService('ml');

  const archive =
    'x-pack/test/functional/es_archives/observability/ai_assistant/knowledge_base_8_15';

  describe('When there are knowledge base entries (from 8.15 or earlier) that does not contain semantic_text embeddings', () => {
    before(async () => {
      await clearKnowledgeBase(es);
      await esArchiver.load(archive);
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
      await clearKnowledgeBase(es);
      await esArchiver.unload(archive);
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
    });

    async function getKnowledgeBaseEntries() {
      const res = (await es.search({
        index: '.kibana-observability-ai-assistant-kb*',
        body: {
          query: {
            match_all: {},
          },
        },
      })) as SearchResponse<
        KnowledgeBaseEntry & {
          semantic_text: {
            text: string;
            inference: { inference_id: string; chunks: Array<{ text: string; embeddings: any }> };
          };
        }
      >;

      return res.hits.hits;
    }

    describe('before migrating', () => {
      it('the docs do not have semantic_text embeddings', async () => {
        const hits = await getKnowledgeBaseEntries();
        const hasSemanticTextEmbeddings = hits.some((hit) => hit._source?.semantic_text);
        expect(hasSemanticTextEmbeddings).to.be(false);
      });
    });

    describe('after migrating', () => {
      before(async () => {
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'POST /internal/observability_ai_assistant/kb/semantic_text_migration',
          })
          .expect(200);
      });

      it('the docs have semantic_text embeddings', async () => {
        const hits = await getKnowledgeBaseEntries();
        const hasSemanticTextEmbeddings = hits.every((hit) => hit._source?.semantic_text);
        expect(hasSemanticTextEmbeddings).to.be(true);

        expect(
          orderBy(hits, '_source.title').map(({ _source }) => {
            const { text, inference } = _source?.semantic_text!;

            return {
              text,
              inferenceId: inference.inference_id,
              chunkCount: inference.chunks.length,
            };
          })
        ).to.eql([
          {
            text: 'To infinity and beyond!',
            inferenceId: AI_ASSISTANT_KB_INFERENCE_ID,
            chunkCount: 1,
          },
          {
            text: "The user's favourite color is blue.",
            inferenceId: AI_ASSISTANT_KB_INFERENCE_ID,
            chunkCount: 1,
          },
        ]);
      });

      it('returns entries correctly via API', async () => {
        await observabilityAIAssistantAPIClient
          .editor({
            endpoint: 'POST /internal/observability_ai_assistant/kb/semantic_text_migration',
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

        expect(
          res.body.entries.map(({ title, text, role, type }) => ({ title, text, role, type }))
        ).to.eql([
          {
            role: 'user_entry',
            title: 'Toy Story quote',
            type: 'contextual',
            text: 'To infinity and beyond!',
          },
          {
            role: 'assistant_summarization',
            title: "User's favourite color",
            type: 'contextual',
            text: "The user's favourite color is blue.",
          },
        ]);
      });
    });
  });
}
