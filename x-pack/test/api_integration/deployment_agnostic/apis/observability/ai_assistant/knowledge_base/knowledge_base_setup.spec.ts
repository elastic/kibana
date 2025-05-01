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
import { restoreIndexAssets } from '../utils/index_assets';
import {
  TINY_ELSER_INFERENCE_ID,
  createTinyElserInferenceEndpoint,
  deleteInferenceEndpoint,
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';
import { getConcreteWriteIndexFromAlias, waitForKnowledgeBaseReady } from '../utils/knowledge_base';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('/internal/observability_ai_assistant/kb/setup', function () {
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
          await createTinyElserInferenceEndpoint({
            es,
            log,
            inferenceId: CUSTOM_TINY_ELSER_INFERENCE_ID,
          });
          const res = await setupKbAsAdmin(CUSTOM_TINY_ELSER_INFERENCE_ID);
          body = res.body;

          await waitForKnowledgeBaseReady({ observabilityAIAssistantAPIClient, log, retry });
        });

        after(async () => {
          await deleteInferenceEndpoint({ es, log, inferenceId: CUSTOM_TINY_ELSER_INFERENCE_ID });
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
