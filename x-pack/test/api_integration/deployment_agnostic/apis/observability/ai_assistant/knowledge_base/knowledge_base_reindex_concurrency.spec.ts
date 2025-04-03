/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import AdmZip from 'adm-zip';
import path from 'path';
import { times } from 'lodash';
import { AI_ASSISTANT_SNAPSHOT_REPO_PATH } from '../../../../default_configs/stateful.config.base';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  setupKnowledgeBase,
  deleteKbIndices,
} from '../utils/knowledge_base';
import { createOrUpdateIndexAssets } from '../utils/index_assets';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const ml = getService('ml');
  const retry = getService('retry');
  const log = getService('log');

  describe('POST /internal/observability_ai_assistant/kb/reindex', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      const zipFilePath = `${AI_ASSISTANT_SNAPSHOT_REPO_PATH}.zip`;
      log.debug(`Unzipping ${zipFilePath} to ${AI_ASSISTANT_SNAPSHOT_REPO_PATH}`);
      new AdmZip(zipFilePath).extractAllTo(path.dirname(AI_ASSISTANT_SNAPSHOT_REPO_PATH), true);

      await setupKnowledgeBase(getService);
    });

    beforeEach(async () => {
      await deleteKbIndices(es);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
    });

    after(async () => {
      await deleteKbIndices(es);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await deleteKnowledgeBaseModel(getService);
    });

    it('will only perform a single reindex at a time', async () => {
      const results = await Promise.all(times(20).map(() => reIndexKnowledgeBase()));
      expect(results).to.eql();
    });
  });

  async function reIndexKnowledgeBase() {
    const { status } = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/kb/reindex',
    });
    expect(status).to.be(200);
  }
}
