/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ApiClientFixture } from '@kbn/scout-security';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EntityAnalyticsScope } from '../../../../../../common/entity_analytics/ai_brief/scope';
import { LATEST_INDEX, PUBLIC_HEADERS } from '../../fixtures/maintainers/constants';
import { cleanupEntity, seedRiskyUserEntity } from '../../fixtures/lead_generation_entity_helpers';
import {
  cleanupLeadGenerationConnector,
  createLeadGenerationConnector,
} from '../../fixtures/lead_generation_llm_helpers';
import {
  SEEDED_USER_ID,
  buildBriefConverseBody,
  buildDraft,
  buildScope,
  ensureLatestEntitiesIndex,
  getBriefFromSteps,
  getSubmitBriefRequests,
  mockBriefRound,
  type ConverseResponseBody,
} from '../../fixtures/ai_brief_helpers';

const PRIORITY_LINE = `1. **${SEEDED_USER_ID}**`;

apiTest.describe(
  'Entity Analytics AI brief - security.generate_entity_analytics_brief',
  { tag: [...tags.stateful.classic] },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;
    let createdLatestIndex = false;
    const conversationIds: string[] = [];

    const askForBrief = async (
      apiClient: ApiClientFixture,
      scope: EntityAnalyticsScope
    ): Promise<string> => {
      const response = await apiClient.post<ConverseResponseBody>('api/agent_builder/converse', {
        headers,
        responseType: 'json',
        body: buildBriefConverseBody(connectorId, scope),
      });
      expect(response).toHaveStatusCode(200);
      conversationIds.push(response.body.conversation_id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      return getBriefFromSteps(response.body);
    };

    apiTest.beforeAll(async ({ apiServices, esClient, requestAuth, log }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      headers = { ...PUBLIC_HEADERS, ...apiKeyHeader };
      ({ connectorId, llmProxy } = await createLeadGenerationConnector({ apiServices, log }));
      createdLatestIndex = await ensureLatestEntitiesIndex(esClient);
      await seedRiskyUserEntity(esClient, { euid: SEEDED_USER_ID, riskScoreNorm: 82 });
    });

    apiTest.beforeEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiClient, apiServices, esClient }) => {
      for (const conversationId of conversationIds) {
        await apiClient.delete(`api/agent_builder/conversations/${conversationId}`, { headers });
      }
      await cleanupLeadGenerationConnector({ apiServices, connectorId, llmProxy });
      await cleanupEntity(esClient, SEEDED_USER_ID);
      if (createdLatestIndex) {
        await esClient.indices.delete({ index: LATEST_INDEX, ignore_unavailable: true });
      }
    });

    apiTest('writes a brief with one priority from the tile entities', async ({ apiClient }) => {
      mockBriefRound(llmProxy, buildDraft(SEEDED_USER_ID));

      const brief = await askForBrief(
        apiClient,
        buildScope(
          {
            entitiesWithAlerts: {
              title: 'Entities with alerts',
              value: 14,
              delta: 3,
              entityIds: [SEEDED_USER_ID],
            },
            entitiesWithAnomalies: {
              title: 'Entities with anomalies',
              value: 0,
              unavailable: true,
              entityIds: [],
            },
            riskMovers: { title: 'Risk movers', value: 0, entityIds: [] },
            newlyHighCritical: {
              title: 'Newly high/critical',
              value: 1,
              entityIds: [SEEDED_USER_ID],
            },
          },
          'entitiesWithAlerts'
        )
      );

      expect(brief).toContain(PRIORITY_LINE);
      expect(brief).toContain('| Entities with alerts | 14 | +3 |');
      expect(brief).toContain('| Newly high/critical | 1 | not enough history |');
      // An unavailable count has nothing to say, so it gets no row.
      expect(brief).not.toContain('| Entities with anomalies |');
      expect(brief).toContain(
        "Not checked, because the data couldn't be read: Entities with anomalies"
      );
      expect(brief).toContain(`**Recommended next step**\nStart with **${SEEDED_USER_ID}**.`);
      expect(brief).toContain('<render_attachment');

      const submitRequests = getSubmitBriefRequests(llmProxy);
      expect(submitRequests).toHaveLength(1);
      expect(submitRequests[0]).toContain(SEEDED_USER_ID);
      expect(submitRequests[0]).toContain(
        'Entities with alerts (selected): 14 (+3 vs previous 7 days)'
      );
    });

    apiTest(
      'writes the quiet brief without a model call when no tile is flagged',
      async ({ apiClient }) => {
        mockBriefRound(llmProxy);

        const brief = await askForBrief(
          apiClient,
          buildScope({
            entitiesWithAlerts: {
              title: 'Entities with alerts',
              value: 0,
              delta: 0,
              entityIds: [],
            },
            riskMovers: { title: 'Risk movers', value: 0, entityIds: [] },
            newlyHighCritical: { title: 'Newly high/critical', value: 0, entityIds: [] },
          })
        );

        expect(getSubmitBriefRequests(llmProxy)).toHaveLength(0);
        expect(brief).toContain('Nothing in this view is flagged');
      }
    );
  }
);
