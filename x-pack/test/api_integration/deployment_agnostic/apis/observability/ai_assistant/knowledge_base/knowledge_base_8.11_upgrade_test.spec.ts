/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  TINY_ELSER_INFERENCE_ID,
  TINY_ELSER_MODEL_ID,
  createTinyElserInferenceEndpoint,
  deleteTinyElserModelAndInferenceEndpoint,
  importTinyElserModel,
} from '../utils/knowledge_base';
import {
  createOrUpdateIndexAssets,
  deleteIndexAssets,
  restoreIndexAssets,
  runStartupMigrations,
} from '../utils/index_assets';
import { restoreKbSnapshot } from '../utils/snapshots';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');
  const ml = getService('ml');

  // Sparse vector field was introduced in Elasticsearch 8.11
  // Indices created prior to this does not support semantic text, and will need to be reindexed
  describe('when the knowledge base index was created before 8.11', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      // in a real environment we will use the ELSER inference endpoint (`.elser-2-elasticsearch`) which is pre-installed
      // the model is also preloaded (but not deployed)
      await importTinyElserModel(ml);
      await createTinyElserInferenceEndpoint({ es, log, inferenceId: TINY_ELSER_INFERENCE_ID });
    });

    after(async () => {
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      await deleteTinyElserModelAndInferenceEndpoint(getService);
    });

    describe('before running migrations', () => {
      before(async () => {
        await deleteIndexAssets(es);
        await restoreKbSnapshot({
          log,
          es,
          snapshotRepoName: 'snapshot_kb_8.10',
          snapshotName: 'my_snapshot',
        });
        await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      });

      it('has an index created version earlier than 8.11', async () => {
        await retry.try(async () => {
          expect(await getKbIndexCreatedVersion()).to.be.lessThan(8110000);
        });
      });

      it('cannot add new entries to KB until reindex has completed', async () => {
        const res1 = await createKnowledgeBaseEntry();

        expect(res1.status).to.be(503);
        expect((res1.body as unknown as Error).message).to.eql(
          'The index ".kibana-observability-ai-assistant-kb" does not support semantic text and must be reindexed. This re-index operation has been scheduled and will be started automatically. Please try again later.'
        );

        // wait for reindex to have updated the index
        await retry.try(async () => {
          expect(await getKbIndexCreatedVersion()).to.be.greaterThan(8180000);
        });

        const res2 = await createKnowledgeBaseEntry();
        expect(res2.status).to.be(200);
      });
    });

    describe('after running migrations', () => {
      beforeEach(async () => {
        await deleteIndexAssets(es);
        await restoreKbSnapshot({
          log,
          es,
          snapshotRepoName: 'snapshot_kb_8.10',
          snapshotName: 'my_snapshot',
        });
        await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
        await runStartupMigrations(observabilityAIAssistantAPIClient);
      });

      it('has an index created version later than 8.18', async () => {
        await retry.try(async () => {
          const indexCreatedVersion = await getKbIndexCreatedVersion();
          expect(indexCreatedVersion).to.be.greaterThan(8180000);
        });
      });

      it('can add new entries', async () => {
        const { status } = await createKnowledgeBaseEntry();
        expect(status).to.be(200);
      });

      it('has default ELSER inference endpoint', async () => {
        await retry.try(async () => {
          const { body } = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/status',
          });

          expect(body.endpoint?.inference_id).to.eql(TINY_ELSER_INFERENCE_ID);
          expect(body.endpoint?.service_settings.model_id).to.eql(TINY_ELSER_MODEL_ID);
        });
      });

      it('have a deployed model', async () => {
        await retry.try(async () => {
          const { body } = await observabilityAIAssistantAPIClient.editor({
            endpoint: 'GET /internal/observability_ai_assistant/kb/status',
          });

          expect(body.kbState === KnowledgeBaseState.READY).to.be(true);
        });
      });
    });

    function createKnowledgeBaseEntry() {
      const knowledgeBaseEntry = {
        id: 'my-doc-id-1',
        title: 'My title',
        text: 'My content',
      };

      return observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
        params: { body: knowledgeBaseEntry },
      });
    }
  });

  async function getKbIndexCreatedVersion() {
    const indexSettings = await es.indices.getSettings({
      index: resourceNames.writeIndexAlias.kb,
    });

    const { settings } = Object.values(indexSettings)[0];
    return parseInt(settings?.index?.version?.created ?? '', 10);
  }
}
