/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
} from '../tools';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

/**
 * Schema for attack_discovery attachment data.
 * Extends security attachment base with the AttackDiscovery type.
 */
export const attackDiscoveryAttachmentDataSchema = securityAttachmentDataSchema.extend({
  /**
   * The attack discovery data.
   */
  attackDiscovery: AttackDiscovery,
});

/**
 * Data for an attack_discovery attachment.
 */
export type AttackDiscoveryAttachmentData = z.infer<typeof attackDiscoveryAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to AttackDiscoveryAttachmentData.
 */
const isAttackDiscoveryAttachmentData = (data: unknown): data is AttackDiscoveryAttachmentData => {
  return attackDiscoveryAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `attack_discovery` attachment type.
 *
 * This attachment type is used to display attack discoveries with:
 * - MITRE ATT&CK tactics chain visualization
 * - Related alerts summary
 * - Entity summary (hosts, users affected)
 * - Actions: add to case, investigate alerts
 */
export const createAttackDiscoveryAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.attackDiscovery,

    validate: (input) => {
      const parseResult = attackDiscoveryAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },

    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isAttackDiscoveryAttachmentData(data)) {
        throw new Error(`Invalid attack_discovery attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAttackDiscoveryData(data) };
        },
      };
    },

    getTools: () => [
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      SECURITY_ALERTS_TOOL_ID,
      platformCoreTools.cases,
      platformCoreTools.generateEsql,
      platformCoreTools.productDocumentation,
    ],

    getAgentDescription: () => {
      return `An attack discovery is attached to this conversation. The attack discovery data is included in the <attachment> XML element within the user's message.

**How to access the attack discovery data:**
The attack discovery JSON is in the attachment content above. Parse it to extract:
- Attack title and summary
- MITRE ATT&CK tactics identified
- Related alert IDs
- Entity summary (affected hosts and users)

**Investigation steps:**
1. Review the attack summary and MITRE ATT&CK tactics
2. Examine the entity summary to identify affected hosts and users
3. Use the alerts tool to investigate related alerts
4. Check entity risk scores for affected entities
5. Search Elastic Security Labs for related threat intelligence
6. If this is a confirmed threat, consider adding to a case for tracking`;
    },
  };
};

/**
 * Formats attack discovery data for LLM representation.
 */
const formatAttackDiscoveryData = (data: AttackDiscoveryAttachmentData): string => {
  const { attackDiscovery } = data;
  const parts: string[] = [];

  parts.push(`## Attack Discovery: ${attackDiscovery.title}`);
  parts.push('');

  if (attackDiscovery.summaryMarkdown) {
    parts.push('### Summary');
    parts.push(attackDiscovery.summaryMarkdown);
    parts.push('');
  }

  if (attackDiscovery.mitreAttackTactics && attackDiscovery.mitreAttackTactics.length > 0) {
    parts.push('### MITRE ATT&CK Tactics');
    parts.push(attackDiscovery.mitreAttackTactics.join(', '));
    parts.push('');
  }

  if (attackDiscovery.entitySummaryMarkdown) {
    parts.push('### Entity Summary');
    parts.push(attackDiscovery.entitySummaryMarkdown);
    parts.push('');
  }

  if (attackDiscovery.alertIds && attackDiscovery.alertIds.length > 0) {
    parts.push('### Related Alerts');
    parts.push(`${attackDiscovery.alertIds.length} alerts associated with this discovery`);
    parts.push(
      `Alert IDs: ${attackDiscovery.alertIds.slice(0, 5).join(', ')}${
        attackDiscovery.alertIds.length > 5 ? '...' : ''
      }`
    );
    parts.push('');
  }

  if (attackDiscovery.detailsMarkdown) {
    parts.push('### Details');
    parts.push(attackDiscovery.detailsMarkdown);
  }

  return parts.join('\n');
};
