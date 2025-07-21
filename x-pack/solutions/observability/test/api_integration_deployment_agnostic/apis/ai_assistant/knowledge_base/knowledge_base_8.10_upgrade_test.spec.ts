/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import * as semver from 'semver';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getKbIndexCreatedVersion } from '../utils/knowledge_base';
import {
  TINY_ELSER_INFERENCE_ID,
  TINY_ELSER_MODEL_ID,
  setupTinyElserModelAndInferenceEndpoint,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';
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

  // Sparse vector field was introduced in Elasticsearch 8.11
  // The semantic text field was added to the knowledge base index in 8.17
  // Indices created in 8.10 do not support semantic text field and need to be reindexed
  describe('Knowledge base: when upgrading from 8.10 to 8.18', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless', 'skipCloud']);

    before(async () => {
      // in a real environment we will use the ELSER inference endpoint (`.elser-2-elasticsearch`) which is pre-installed
      // For testing purposes we will use the tiny ELSER model

      log.info('Setting up tiny ELSER model and inference endpoint');
      await setupTinyElserModelAndInferenceEndpoint(getService);
    });

    after(async () => {
      log.info('Restoring index assets');
      await restoreIndexAssets(getService);

      log.info('Tearing down tiny ELSER model and inference endpoint');
      await teardownTinyElserModelAndInferenceEndpoint(getService);
    });

    describe('before running migrations', () => {
      before(async () => {
        log.info('Delete index assets');
        await deleteIndexAssets(getService);

        log.info('Restoring snapshot');
        await restoreKbSnapshot({
          log,
          es,
          snapshotFolderName: 'snapshot_kb_8.10',
          snapshotName: 'my_snapshot',
        });

        log.info('Creating index assets');
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
        await deleteIndexAssets(getService);
        await restoreKbSnapshot({
          log,
          es,
          snapshotFolderName: 'snapshot_kb_8.10',
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
