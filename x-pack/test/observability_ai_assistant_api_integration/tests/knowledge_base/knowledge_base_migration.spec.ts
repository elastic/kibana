/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const esArchiver = getService('esArchiver');

  const archive =
    'x-pack/test/functional/es_archives/observability/ai_assistant/knowledge_base_8_15';

  describe('When there are knowledge base entries from 8.15 or earlier', () => {
    before(async () => {
      await esArchiver.load(archive);
    });

    after(async () => {
      await esArchiver.unload(archive);
    });

    it('adds semantic_text embeddings to migrated docs', async () => {
      const res = await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/semantic_text_migration',
        })
        .expect(200);
      expect(res.body).to.eql({});
    });
  });
}
