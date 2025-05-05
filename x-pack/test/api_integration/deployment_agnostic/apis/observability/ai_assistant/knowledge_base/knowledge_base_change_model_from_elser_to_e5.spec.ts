/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getInferenceIdFromWriteIndex } from '@kbn/observability-ai-assistant-plugin/server/service/knowledge_base_service/get_inference_id_from_write_index';
import { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { isArray, isObject } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  addSampleDocsToInternalKb,
  getConcreteWriteIndexFromAlias,
  getKnowledgeBaseEntriesFromApi,
  getKnowledgeBaseEntriesFromEs,
  setupKnowledgeBase,
  waitForKnowledgeBaseIndex,
  waitForKnowledgeBaseReady,
} from '../utils/knowledge_base';
import { restoreIndexAssets } from '../utils/index_assets';
import {
  TINY_ELSER_INFERENCE_ID,
  TINY_ELSER_MODEL_ID,
  TINY_TEXT_EMBEDDING_INFERENCE_ID,
  TINY_TEXT_EMBEDDING_MODEL_ID,
  createTinyElserInferenceEndpoint,
  createTinyTextEmbeddingInferenceEndpoint,
  deleteInferenceEndpoint,
  deleteModel,
  importModel,
} from '../utils/model_and_inference';
import { animalSampleDocs } from '../utils/sample_docs';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const ml = getService('ml');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  type KnowledgeBaseEsEntry = Awaited<ReturnType<typeof getKnowledgeBaseEntriesFromEs>>[0];

  describe('when changing from ELSER to E5-like model', function () {
    let elserEntriesFromApi: KnowledgeBaseEntry[];
    let elserEntriesFromEs: KnowledgeBaseEsEntry[];
    let elserInferenceId: string;
    let elserWriteIndex: string;

    let e5EntriesFromApi: KnowledgeBaseEntry[];
    let e5EntriesFromEs: KnowledgeBaseEsEntry[];
    let e5InferenceId: string;
    let e5WriteIndex: string;

    before(async () => {
      await importModel(ml, { modelId: TINY_ELSER_MODEL_ID });
      await createTinyElserInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });
      await setupKnowledgeBase(observabilityAIAssistantAPIClient, TINY_ELSER_INFERENCE_ID);
      await waitForKnowledgeBaseReady(getService);

      // ingest documents
      await addSampleDocsToInternalKb(getService, animalSampleDocs);

      elserEntriesFromApi = (
        await getKnowledgeBaseEntriesFromApi({ observabilityAIAssistantAPIClient })
      ).body.entries;

      elserEntriesFromEs = await getKnowledgeBaseEntriesFromEs(es);
      elserInferenceId = await getInferenceIdFromWriteIndex({ asInternalUser: es });
      elserWriteIndex = await getConcreteWriteIndexFromAlias(es);

      // setup KB with E5-like model
      await importModel(ml, { modelId: TINY_TEXT_EMBEDDING_MODEL_ID });
      await ml.api.startTrainedModelDeploymentES(TINY_TEXT_EMBEDDING_MODEL_ID);
      await createTinyTextEmbeddingInferenceEndpoint(getService, {
        inferenceId: TINY_TEXT_EMBEDDING_INFERENCE_ID,
      });
      await setupKnowledgeBase(observabilityAIAssistantAPIClient, TINY_TEXT_EMBEDDING_INFERENCE_ID);

      await waitForKnowledgeBaseIndex(getService, '.kibana-observability-ai-assistant-kb-000002');
      await waitForKnowledgeBaseReady(getService);

      e5EntriesFromApi = (
        await getKnowledgeBaseEntriesFromApi({ observabilityAIAssistantAPIClient })
      ).body.entries;

      e5EntriesFromEs = await getKnowledgeBaseEntriesFromEs(es);
      e5InferenceId = await getInferenceIdFromWriteIndex({ asInternalUser: es });
      e5WriteIndex = await getConcreteWriteIndexFromAlias(es);
    });

    after(async () => {
      // ELSER
      await deleteModel(getService, { modelId: TINY_ELSER_MODEL_ID });
      await deleteInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });

      // E5-like
      await deleteModel(getService, { modelId: TINY_TEXT_EMBEDDING_MODEL_ID });
      await deleteInferenceEndpoint(getService, { inferenceId: TINY_TEXT_EMBEDDING_INFERENCE_ID });

      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    describe('when model is ELSER', () => {
      it('has correct write index name', async () => {
        expect(elserWriteIndex).to.be(`${resourceNames.writeIndexAlias.kb}-000001`);
      });

      it('has correct number of entries', async () => {
        expect(elserEntriesFromApi).to.have.length(5);
        expect(elserEntriesFromEs).to.have.length(5);
      });

      it('has correct ELSER inference id', async () => {
        expect(elserInferenceId).to.be(TINY_ELSER_INFERENCE_ID);
      });

      it('has sparse embeddings', async () => {
        const embeddings = getEmbeddings(e5EntriesFromEs);

        const hasSparseEmbeddings = embeddings.every((embedding) => {
          return (
            isObject(embedding) &&
            Object.values(embedding).every((value) => typeof value === 'number')
          );
        });

        if (!hasSparseEmbeddings) {
          log.warning('Must be sparse embeddings. Found:', JSON.stringify(embeddings, null, 2));
        }

        expect(hasSparseEmbeddings).to.be(true);
      });
    });

    describe('when model is changed to E5', () => {
      it('has increments the index name', async () => {
        expect(e5WriteIndex).to.be(`${resourceNames.writeIndexAlias.kb}-000002`);
      });

      it('returns the same entries from the API', async () => {
        expect(e5EntriesFromApi).to.eql(elserEntriesFromApi);
      });

      it('has updates the inference id', async () => {
        expect(e5InferenceId).to.be(TINY_TEXT_EMBEDDING_INFERENCE_ID);
      });

      it('has dense embeddings', async () => {
        const embeddings = getEmbeddings(e5EntriesFromEs);

        // dense embeddings are modelled as arrays of numbers
        const hasDenseEmbeddings = embeddings.every((embedding) => {
          return isArray(embedding) && embedding.every((value) => typeof value === 'number');
        });

        if (!hasDenseEmbeddings) {
          log.warning('Must be dense embeddings. Found:', JSON.stringify(embeddings, null, 2));
        }

        expect(hasDenseEmbeddings).to.be(true);
      });
    });

    function getEmbeddings(hits: KnowledgeBaseEsEntry[]) {
      return hits.flatMap((hit) => {
        return hit._source!._inference_fields.semantic_text.inference.chunks.semantic_text.map(
          (chunk) => chunk.embeddings
        );
      });
    }
  });
}
