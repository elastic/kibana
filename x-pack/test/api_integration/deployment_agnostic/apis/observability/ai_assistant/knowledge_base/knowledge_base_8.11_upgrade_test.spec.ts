/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import * as semver from 'semver';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  TINY_ELSER_INFERENCE_ID,
  TINY_ELSER_MODEL_ID,
  createTinyElserInferenceEndpoint,
  deleteTinyElserModelAndInferenceEndpoint,
  getKbIndexCreatedVersion,
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
  // The semantic text field was added to the knowledge base index in 8.17
  // Indices created prior 8.11 does not support semantic text field and need to be reindexed
  describe('when upgrading to 8.18, and the knowledge base index was created prior to 8.11', function () {
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
          const indexCreatedVersion = await getKbIndexCreatedVersion(es);
          expect(semver.lt(indexCreatedVersion, '8.11.0')).to.be(true);
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
          const indexCreatedVersion = await getKbIndexCreatedVersion(es);
          expect(semver.gte(indexCreatedVersion, '8.18.0')).to.be(true);
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
          const indexCreatedVersion = await getKbIndexCreatedVersion(es);
          expect(semver.gt(indexCreatedVersion, '8.18.0')).to.be(true);
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
}
