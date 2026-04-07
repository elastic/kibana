/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { THREAT_HUNTING_AGENT_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { LEAD_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import type { HuntingLead } from './types';

// This markdown is sent as an AI agent prompt and must remain in English
// regardless of user locale — intentionally not using i18n here.
const formatLeadAsMarkdown = (lead: HuntingLead): string => {
  const entityList = lead.entities.map((e) => `- **${e.type}**: ${e.name}`).join('\n');
  const observationList = lead.observations
    .map((obs) => `- [${obs.severity}] ${obs.type}: ${obs.description}`)
    .join('\n');
  const recommendations = lead.chatRecommendations.map((r) => `- ${r}`).join('\n');

  return `# ${lead.title}

**Priority**: ${lead.priority}/10
**Byline**: ${lead.byline}

## Description
${lead.description}

## Entities
${entityList}

## Observations
${observationList}

## Tags
${lead.tags.join(', ')}

## Recommended Investigation Prompts
${recommendations}`;
};

const buildLeadPrompt = (lead: HuntingLead): string => {
  const leadMarkdown = formatLeadAsMarkdown(lead);
  return `${LEAD_ATTACHMENT_PROMPT}\n\n---\n\n${leadMarkdown}`;
};

export const useLeadAttachment = () => {
  const { agentBuilder } = useKibana().services;

  const openWithLead = useCallback(
    (lead: HuntingLead) => {
      if (!agentBuilder?.openChat) {
        return;
      }

      agentBuilder.openChat({
        autoSendInitialMessage: false,
        newConversation: true,
        initialMessage: buildLeadPrompt(lead),
        sessionTag: 'security',
        agentId: THREAT_HUNTING_AGENT_ID,
      });
    },
    [agentBuilder]
  );

  return openWithLead;
};
