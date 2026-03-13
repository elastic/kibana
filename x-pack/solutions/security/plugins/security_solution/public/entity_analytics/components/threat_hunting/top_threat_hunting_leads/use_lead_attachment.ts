/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  SecurityAgentBuilderAttachments,
  THREAT_HUNTING_AGENT_ID,
} from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { LEAD_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import type { HuntingLead } from './types';

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

export const useLeadAttachment = () => {
  const { agentBuilder } = useKibana().services;
  const { isAgentBuilderEnabled } = useAgentBuilderAvailability();

  const openWithLead = useCallback(
    (lead: HuntingLead) => {
      if (!isAgentBuilderEnabled || !agentBuilder?.openConversationFlyout) {
        return;
      }

      const leadMarkdown = formatLeadAsMarkdown(lead);

      const attachment: AttachmentInput = {
        id: `${SecurityAgentBuilderAttachments.lead}-${Date.now()}`,
        type: SecurityAgentBuilderAttachments.lead,
        data: {
          lead: leadMarkdown,
          attachmentLabel: lead.title,
        },
      };

      agentBuilder.openConversationFlyout({
        autoSendInitialMessage: false,
        newConversation: true,
        initialMessage: LEAD_ATTACHMENT_PROMPT,
        attachments: [attachment],
        sessionTag: 'security',
        agentId: THREAT_HUNTING_AGENT_ID,
      });
    },
    [isAgentBuilderEnabled, agentBuilder]
  );

  return openWithLead;
};
