/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import expect from '@kbn/expect';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/create_inference_endpoint';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  createKnowledgeBaseModel,
  clearKnowledgeBase,
  createInferenceEndpoint,
  deleteInferenceEndpoint,
} from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const ml = getService('ml');

  const archive =
    'x-pack/test/functional/es_archives/observability/ai_assistant/knowledge_base_8_15';

  describe('When there are knowledge base entries from 8.15 or earlier', () => {
    before(async () => {
      await clearKnowledgeBase(es);
      await esArchiver.load(archive);
      await createKnowledgeBaseModel(ml);
      await createInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID });

      await observabilityAIAssistantAPIClient
        .editor({
          endpoint: 'POST /internal/observability_ai_assistant/kb/semantic_text_migration',
        })
        .expect(200);
    });

    after(async () => {
      await clearKnowledgeBase(es);
      await esArchiver.unload(archive);
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID });
    });

    it('adds semantic_text embeddings to migrated docs', async () => {
      const res = await es.search({
        index: '.kibana-observability-ai-assistant-kb*',
        body: {
          query: {
            match_all: {},
          },
        },
      });

      expect(
        orderBy(res.hits.hits, '_source.title').map(({ _source }) => {
          const { semantic_text: semanticText } = _source as any;

          if (!semanticText) {
            throw new Error('semantic_text field is missing');
          }

          return {
            text: semanticText.text,
            inferenceId: semanticText.inference.inference_id,
            chunkCount: semanticText.inference.chunks.length,
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

    it('returns items correctly via the api', async () => {
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
}
