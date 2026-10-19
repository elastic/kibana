/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE,
  EntityAnalyticsScope,
} from '../../../common/entity_analytics/ai_brief/scope';
import { SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID } from '../tools/entity_analytics/generate_entity_analytics_brief_tool';
import {
  describeScopeForAgent,
  getAttachmentAgentDescription,
} from '../tools/entity_analytics/brief';

/** Attachment type for the Entity Analytics view captured by the "Generate AI brief" button. */
export const createEntityAnalyticsAiBriefAttachmentType = (): AttachmentTypeDefinition => ({
  id: ENTITY_ANALYTICS_AI_BRIEF_ATTACHMENT_TYPE,
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
    };
  },
  getTools: () => [SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID],
  getAgentDescription: () =>
    getAttachmentAgentDescription(SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID),
});
