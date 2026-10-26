/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { EntityAnalyticsScope } from '../../../common/entity_analytics/ai_brief/scope';
import type { BriefToolDeps } from '../tools/entity_analytics/generate_entity_analytics_brief_tool';
import { createGenerateBriefTool } from '../tools/entity_analytics/generate_entity_analytics_brief_tool';
import {
  ATTACHMENT_AGENT_DESCRIPTION,
  describeScopeForAgent,
} from '../tools/entity_analytics/brief';

/**
 * Attachment type for the Entity Analytics view captured by the "Generate AI brief" button. Each view
 * brings its own brief tool, so the tool only exists where there is a view to brief on.
 */
export const createEntityAnalyticsAiBriefAttachmentType = (
  deps: BriefToolDeps
): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.entityAnalyticsAiBrief,
  validate: (input) => {
    const result = EntityAnalyticsScope.safeParse(input);
    if (!result.success) {
      return { valid: false, error: result.error.message };
    }
    return { valid: true, data: result.data };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const scope = EntityAnalyticsScope.parse(attachment.data);
    return {
      getRepresentation: () => ({
        type: 'text',
        value: describeScopeForAgent(attachment.id, scope),
      }),
      getBoundedTools: () => [
        createGenerateBriefTool({ ...deps, attachmentId: attachment.id, scope }),
      ],
    };
  },
  getAgentDescription: () => ATTACHMENT_AGENT_DESCRIPTION,
});
