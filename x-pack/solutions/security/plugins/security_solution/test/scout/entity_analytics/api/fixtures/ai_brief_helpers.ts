/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import { createToolCallMessage, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { EsClient } from '@kbn/scout-security';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getRiskScoreTimeSeriesIndex } from '../../../../../common/entity_analytics/risk_engine/indices';
import { getPrivilegedUserWatchlistSavedObjectId } from '../../../../../common/entity_analytics/watchlists/constants';
import type { BriefDraft } from '../../../../../server/agent_builder/tools/entity_analytics/brief/brief_types';
import { LATEST_ALIAS, LATEST_INDEX } from './maintainers/constants';

const BRIEF_TOOL_ID = 'security.generate_entity_analytics_brief';
/** The brief tool's name on the wire: Agent Builder replaces dots with underscores. */
const BRIEF_TOOL_LLM_NAME = 'security_generate_entity_analytics_brief';
const SUBMIT_BRIEF_TOOL_NAME = 'submit_entity_analytics_brief';
const SCOPE_ATTACHMENT_ID = 'brief-scope';

export const SEEDED_USER = { id: 'user:brief-scout-user', name: 'brief-scout-user' } as const;
export const SEEDED_HOST = { id: 'host:brief-scout-host', name: 'brief-scout-host' } as const;

const TITLE_SYSTEM_PROMPT = 'You are a title-generation utility';

export interface ConverseResponseBody {
  conversation_id: string;
  steps: ConversationRoundStep[];
}

const getToolChoiceName = (toolChoice: unknown): string | undefined => {
  if (typeof toolChoice !== 'object' || toolChoice === null || !('function' in toolChoice)) {
    return undefined;
  }
  const { function: fn } = toolChoice;
  return typeof fn === 'object' && fn !== null && 'name' in fn && typeof fn.name === 'string'
    ? fn.name
    : undefined;
};

/** Creates the latest entities index when no Entity Store is installed. Returns whether it did. */
export const ensureLatestEntitiesIndex = async (esClient: EsClient): Promise<boolean> => {
  if (await esClient.indices.exists({ index: LATEST_ALIAS })) {
    return false;
  }
  await esClient.indices.create({
    index: LATEST_INDEX,
    aliases: { [LATEST_ALIAS]: {} },
    mappings: {
      dynamic_templates: [
        { strings_as_keyword: { match_mapping_type: 'string', mapping: { type: 'keyword' } } },
      ],
      properties: { '@timestamp': { type: 'date' } },
    },
  });
  return true;
};

/** Seeds a High-risk, high-impact privileged user and a plain host in the default space. */
export const seedBriefEntities = async (esClient: EsClient): Promise<void> => {
  const now = new Date().toISOString();
  const lifecycle = { first_seen: now, last_seen: now };
  await esClient.bulk({
    refresh: 'wait_for',
    operations: [
      { index: { _index: LATEST_ALIAS, _id: hashEuid(SEEDED_USER.id) } },
      {
        '@timestamp': now,
        entity: {
          id: SEEDED_USER.id,
          name: SEEDED_USER.name,
          EngineMetadata: { Type: 'user' },
          lifecycle,
          risk: { calculated_level: 'High', calculated_score_norm: 82 },
          attributes: { watchlists: [getPrivilegedUserWatchlistSavedObjectId('default')] },
        },
        user: { name: SEEDED_USER.name },
        asset: { criticality: 'high_impact' },
      },
      { index: { _index: LATEST_ALIAS, _id: hashEuid(SEEDED_HOST.id) } },
      {
        '@timestamp': now,
        entity: {
          id: SEEDED_HOST.id,
          name: SEEDED_HOST.name,
          EngineMetadata: { Type: 'host' },
          lifecycle,
        },
        host: { name: SEEDED_HOST.name },
      },
    ],
  });
};

const RISK_SCORE_INDEX = getRiskScoreTimeSeriesIndex('default');
/** The seeded user's base risk score at the start of a 7-day view; it is 82 now. */
export const SEEDED_USER_START_SCORE = 38;

/**
 * Seeds the user's base risk score at the start of a 7-day view and now. Creates the risk score index
 * when the risk engine is not installed, and returns whether it did.
 */
export const seedUserRiskScores = async (esClient: EsClient): Promise<boolean> => {
  const created = !(await esClient.indices.exists({ index: RISK_SCORE_INDEX }));
  if (created) {
    await esClient.indices.create({
      index: RISK_SCORE_INDEX,
      mappings: {
        dynamic_templates: [
          { strings_as_keyword: { match_mapping_type: 'string', mapping: { type: 'keyword' } } },
        ],
        properties: { '@timestamp': { type: 'date' } },
      },
    });
  }
  const now = Date.now();
  const startScoreTime = now - 7 * 24 * 3_600_000 - 30 * 60_000;
  const scores: Array<[number, number]> = [
    [startScoreTime, SEEDED_USER_START_SCORE],
    [now, 82],
  ];
  await esClient.bulk({
    refresh: 'wait_for',
    operations: scores.flatMap(([time, score]) => [
      { create: { _index: RISK_SCORE_INDEX } },
      {
        '@timestamp': new Date(time).toISOString(),
        user: {
          name: SEEDED_USER.name,
          risk: {
            id_field: 'entity.id',
            id_value: SEEDED_USER.id,
            score_type: 'base',
            calculated_score_norm: score,
            calculated_level: score >= 70 ? 'High' : 'Moderate',
          },
        },
      },
    ]),
  });
  return created;
};

/** Removes the seeded risk scores, or the risk score index when the test created it. */
export const cleanupUserRiskScores = async (esClient: EsClient, createdIndex: boolean) => {
  if (createdIndex) {
    await esClient.indices.delete({ index: RISK_SCORE_INDEX, ignore_unavailable: true });
    return;
  }
  await esClient.deleteByQuery({
    index: RISK_SCORE_INDEX,
    refresh: true,
    query: { term: { 'user.risk.id_value': SEEDED_USER.id } },
  });
};

/** A 7-day view captured now, with only the given tiles. */
export const buildScope = (
  tiles: EntityAnalyticsScope['tiles'],
  focusTileId?: EntityAnalyticsScope['focusTileId']
): EntityAnalyticsScope => ({
  period: '7d',
  capturedAt: new Date().toISOString(),
  focusTileId,
  tiles,
});

/** A model answer with one priority for `entityId`, citing `factIds`. */
export const buildDraft = (entityId: string, factIds: number[]): BriefDraft => ({
  attention: 'Flagged entities in this view have alerts or newly reached High risk.',
  priorities: [
    {
      entityId,
      observed: 'Has High or Critical alerts and newly reached High risk.',
      whyItMatters: 'A privileged user on a high-impact asset.',
      nextStep: 'Review the alerts for this entity in the last 7 days.',
      factIds,
    },
  ],
  recommendation: `Start with {{ entity.id ${entityId} }}.`,
});

/**
 * Mocks one brief round: title, the agent calling the brief tool, the forced composition call
 * when `draft` is given, and the final answer. The proxy answers with the first match.
 */
export const mockBriefRound = (llmProxy: LlmProxy, draft?: BriefDraft): void => {
  void llmProxy
    .intercept({
      name: 'set_title',
      when: ({ tool_choice: toolChoice, messages }) =>
        getToolChoiceName(toolChoice) === 'set_title' ||
        String(messages.find(({ role }) => role === 'system')?.content).includes(
          TITLE_SYSTEM_PROMPT
        ),
      responseMock: createToolCallMessage('set_title', { title: 'Entity Analytics brief' }),
    })
    .completeAfterIntercept();
  if (draft) {
    void llmProxy.interceptors.toolChoice({
      name: SUBMIT_BRIEF_TOOL_NAME,
      response: createToolCallMessage(SUBMIT_BRIEF_TOOL_NAME, draft),
    });
  }
  void llmProxy
    .intercept({
      name: 'agent: call the brief tool',
      when: ({ tools }) =>
        Boolean(tools?.some(({ function: fn }) => fn.name === BRIEF_TOOL_LLM_NAME)),
      responseMock: createToolCallMessage(BRIEF_TOOL_LLM_NAME, {
        scopeAttachmentId: SCOPE_ATTACHMENT_ID,
      }),
    })
    .completeAfterIntercept();
  void llmProxy
    .intercept({
      name: 'agent: final answer',
      when: () => true,
      responseMock: 'Here is the brief.',
    })
    .completeAfterIntercept();
};

/** The forced composition requests the proxy received, as JSON strings of their messages. */
export const getSubmitBriefRequests = (llmProxy: LlmProxy): string[] =>
  llmProxy.interceptedRequests
    .filter(
      ({ requestBody }) => getToolChoiceName(requestBody.tool_choice) === SUBMIT_BRIEF_TOOL_NAME
    )
    .map(({ requestBody }) => JSON.stringify(requestBody.messages));

/** The converse body asking the default agent for the brief of `scope`, attached as `brief-scope`. */
export const buildBriefConverseBody = (connectorId: string, scope: EntityAnalyticsScope) => ({
  connector_id: connectorId,
  _execution_mode: 'local',
  input: 'Generate the Entity Analytics brief for the attached view.',
  attachments: [
    { id: SCOPE_ATTACHMENT_ID, type: ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE, data: scope },
  ],
});

/** The brief markdown from the brief tool's call step. */
export const getBriefFromSteps = ({ steps }: ConverseResponseBody): string => {
  const result = steps
    .filter(isToolCallStep)
    .find(({ tool_id: toolId }) => toolId === BRIEF_TOOL_ID)?.results[0];
  const brief = result?.data && 'brief' in result.data ? result.data.brief : undefined;
  if (typeof brief !== 'string') {
    throw new Error(`No brief in the tool call steps: ${JSON.stringify(steps)}`);
  }
  return brief;
};
