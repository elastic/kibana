/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELSER_ON_ML_NODE_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/common/preconfigured_inference_ids';
import {
  clearKnowledgeBase,
  getKnowledgeBaseEntriesFromEs,
  setupKnowledgeBase,
  waitForKnowledgeBaseReady,
} from '../utils/knowledge_base';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('Knowledge base: Bulk import operation with real ELSER model', function () {
    // This test is intentionally skipped in both serverless and stateful
    // since it is not meant to be run on CI but only as a manual test
    before(async () => {
      await setupKnowledgeBase(getService, ELSER_ON_ML_NODE_INFERENCE_ID);
      await waitForKnowledgeBaseReady(getService);
    });

    after(async () => {
      await clearKnowledgeBase(es);
    });

    describe('when importing a large number of entries', () => {
      it('handles a large number of entries gracefully', async () => {
        const entries = Array.from({ length: 2000 }, (_, i) => ({
          id: `my_doc_${i}`,
          title: `My title ${i}`,
          text: `My content ${i}`,
        }));

        const { status } = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
          params: {
            body: {
              entries,
            },
          },
        });

        expect(status).to.be(200);

        const hits = await getKnowledgeBaseEntriesFromEs(es, 2000);
        expect(hits.length).to.be(2000);
      });
    });
  });
}
