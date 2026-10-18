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
  cleanupUserRiskScores,
  ensureLatestEntitiesIndex,
  getBriefFromSteps,
  getSubmitBriefRequests,
  mockBriefRound,
  seedBriefEntities,
  seedUserRiskScores,
  SEEDED_USER_START_SCORE,
  type ConverseResponseBody,
} from '../../fixtures/ai_brief_helpers';

const PRIORITY_LINE = `1. **${SEEDED_USER.name}**`;
const RISK_CHART_ID = 'security.riskscorehistory:user:';
const ENTITY_TABLE_ID = 'security.entity:list:';

apiTest.describe(
  'Entity Analytics AI brief - security.generate_entity_analytics_brief',
  { tag: [...tags.stateful.classic] },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;
    let createdLatestIndex = false;
    let createdRiskScoreIndex = false;
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
      createdRiskScoreIndex = await seedUserRiskScores(esClient);
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
      await cleanupUserRiskScores(esClient, createdRiskScoreIndex);
      if (createdLatestIndex) {
        await esClient.indices.delete({ index: LATEST_INDEX, ignore_unavailable: true });
      }
    });

    apiTest('writes a brief with one priority from the tile entities', async ({ apiClient }) => {
      mockBriefRound(llmProxy, buildDraft(SEEDED_USER.id));

      const brief = await askForBrief(
        apiClient,
        buildScope(
          {
            entitiesWithAlerts: {
              title: 'Entities with alerts',
              value: 14,
              delta: 3,
              entityIds: [SEEDED_USER.id],
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
              entityIds: [SEEDED_USER.id],
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
      expect(brief).toContain(`**Recommended next step**\nStart with **${SEEDED_USER.name}**.`);
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
      'states the risk change and charts it under the priority citing it',
      async ({ apiClient }) => {
        mockBriefRound(llmProxy, buildDraft(SEEDED_USER.id));

        const brief = await askForBrief(
          apiClient,
          buildScope(
            { riskMovers: { title: 'Risk movers', value: 1, entityIds: [SEEDED_USER.id] } },
            'riskMovers'
          )
        );

        const submitRequests = getSubmitBriefRequests(llmProxy);
        expect(submitRequests).toHaveLength(1);
        // The messages are JSON, so the entity's own JSON is escaped inside them.
        expect(submitRequests[0]).toContain(
          `\\"score\\":82,\\"atPeriodStart\\":${SEEDED_USER_START_SCORE},\\"change\\":44`
        );
        // The table comes before the list, and the chart directly under the priority citing the change.
        const lines = brief.split('\n');
        const priority = lines.findIndex((line) => line.startsWith(PRIORITY_LINE));
        expect(brief.indexOf(ENTITY_TABLE_ID)).toBeLessThan(brief.indexOf(PRIORITY_LINE));
        expect(lines[priority + 4]).toContain(RISK_CHART_ID);
      }
    );

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

    apiTest('drops a priority for an entity the view does not flag', async ({ apiClient }) => {
      mockBriefRound(llmProxy, buildDraft(SEEDED_USER.id));

      const brief = await askForBrief(
        apiClient,
        buildScope(
          {
            entitiesWithAlerts: {
              title: 'Entities with alerts',
              value: 1,
              delta: 1,
              entityIds: [SEEDED_HOST.id],
            },
          },
          'entitiesWithAlerts'
        )
      );

      expect(getSubmitBriefRequests(llmProxy)).toHaveLength(1);
      expect(brief).not.toContain(PRIORITY_LINE);
      expect(brief).toContain('No entity in this view has enough evidence to prioritize');
    });
  }
);
