/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import expect from '@kbn/expect';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteTinyElserModelAndInferenceEndpoint,
  deployTinyElserAndSetupKb,
  TINY_ELSER_INFERENCE_ID,
} from '../utils/knowledge_base';
import { restoreIndexAssets } from '../utils/index_assets';

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
  const retry = getService('retry');

  const archive =
    'x-pack/test/functional/es_archives/observability/ai_assistant/knowledge_base_8_15';

  async function getKnowledgeBaseEntries() {
    const res = (await es.search({
      index: '.kibana-observability-ai-assistant-kb*',
      // Add fields parameter to include inference metadata
      fields: ['_inference_fields'],
      query: {
        match_all: {},
      },
    })) as SearchResponse<KnowledgeBaseEntry & SemanticTextField>;

    return res.hits.hits;
  }

  // In 8.19 / 9.1 the custom inference endpoint ("obs_ai_assistant_kb_inference") is replaced with the preconfigured endpoint ".elser-2-elasticsearch"
  // We need to make sure that the custom inference endpoint is removed and the preconfigured one is used instead

  describe('when the knowledge base index was created in 8.17 or 8.18', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await deleteTinyElserModelAndInferenceEndpoint(getService);
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      await esArchiver.load(archive);
      await deployTinyElserAndSetupKb(getService);
    });

    after(async () => {
      await deleteTinyElserModelAndInferenceEndpoint(getService);
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
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
          endpoint: 'POST /internal/observability_ai_assistant/kb/migrations/startup',
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
              inferenceId: TINY_ELSER_INFERENCE_ID,
              chunkCount: 1,
            },
            {
              text: "The user's favourite color is blue.",
              inferenceId: TINY_ELSER_INFERENCE_ID,
              chunkCount: 1,
            },
          ]);
        });
      });

      it('returns entries correctly via API', async () => {
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
