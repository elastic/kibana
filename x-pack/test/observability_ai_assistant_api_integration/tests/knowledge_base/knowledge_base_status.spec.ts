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

  describe('/internal/observability_ai_assistant/kb/status', () => {
    it('returns correct status after knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .editor({ endpoint: 'GET /internal/observability_ai_assistant/kb/status' })
        .expect(200);

      expect(res.body.enabled).to.be(true);
    });
  });
}
