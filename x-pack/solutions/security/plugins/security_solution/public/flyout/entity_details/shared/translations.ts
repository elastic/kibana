/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USER = i18n.translate('xpack.securitySolution.flyout.entityDetails.host.userLabel', {
  defaultMessage: 'User',
});

export const FAIL_MANAGED_USER = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.failManagedUserDescription',
  {
    defaultMessage: 'Failed to run search on user managed data',
  }
);

export const RISK_SCORE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.riskScoreLabel',
  {
    defaultMessage: 'Risk score',
  }
);

export const CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.closeButton',
  {
    defaultMessage: 'close',
  }
);

export const ASK_AI_ASSISTANT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAssistant.askAIAssistant',
  {
    defaultMessage: 'Ask AI Assistant',
  }
);

export const ENTITY_SUMMARY_CONVERSATION_ID = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAssistant.conversationId',
  {
    defaultMessage: 'Entity Summary',
  }
);

export const ENTITY_SUMMARY_CONTEXT_DESCRIPTION = (view: string) =>
  i18n.translate('xpack.securitySolution.flyout.entityDetails.aiAssistant.contextDescription', {
    defaultMessage: 'Entity (from {view})',
    values: { view },
  });

export const ENTITY_SUMMARY_VIEW_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAssistant.contextTooltip',
  {
    defaultMessage: 'Entity details',
  }
);

export const SUMMARY_VIEW = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.summaryView',
  {
    defaultMessage: 'summary',
  }
);

export const ENTITY_CONTEXT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAssistant.entityContextDescription',
  {
    defaultMessage: 'Entity details',
  }
);

export const ENTITY_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAssistant.entityContextTooltip',
  {
    defaultMessage: 'Asset details from inventory',
  }
);

export const ASSET_INVENTORY_ENTITY_PROMPT = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.aiAssistant.entityPrompt',
  {
    defaultMessage: `Your primary function is to analyze asset and entity data to provide security insights. You will be provided with a JSON object containing the context of a specific asset (e.g., a host, user, service or cloud resource). Your response must be structured, contextual, and directly address the user's query if one is provided. If no specific query is given, provide a general analysis based on the structure below.
Your response must be in markdown format and include the following sections:
**1. 🔍 Asset Overview**
   - Begin by acknowledging the asset you are analyzing using its primary identifiers (e.g., "Analyzing host \`[host.name]\` with IP \`[host.ip]\`").
   - Provide a concise summary of the asset's most critical attributes from the provided context.
   - Describe its key relationships and dependencies (e.g., "This asset is part of the \`[cloud.project.name]\` project and is located in the \`[cloud.availability_zone]\` zone.").
**2. 💡 Investigation & Analytics**
   - Based on the asset's type and attributes, suggest potential investigation paths or common attack vectors.
   - **Generate contextual ES|QL queries** to help the user investigate further. Format all queries as code blocks. Your generated queries should address common analytical questions, such as:
     - Finding related security events (e.g., login attempts, network traffic, process executions).
     - Identifying other assets with similar attributes.
     - Searching for Indicators of Compromise (IoCs) relevant to the asset type.
   - If the user asks a question that can be answered with a query, provide the query as the primary answer.
**General Instructions:**
- **Context Awareness:** Your entire analysis must be derived from the provided asset context. If a piece of information is not available in the context (or appears to be anonymized), state that and proceed with the available data.
- **Query Generation:** When asked to "write a query" or a similar request, your primary output for that section should be a valid, ready-to-use ES|QL query based on the entity's schema.
- **Formatting:** Use markdown headers, tables, code blocks, and bullet points to ensure the output is clear, organized, and easily readable. Use concise, actionable language.`,
  }
);
