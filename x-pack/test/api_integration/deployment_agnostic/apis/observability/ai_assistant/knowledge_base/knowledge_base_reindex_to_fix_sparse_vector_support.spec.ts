/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import AdmZip from 'adm-zip';
import path from 'path';
import { AI_ASSISTANT_SNAPSHOT_REPO_PATH } from '../../../../default_configs/stateful.config.base';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteKbIndices,
  deleteKnowledgeBaseModel,
  setupKnowledgeBase,
} from '../utils/knowledge_base';
import { createOrUpdateIndexAssets, restoreIndexAssets } from '../utils/index_assets';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');

  describe('when the knowledge base index was created before 8.11', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await unZipKbSnapshot();
      await setupKnowledgeBase(getService);
    });

    beforeEach(async () => {
      await restoreKbSnapshot();
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
    });

    after(async () => {
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      await deleteKnowledgeBaseModel(getService);
    });

    it('has an index created version earlier than 8.11', async () => {
      await retry.try(async () => {
        expect(await getKbIndexCreatedVersion()).to.be.lessThan(8110000);
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

    it('cannot add new entries to KB', async () => {
      const { status, body } = await createKnowledgeBaseEntry();

      // @ts-expect-error
      expect(body.message).to.eql(
        'The index ".kibana-observability-ai-assistant-kb" does not support semantic text and must be reindexed. This re-index operation has been scheduled and will be started automatically. Please try again later.'
      );

      expect(status).to.be(503);
    });

    it('can add new entries after re-indexing', async () => {
      await reIndexKnowledgeBase();

      await retry.try(async () => {
        const { status } = await createKnowledgeBaseEntry();
        expect(status).to.be(200);
      });
    });
  });

  async function getKbIndexCreatedVersion() {
    const indexSettings = await es.indices.getSettings({
      index: resourceNames.concreteIndexName.kb,
    });

    const { settings } = Object.values(indexSettings)[0];
    return parseInt(settings?.index?.version?.created ?? '', 10);
  }

  async function unZipKbSnapshot() {
    const zipFilePath = `${AI_ASSISTANT_SNAPSHOT_REPO_PATH}.zip`;
    log.debug(`Unzipping ${zipFilePath} to ${AI_ASSISTANT_SNAPSHOT_REPO_PATH}`);
    new AdmZip(zipFilePath).extractAllTo(path.dirname(AI_ASSISTANT_SNAPSHOT_REPO_PATH), true);
  }

  async function restoreKbSnapshot() {
    await deleteKbIndices(es);

    log.debug(
      `Restoring snapshot of ${resourceNames.concreteIndexName.kb} from ${AI_ASSISTANT_SNAPSHOT_REPO_PATH}`
    );
    const snapshotRepoName = 'snapshot-repo-8-10';
    const snapshotName = 'my_snapshot';
    await es.snapshot.createRepository({
      name: snapshotRepoName,
      repository: {
        type: 'fs',
        settings: { location: AI_ASSISTANT_SNAPSHOT_REPO_PATH },
      },
    });

    await es.snapshot.restore({
      repository: snapshotRepoName,
      snapshot: snapshotName,
      wait_for_completion: true,
      indices: resourceNames.concreteIndexName.kb,
    });

    await es.snapshot.deleteRepository({ name: snapshotRepoName });
  }

  async function reIndexKnowledgeBase() {
    const { status } = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/kb/reindex',
    });
    expect(status).to.be(200);
  }
}
