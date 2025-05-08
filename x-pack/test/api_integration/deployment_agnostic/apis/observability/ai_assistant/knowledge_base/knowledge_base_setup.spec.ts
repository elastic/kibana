/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { getInferenceIdFromWriteIndex } from '@kbn/observability-ai-assistant-plugin/server/service/knowledge_base_service/get_inference_id_from_write_index';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getComponentTemplate, restoreIndexAssets } from '../utils/index_assets';
import {
  TINY_ELSER_INFERENCE_ID,
  TINY_ELSER_MODEL_ID,
  createTinyElserInferenceEndpoint,
  deleteInferenceEndpoint,
  deployTinyElserAndSetupKb,
  importModel,
  deleteModel,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';
import {
  getConcreteWriteIndexFromAlias,
  waitForKnowledgeBaseReady,
  setupKnowledgeBase,
} from '../utils/knowledge_base';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const ml = getService('ml');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('Knowledge base: POST /internal/observability_ai_assistant/kb/setup', function () {
    before(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    afterEach(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    it('returns 200 when model is deployed', async () => {
      const { status } = await deployTinyElserAndSetupKb(getService);
      expect(status).to.be(200);
    });

    it('returns 200 if model is not deployed', async () => {
      const { status } = await setupKbAsAdmin(TINY_ELSER_INFERENCE_ID);
      expect(status).to.be(200);
    });

    it('has "pt_tiny_elser_inference_id" as initial inference id', async () => {
      const inferenceId = await getInferenceIdFromWriteIndex({ asInternalUser: es });
      expect(inferenceId).to.be(TINY_ELSER_INFERENCE_ID);
    });

    describe('re-indexing', () => {
      describe('running setup for a different inference endpoint', () => {
        const CUSTOM_TINY_ELSER_INFERENCE_ID = 'custom_tiny_elser_inference_id';
        let body: Awaited<ReturnType<typeof setupKbAsAdmin>>['body'];

        before(async () => {
          // setup KB initially
          await deployTinyElserAndSetupKb(getService);

          // setup KB with custom inference endpoint
          await createTinyElserInferenceEndpoint(getService, {
            inferenceId: CUSTOM_TINY_ELSER_INFERENCE_ID,
          });
          const res = await setupKbAsAdmin(CUSTOM_TINY_ELSER_INFERENCE_ID);
          body = res.body;

          await waitForKnowledgeBaseReady(getService);
        });

        after(async () => {
          await deleteInferenceEndpoint(getService, {
            inferenceId: CUSTOM_TINY_ELSER_INFERENCE_ID,
          });
        });

        it('should re-index the KB', async () => {
          expect(body.reindex).to.be(true);
          expect(body.currentInferenceId).to.be(TINY_ELSER_INFERENCE_ID);
          expect(body.nextInferenceId).to.be(CUSTOM_TINY_ELSER_INFERENCE_ID);
          await expectWriteIndexName(`${resourceNames.writeIndexAlias.kb}-000002`);
        });
      });

      describe('running setup for the same inference id', () => {
        let body: Awaited<ReturnType<typeof setupKbAsAdmin>>['body'];

        before(async () => {
          await deployTinyElserAndSetupKb(getService);
          const res = await setupKbAsAdmin(TINY_ELSER_INFERENCE_ID);
          body = res.body;
        });

        it('does not re-index', async () => {
          expect(body.reindex).to.be(false);
          expect(body.currentInferenceId).to.be(TINY_ELSER_INFERENCE_ID);
          expect(body.nextInferenceId).to.be(TINY_ELSER_INFERENCE_ID);
          await expectWriteIndexName(`${resourceNames.writeIndexAlias.kb}-000001`);
        });
      });
    });

    describe('when installing a custom inference endpoint', function () {
      const customInferenceId = 'my_custom_inference_id';

      before(async () => {
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
        await importModel(ml, { modelId: TINY_ELSER_MODEL_ID });
        await createTinyElserInferenceEndpoint(getService, {
          inferenceId: customInferenceId,
        });
        await setupKnowledgeBase(observabilityAIAssistantAPIClient, customInferenceId);
        await waitForKnowledgeBaseReady(getService);
      });

      after(async () => {
        await deleteModel(getService, { modelId: TINY_ELSER_MODEL_ID });
        await deleteInferenceEndpoint(getService, { inferenceId: customInferenceId });
      });

      it('has correct semantic_text mapping in component template', async () => {
        const res = await getComponentTemplate(es);
        const semanticTextMapping = res.component_template.template.mappings?.properties
          ?.semantic_text as { inference_id: string };

        expect(semanticTextMapping.inference_id).to.be(customInferenceId);
      });
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        const { status } = await setupKbAsViewer(TINY_ELSER_INFERENCE_ID);
        expect(status).to.be(403);
      });
    });
  });

  async function expectWriteIndexName(expectedName: string) {
    await retry.try(async () => {
      const writeIndex = await getConcreteWriteIndexFromAlias(es);
      expect(writeIndex).to.be(expectedName);
    });
  }

  function setupKbAsAdmin(inferenceId: string) {
    return observabilityAIAssistantAPIClient.admin({
      endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
      params: {
        query: { inference_id: inferenceId },
      },
    });
  }

  function setupKbAsViewer(inferenceId: string) {
    return observabilityAIAssistantAPIClient.viewer({
      endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
      params: {
        query: { inference_id: inferenceId },
      },
    });
  }
}
