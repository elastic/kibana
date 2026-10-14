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
import { cleanupEntity } from '../../fixtures/lead_generation_entity_helpers';
import {
  cleanupLeadGenerationConnector,
  createLeadGenerationConnector,
} from '../../fixtures/lead_generation_llm_helpers';
import {
  SEEDED_HOST,
  SEEDED_USER,
  buildBriefConverseBody,
  buildDraft,
  buildScope,
  ensureLatestEntitiesIndex,
  getBriefFromSteps,
  getSubmitBriefRequests,
  mockBriefRound,
  seedBriefEntities,
  type ConverseResponseBody,
} from '../../fixtures/ai_brief_helpers';

const PRIORITY_LINE = `1. **${SEEDED_USER.name}**`;

apiTest.describe(
  'Entity Analytics AI brief - security.generate_entity_analytics_brief',
  { tag: [...tags.stateful.classic] },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;
    let createdLatestIndex = false;
    const conversationIds: string[] = [];

    /** Asks the default agent for the brief of `scope` and returns the tool's markdown. */
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
      await seedBriefEntities(esClient);
    });

    apiTest.beforeEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiClient, apiServices, esClient }) => {
      for (const conversationId of conversationIds) {
        await apiClient.delete(`api/agent_builder/conversations/${conversationId}`, { headers });
      }
      await cleanupLeadGenerationConnector({ apiServices, connectorId, llmProxy });
      await cleanupEntity(esClient, SEEDED_USER.id);
      await cleanupEntity(esClient, SEEDED_HOST.id);
      if (createdLatestIndex) {
        await esClient.indices.delete({ index: LATEST_INDEX, ignore_unavailable: true });
      }
    });

    apiTest('writes a brief with one priority from the tile entities', async ({ apiClient }) => {
      // Fact 1 is the user's membership of the selected tile.
      mockBriefRound(llmProxy, buildDraft(SEEDED_USER.id, [1]));

      const brief = await askForBrief(
        apiClient,
        buildScope(
          {
            entitiesWithAlerts: { value: 14, delta: 3, entityIds: [SEEDED_USER.id] },
            entitiesWithAnomalies: { value: 0, unavailable: true, entityIds: [] },
            riskMovers: { value: 0, entityIds: [] },
            newlyHighCritical: { value: 1, entityIds: [SEEDED_USER.id] },
          },
          'entitiesWithAlerts'
        )
      );

      expect(brief).toContain(PRIORITY_LINE);
      expect(brief).toContain('| Entities with alerts | 14 | +3 vs previous 7 days |');
      expect(brief).toContain('no comparison');
      expect(brief).toContain('Unavailable tiles: Entities with anomalies');
      expect(brief).not.toContain('| Entities with anomalies | 0 |');
      expect(brief).toContain('<render_attachment');

      const submitRequests = getSubmitBriefRequests(llmProxy);
      expect(submitRequests).toHaveLength(1);
      expect(submitRequests[0]).toContain(SEEDED_USER.id);
      expect(submitRequests[0]).toContain(
        'Entities with alerts (selected): 14 (+3 vs previous 7 days)'
      );
      expect(submitRequests[0]).not.toContain(SEEDED_HOST.id);
    });

    apiTest(
      'writes the quiet brief without a model call when no tile is flagged',
      async ({ apiClient }) => {
        mockBriefRound(llmProxy);

        const brief = await askForBrief(
          apiClient,
          buildScope({
            entitiesWithAlerts: { value: 0, delta: 0, entityIds: [] },
            riskMovers: { value: 0, entityIds: [] },
            newlyHighCritical: { value: 0, entityIds: [] },
          })
        );

        expect(getSubmitBriefRequests(llmProxy)).toHaveLength(0);
        expect(brief).toContain('Nothing in this view is flagged');
      }
    );

    apiTest('drops a priority that cites another entity’s fact', async ({ apiClient }) => {
      // The host is the only entity in the selected tile, so it is the first candidate and owns fact 1.
      mockBriefRound(llmProxy, buildDraft(SEEDED_USER.id, [1]));

      const brief = await askForBrief(
        apiClient,
        buildScope(
          {
            entitiesWithAlerts: { value: 1, delta: 1, entityIds: [SEEDED_HOST.id] },
            newlyHighCritical: { value: 1, entityIds: [SEEDED_USER.id] },
          },
          'entitiesWithAlerts'
        )
      );

      expect(getSubmitBriefRequests(llmProxy)).toHaveLength(1);
      expect(brief).not.toContain(PRIORITY_LINE);
      expect(brief).toContain('No entity in this view has enough evidence to prioritise');
    });
  }
);
