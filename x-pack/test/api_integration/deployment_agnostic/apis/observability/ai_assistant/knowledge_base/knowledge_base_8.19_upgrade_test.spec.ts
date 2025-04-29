/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  LEGACY_INFERENCE_ID,
  createTinyElserInferenceEndpoint,
  deleteInferenceEndpoint,
  deleteTinyElserModel,
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

  // In 8.19 / 9.1 the custom inference endpoint ("obs_ai_assistant_kb_inference") is replaced with the preconfigured endpoint ".elser-2-elasticsearch"
  // We need to make sure that the custom inference endpoint continues to work after the migration

  describe('when upgrading from 8.18 to 8.19', function () {
    this.tags(['skipServerless']);

    before(async () => {
      await importTinyElserModel(ml);
      await createTinyElserInferenceEndpoint({ es, log, inferenceId: LEGACY_INFERENCE_ID });

      await deleteIndexAssets(es);
      await restoreKbSnapshot({
        log,
        es,
        snapshotRepoName: 'snapshot_kb_8.18',
        snapshotName: 'kb_snapshot_8.18',
      });

      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await runStartupMigrations(observabilityAIAssistantAPIClient);
    });

    after(async () => {
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      await deleteTinyElserModel(getService);
      await deleteInferenceEndpoint({ es, log, inferenceId: LEGACY_INFERENCE_ID });
    });

    it('has an index created in 8.18', async () => {
      await retry.try(async () => {
        const indexVersion = await getKbIndexCreatedVersion(es);
        expect(indexVersion).to.be('8.18.0');
      });
    });

    it('can retrieve entries', async () => {
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
      expect(res.body.entries).to.have.length(1);
      expect(res.body.entries[0].text).to.be(
        'The user has a 10 meter tall pet dinosaur. It loves carrots.'
      );
    });

    it('can add new entries to KB', async () => {
      const res = await createKnowledgeBaseEntry();
      expect(res.status).to.be(200);
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
