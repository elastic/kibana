/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  formatImpactForAgent,
  impactAttachmentDataSchema,
  MAX_IMPACTED_ENTITIES,
} from '../../../common/agent_builder/impact_attachment';

export {
  formatImpactForAgent,
  impactAttachmentDataSchema,
  impactedEntitySchema,
  MAX_IMPACTED_ENTITIES,
  type ImpactAttachmentData,
  type ImpactedEntity,
} from '../../../common/agent_builder/impact_attachment';

/** Creates the definition for the `security.impact` attachment type. */
export const createImpactAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.impact,
  // Default is 10_000; 50×1024-char names plus verdict lines exceed that. 64_000
  // covers the schema's worst-case formatImpactForAgent output with headroom.
  maxContentLength: 64_000,
  validate: (input) => {
    const result = impactAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const parsed = impactAttachmentDataSchema.safeParse(attachment.data);
      if (!parsed.success) {
        return {
          type: 'text' as const,
          value: 'Alert impact summary\nInvalid impact attachment data.',
        };
      }
      return {
        type: 'text' as const,
        value: formatImpactForAgent(parsed.data),
      };
    },
  }),
  getAgentDescription: () =>
    `A ${SecurityAgentBuilderAttachments.impact} attachment summarises which hosts and users were touched by the alert batch the Alert Triage Worker analysed, with per-entity verdict counts.

Each item in \`entities\` carries:
- entity_type: "host" | "user"
- name: hostname or username ("unknown" when the alert lacked the field)
- alert_count: number of alerts attributed to this entity
- verdicts: { true_positive, false_positive, inconclusive }

When \`truncated\` is true the list was capped at ${MAX_IMPACTED_ENTITIES} entities; \`total_alert_count\` gives the full alert count before truncation.`,
});
