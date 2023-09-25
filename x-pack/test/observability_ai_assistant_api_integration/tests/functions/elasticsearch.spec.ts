/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('Functions: elasticsearch', () => {
    it('executes a search request', async () => {
      const response = await observabilityAIAssistantAPIClient
        .readUser({
          endpoint: 'POST /internal/observability_ai_assistant/functions/elasticsearch',
          params: {
            body: {
              method: 'GET',
              path: '_all/_search',
              body: {
                query: {
                  bool: {
                    filter: [
                      {
                        term: {
                          matches_no_docs: 'true',
                        },
                      },
                    ],
                  },
                },
                track_total_hits: false,
              },
            },
          },
        })
        .expect(200);

      expect((response.body as any).hits.hits).to.eql([]);
      expect((response.body as any).hits.total).to.eql(undefined);
    });
  });
}
