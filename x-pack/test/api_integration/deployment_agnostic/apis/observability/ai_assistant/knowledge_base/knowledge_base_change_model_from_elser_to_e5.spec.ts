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
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('when changing from ELSER to E5-like model', function () {
    let elserEntriesFromApi: KnowledgeBaseEntry[];
    let elserEntriesFromEs: Awaited<ReturnType<typeof getKnowledgeBaseEntriesFromEs>>;
    let elserInferenceId: string;
    let elserWriteIndex: string;

    let e5EntriesFromApi: KnowledgeBaseEntry[];
    let e5EntriesFromEs: Awaited<ReturnType<typeof getKnowledgeBaseEntriesFromEs>>;
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
        await getKnowledgeBaseEntriesFromApi(observabilityAIAssistantAPIClient)
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

      e5EntriesFromApi = (await getKnowledgeBaseEntriesFromApi(observabilityAIAssistantAPIClient))
        .body.entries;

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
        // sparse embeddings are modelled as key-value pairs
        const hasSparseEmbeddings = elserEntriesFromEs.every((hit) => {
          return hit._source?._inference_fields.semantic_text.inference.chunks.semantic_text.every(
            (chunk) => isObject(chunk.embeddings)
          );
        });
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
        // dense embeddings are modelled as arrays of numbers
        const hasDenseEmbeddings = e5EntriesFromEs.every((hit) => {
          return hit._source?._inference_fields.semantic_text.inference.chunks.semantic_text.every(
            (chunk) => isArray(chunk.embeddings)
          );
        });
        expect(hasDenseEmbeddings).to.be(true);
      });
    });
  });
}
