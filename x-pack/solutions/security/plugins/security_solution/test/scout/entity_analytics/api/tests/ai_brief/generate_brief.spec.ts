/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ApiClientFixture } from '@kbn/scout-security';
import { apiTest, getPlaywrightTagsFor } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  ENTITY_LATEST,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
} from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../../common/entity_analytics/ai_brief/scope';
import { PUBLIC_HEADERS } from '../../fixtures/maintainers/constants';
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
  getBriefResult,
  getBriefTemplate,
  getSubmitBriefRequests,
  mockBriefRound,
  type BriefToolResult,
  type ConverseResponseBody,
} from '../../fixtures/ai_brief_helpers';

const SPACE_ID = 'brief-scout-space';
const SPACE_USER_ID = 'user:brief-scout-space-user';

apiTest.describe(
  'Entity Analytics AI brief - the brief tool bound to a captured view',
  // Local-only: the LLM proxy binds to the runner's loopback, unreachable from a Cloud Kibana.
  { tag: getPlaywrightTagsFor('stateful', 'classic', 'local') },
  () => {
    let headers: Record<string, string>;
    let connectorId: string;
    let llmProxy: LlmProxy;
    const createdIndexSpaces: string[] = [];
    const conversationIds: string[] = [];
    const spaceConversationIds: string[] = [];
    // A user who can read only the other space's entities, in that space only.
    let spaceUserHeaders: Record<string, string>;
    let spaceConnectorId: string;
    let spaceLlmProxy: LlmProxy;

    /** The brief tool's result, the HTML it posted to the conversation, and the agent's reply. */
    const askForBrief = async (
      apiClient: ApiClientFixture,
      scope: EntityAnalyticsScope
    ): Promise<{ result: BriefToolResult; template: string; reply: string }> => {
      const response = await apiClient.post<ConverseResponseBody>('api/agent_builder/converse', {
        headers,
        responseType: 'json',
        body: buildBriefConverseBody(connectorId, scope),
      });
      expect(response).toHaveStatusCode(200);
      const { conversation_id: conversationId } = response.body;
      conversationIds.push(conversationId);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      const conversation = await apiClient.get<Conversation>(
        `api/agent_builder/conversations/${conversationId}`,
        { headers, responseType: 'json' }
      );
      return {
        result: getBriefResult(response.body),
        template: getBriefTemplate(conversation.body),
        reply: response.body.response.message,
      };
    };

    apiTest.beforeAll(async ({ apiServices, esClient, requestAuth, log }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      headers = { ...PUBLIC_HEADERS, ...apiKeyHeader };
      ({ connectorId, llmProxy } = await createLeadGenerationConnector({ apiServices, log }));
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      ({ connectorId: spaceConnectorId, llmProxy: spaceLlmProxy } =
        await createLeadGenerationConnector({ apiServices, log, spaceId: SPACE_ID }));
      for (const spaceId of ['default', SPACE_ID]) {
        if (await ensureLatestEntitiesIndex(esClient, spaceId)) {
          createdIndexSpaces.push(spaceId);
        }
      }
      await seedRiskyUserEntity(esClient, { euid: SEEDED_USER_ID, riskScoreNorm: 82 });
      await seedRiskyUserEntity(esClient, { euid: SPACE_USER_ID, spaceId: SPACE_ID });
      const spaceUser = await requestAuth.getApiKeyForCustomRole({
        elasticsearch: {
          cluster: [],
          indices: [{ names: [getEntitiesAlias(ENTITY_LATEST, SPACE_ID)], privileges: ['read'] }],
        },
        kibana: [
          {
            base: [],
            feature: { siemV5: ['all'], agentBuilder: ['all'], actions: ['read'] },
            spaces: [SPACE_ID],
          },
        ],
      });
      spaceUserHeaders = { ...PUBLIC_HEADERS, ...spaceUser.apiKeyHeader };
    });

    apiTest.beforeEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiClient, apiServices, esClient }) => {
      for (const conversationId of conversationIds) {
        await apiClient.delete(`api/agent_builder/conversations/${conversationId}`, { headers });
      }
      for (const conversationId of spaceConversationIds) {
        await apiClient.delete(`s/${SPACE_ID}/api/agent_builder/conversations/${conversationId}`, {
          headers: spaceUserHeaders,
        });
      }
      await cleanupLeadGenerationConnector({ apiServices, connectorId, llmProxy });
      await cleanupLeadGenerationConnector({
        apiServices,
        connectorId: spaceConnectorId,
        llmProxy: spaceLlmProxy,
        spaceId: SPACE_ID,
      });
      await cleanupEntity(esClient, SEEDED_USER_ID);
      await cleanupEntity(esClient, SPACE_USER_ID, SPACE_ID);
      for (const spaceId of createdIndexSpaces) {
        await esClient.indices.delete({
          index: getLatestEntitiesIndexName(spaceId),
          ignore_unavailable: true,
        });
      }
      await apiServices.spaces.delete(SPACE_ID);
    });

    apiTest('posts a brief with one priority from the tile entities', async ({ apiClient }) => {
      mockBriefRound(llmProxy, buildDraft(SEEDED_USER_ID));

      const { result, template, reply } = await askForBrief(
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

      // The tool returns the render tags, and the agent pastes them unchanged.
      expect(typeof result.attachment_id).toBe('string');
      expect(result.brief_tag).toContain(`id="${result.attachment_id}"`);
      expect(result.entity_table_tag).toContain('<render_attachment');
      expect(reply).toContain(result.brief_tag);
      expect(reply).toContain(result.entity_table_tag);

      // The conversation holds the brief as an inline visualization.
      expect(template).toContain(SEEDED_USER_ID);
      expect(template).toContain('+3');
      expect(template).toContain('No comparison');
      // An unavailable count has nothing to say, so it gets no tile.
      expect(template).not.toContain('<div class="count-label">Entities with anomalies');
      expect(template).toContain('Not checked, because the data couldn&#39;t be read');
      expect(template).toContain(`Start with ${SEEDED_USER_ID}.`);

      const submitRequests = getSubmitBriefRequests(llmProxy);
      expect(submitRequests).toHaveLength(1);
      expect(submitRequests[0]).toContain(SEEDED_USER_ID);
      expect(submitRequests[0]).toContain(
        'Entities with alerts (selected): 14 (+3 vs previous 7 days)'
      );
    });

    apiTest(
      'posts the quiet brief without a model call when no tile is flagged',
      async ({ apiClient }) => {
        mockBriefRound(llmProxy);

        const { result, template } = await askForBrief(
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
        expect(result.entity_table_tag).toBeUndefined();
        expect(template).toContain('Nothing in this view is flagged');
        // The summary states it, so the brief has no Priorities section repeating it.
        expect(template).not.toContain('No entity in this view has enough evidence to prioritize');
        expect(template).not.toContain('<h2>Priorities</h2>');
      }
    );

    apiTest("sends the model only the entities of the request's space", async ({ apiClient }) => {
      mockBriefRound(spaceLlmProxy, buildDraft(SPACE_USER_ID));

      const response = await apiClient.post<ConverseResponseBody>(
        `s/${SPACE_ID}/api/agent_builder/converse`,
        {
          headers: spaceUserHeaders,
          responseType: 'json',
          body: buildBriefConverseBody(
            spaceConnectorId,
            buildScope({
              entitiesWithAlerts: {
                title: 'Entities with alerts',
                value: 2,
                entityIds: [SPACE_USER_ID, SEEDED_USER_ID],
              },
            })
          ),
        }
      );
      expect(response).toHaveStatusCode(200);
      spaceConversationIds.push(response.body.conversation_id);
      await spaceLlmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const [submitRequest] = getSubmitBriefRequests(spaceLlmProxy);
      expect(submitRequest).toContain(SPACE_USER_ID);
      expect(submitRequest).not.toContain(SEEDED_USER_ID);
      const template = getBriefTemplate(
        (
          await apiClient.get<Conversation>(
            `s/${SPACE_ID}/api/agent_builder/conversations/${response.body.conversation_id}`,
            { headers: spaceUserHeaders, responseType: 'json' }
          )
        ).body
      );
      expect(template).toContain(SPACE_USER_ID);
      expect(template).not.toContain(SEEDED_USER_ID);
    });
  }
);
