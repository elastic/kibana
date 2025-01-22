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
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  createKnowledgeBaseModel,
  clearKnowledgeBase,
  deleteInferenceEndpoint,
  TINY_ELSER,
} from './helpers';

interface InferenceChunk {
  text: string;
  embeddings: any;
}

interface InferenceData {
  inference_id: string;
  chunks: {
    semantic_text: InferenceChunk[];
  };
}

interface SemanticTextField {
  semantic_text: string;
  _inference_fields?: {
    semantic_text?: {
      inference: InferenceData;
    };
  };
}

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const ml = getService('ml');
  const retry = getService('retry');

  const archive =
    'x-pack/test/functional/es_archives/observability/ai_assistant/knowledge_base_8_15';

  async function getKnowledgeBaseEntries() {
    const res = (await es.search({
      index: '.kibana-observability-ai-assistant-kb*',
      // Add fields parameter to include inference metadata
      fields: ['_inference_fields'],
      body: {
        query: {
          match_all: {},
        },
      },
    })) as SearchResponse<KnowledgeBaseEntry & SemanticTextField>;

    return res.hits.hits;
  }

  // Failing: See https://github.com/elastic/kibana/issues/206474
  describe.skip('When there are knowledge base entries (from 8.15 or earlier) that does not contain semantic_text embeddings', function () {
    // security_exception: action [indices:admin/settings/update] is unauthorized for user [testing-internal] with effective roles [superuser] on restricted indices [.kibana_security_solution_1,.kibana_task_manager_1,.kibana_alerting_cases_1,.kibana_usage_counters_1,.kibana_1,.kibana_ingest_1,.kibana_analytics_1], this action is granted by the index privileges [manage,all]
    this.tags(['failsOnMKI']);

    before(async () => {
      await clearKnowledgeBase(es);
      await esArchiver.load(archive);
      await createKnowledgeBaseModel(ml);
      const { status } = await observabilityAIAssistantAPIClient.admin({
        endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
        params: {
          query: {
            model_id: TINY_ELSER.id,
          },
        },
      });

      expect(status).to.be(200);
    });

    after(async () => {
      await clearKnowledgeBase(es);
      await esArchiver.unload(archive);
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
    });

    describe('before migrating', () => {
      it('the docs do not have semantic_text embeddings', async () => {
        const hits = await getKnowledgeBaseEntries();
        const hasSemanticTextEmbeddings = hits.some((hit) => hit._source?.semantic_text);
        expect(hasSemanticTextEmbeddings).to.be(false);
      });
    });

    describe('after migrating', () => {
      before(async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/kb/semantic_text_migration',
        });
        expect(status).to.be(200);
      });

      it('the docs have semantic_text embeddings', async () => {
        await retry.try(async () => {
          const hits = await getKnowledgeBaseEntries();
          const hasSemanticTextEmbeddings = hits.every((hit) => hit._source?.semantic_text);
          expect(hasSemanticTextEmbeddings).to.be(true);

          expect(
            orderBy(hits, '_source.title').map(({ _source }) => {
              const text = _source?.semantic_text;
              const inference = _source?._inference_fields?.semantic_text?.inference;

              return {
                text: text ?? '',
                inferenceId: inference?.inference_id,
                chunkCount: inference?.chunks?.semantic_text?.length,
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
      });

      it('returns entries correctly via API', async () => {
        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/kb/semantic_text_migration',
        });

        expect(status).to.be(200);

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

        expect(res.status).to.be(200);

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
