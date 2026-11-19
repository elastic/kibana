/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { buildRuleManagementAgentMessage } from './build_rule_management_agent_message';

const ELASTIC_AI_AGENT_ID = 'elastic-ai-agent';

/** Builds a platform ES|QL attachment for Agent Builder from a Discover query string. */
export const buildDiscoverEsqlAttachment = (query: string): AttachmentInput => ({
  type: AttachmentType.esql,
  data: {
    query,
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.discoverEsqlAttachmentDescription',
      {
        defaultMessage: 'Query from Discover',
      }
    ),
  },
});

/** Opens Agent Builder for rule authoring, attaching an ES|QL query when provided. */
export const openRuleAuthoringAgentChat = ({
  agentBuilder,
  application,
  userInput,
  esqlQuery,
}: {
  agentBuilder?: AgentBuilderPluginStart;
  application: ApplicationStart;
  userInput?: string;
  esqlQuery?: string;
}): void => {
  const initialMessage = buildRuleManagementAgentMessage(userInput);
  const trimmedQuery = esqlQuery?.trim();
  const attachments = trimmedQuery ? [buildDiscoverEsqlAttachment(trimmedQuery)] : undefined;

  if (agentBuilder?.openChat) {
    agentBuilder.openChat({
      newConversation: true,
      agentId: ELASTIC_AI_AGENT_ID,
      sessionTag: 'observability-alerting',
      initialMessage,
      autoSendInitialMessage: true,
      ...(attachments ? { attachments } : {}),
    });
    return;
  }

  application.navigateToApp(AGENT_BUILDER_APP_ID, {
    path: `/agents/${ELASTIC_AI_AGENT_ID}/conversations/new`,
    state: {
      initialMessage,
      ...(attachments ? { attachments, autoSendInitialMessage: true } : {}),
    },
  });
};
