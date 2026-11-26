/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRoundStep } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import { uniq } from 'lodash';
import { createToolCallMessage, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { EsClient } from '@kbn/scout-security';
import {
  ENTITY_LATEST,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
} from '@kbn/entity-store/common';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefDraft } from '../../../../../server/agent_builder/tools/entity_analytics/brief/prompts';
import { getBriefToolId } from '../../../../../server/agent_builder/tools/entity_analytics/brief/prompts';

/** The inference plugin's structured-output tool, which the brief's model call forces. */
const SUBMIT_BRIEF_TOOL_NAME = 'structuredOutput';
const SCOPE_ATTACHMENT_ID = 'brief-scope';
const BRIEF_TOOL_ID = getBriefToolId(SCOPE_ATTACHMENT_ID);

/** Seeded with `seedRiskyUserEntity`, whose name is the EUID. */
export const SEEDED_USER_ID = 'user:brief-scout-user';

const TITLE_SYSTEM_PROMPT = 'You are a title-generation utility';

export interface ConverseResponseBody {
  conversation_id: string;
  steps: ConversationRoundStep[];
  response: { message: string };
}

/** What the brief tool returns: the render tags the agent pastes, and what it needs to answer follow-ups. */
export interface BriefToolResult {
  attachment_id: string;
  version: number;
  brief_tag: string;
  entity_table_tag?: string;
}

const isBriefToolResult = (data: unknown): data is BriefToolResult =>
  typeof data === 'object' && data !== null && 'attachment_id' in data && 'brief_tag' in data;

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
export const ensureLatestEntitiesIndex = async (
  esClient: EsClient,
  spaceId = 'default'
): Promise<boolean> => {
  const alias = getEntitiesAlias(ENTITY_LATEST, spaceId);
  if (await esClient.indices.exists({ index: alias })) {
    return false;
  }
  await esClient.indices.create({
    index: getLatestEntitiesIndexName(spaceId),
    aliases: { [alias]: {} },
    mappings: {
      dynamic_templates: [
        { strings_as_keyword: { match_mapping_type: 'string', mapping: { type: 'keyword' } } },
      ],
      properties: { '@timestamp': { type: 'date' } },
    },
  });
  return true;
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

export const buildDraft = (entityId: string): BriefDraft => ({
  title: 'Alerts on a privileged user',
  summary: 'Flagged entities in this view have alerts or newly reached High risk.',
  priorities: [
    {
      entityId,
      assessment: 'A privileged user newly at High risk is the shape of account misuse.',
      whyFirst: 'It is the clearest place to confirm first.',
      nextStep: 'Review the alerts for this entity in the last 7 days.',
    },
  ],
  recommendation: `Start with {{ entity.id ${entityId} }}.`,
});

/** The render tags in the brief tool's result, as the agent receives them in its messages. */
const getRenderTags = (messages: unknown[]): string[] => {
  // The tags sit inside JSON strings, so their quotes arrive escaped one or more times.
  const matches = JSON.stringify(messages).matchAll(
    /<render_attachment id=\\*"([^"\\]+)\\*" version=\\*"(\d+)\\*" \/>/g
  );
  return uniq(
    [...matches].map(([, id, version]) => `<render_attachment id="${id}" version="${version}" />`)
  );
};

/**
 * Mocks one brief round: title, the agent calling the brief tool, the forced composition call
 * when `draft` is given, and the final answer, which pastes the render tags as it is told to.
 * The proxy answers with the first match.
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
      when: ({ tools }) => Boolean(tools?.some(({ function: fn }) => fn.name === BRIEF_TOOL_ID)),
      responseMock: createToolCallMessage(BRIEF_TOOL_ID, {}),
    })
    .completeAfterIntercept();
  void llmProxy
    .intercept({
      name: 'agent: final answer',
      when: () => true,
      responseMock: ({ messages }) =>
        [
          'Here is the brief.',
          ...getRenderTags(messages),
          'Ask me about any of these entities.',
        ].join('\n\n'),
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
    {
      id: SCOPE_ATTACHMENT_ID,
      type: SecurityAgentBuilderAttachments.entityAnalyticsAiBrief,
      data: scope,
    },
  ],
});

export const getBriefResult = ({ steps }: ConverseResponseBody): BriefToolResult => {
  const result = steps
    .filter(isToolCallStep)
    .find(({ tool_id: toolId }) => toolId === BRIEF_TOOL_ID)?.results[0];
  if (!isBriefToolResult(result?.data)) {
    throw new Error(`No brief in the tool call steps: ${JSON.stringify(steps)}`);
  }
  return result.data;
};

/** The HTML of the conversation's `visualization` attachment, which is where the brief is posted. */
export const getBriefTemplate = ({ attachments = [] }: Conversation): string => {
  const attachment = attachments.find(({ type }) => type === 'visualization');
  const version = attachment?.versions.find(
    ({ version: number }) => number === attachment.current_version
  );
  const template = (version?.data as { visualization?: { template?: unknown } } | undefined)
    ?.visualization?.template;
  if (typeof template !== 'string') {
    throw new Error(`No brief visualization in the conversation: ${JSON.stringify(attachments)}`);
  }
  return template;
};
