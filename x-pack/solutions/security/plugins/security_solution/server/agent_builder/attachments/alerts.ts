/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { ALERTS_BATCH_MAX_SIZE, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { getAlertsIndex } from '../../../common/entity_analytics/utils';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../tools';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAlertsById } from '../tools/get_alerts_by_id';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const bulkAlertsAttachmentDataSchema = securityAttachmentDataSchema.extend({
  alertIds: z.array(z.string().max(512)).min(1).max(ALERTS_BATCH_MAX_SIZE),
});

export type BulkAlertsAttachmentData = z.infer<typeof bulkAlertsAttachmentDataSchema>;

// Bounded cache to avoid re-fetching alert data from ES on every LLM attachment_read call.
// Keyed on attachment.id (UUIDs), evicts oldest entry when full.
const REPRESENTATION_CACHE_MAX_SIZE = 500;
const representationCache = new Map<string, string>();

export const createBulkAlertsAttachmentType = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.alerts,
  isReadonly: true,
  maxContentLength: 50_000,
  validate: (input) => {
    const result = bulkAlertsAttachmentDataSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment, context) => {
    // framework guarantees validate() ran first, so data is BulkAlertsAttachmentData
    const { data } = attachment as Attachment<string, BulkAlertsAttachmentData>;
    return {
      getRepresentation: async () => {
        const cached = representationCache.get(attachment.id);
        if (cached !== undefined) {
          return { type: 'text' as const, value: cached };
        }

        const [coreStart] = await core.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(context.request).asCurrentUser;
        const index = getAlertsIndex(context.spaceId);

        let alertsById: Record<string, unknown> | undefined;
        try {
          alertsById = await getAlertsById({ esClient, index, ids: data.alertIds });
        } catch (err) {
          logger.warn(
            `Failed to fetch ${data.alertIds.length} alert(s) from index ${index}: ${
              err?.message ?? err
            }`
          );
        }

        if (
          alertsById !== undefined &&
          Object.keys(alertsById).length === 0 &&
          data.alertIds.length > 0
        ) {
          logger.warn(
            `ES returned no results for ${data.alertIds.length} alert ID(s) from index ${index}`
          );
        }

        const resolvedAlerts = alertsById ?? {};
        const entries = data.alertIds.map((id, i) => {
          const alert = resolvedAlerts[id] ?? { error: 'not found' };
          return `Alert ${i + 1}:\n${JSON.stringify({ _id: id, ...(alert as object) }, null, 2)}`;
        });

        const value = `${data.alertIds.length} security alert${
          data.alertIds.length !== 1 ? 's' : ''
        }:\n\n${entries.join('\n\n---\n\n')}`;

        if (representationCache.size >= REPRESENTATION_CACHE_MAX_SIZE) {
          const oldest = representationCache.keys().next().value;
          if (oldest !== undefined) {
            representationCache.delete(oldest);
          }
        }
        representationCache.set(attachment.id, value);

        return { type: 'text' as const, value };
      },
    };
  },
  getTools: () => [
    SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
    SECURITY_LABS_SEARCH_TOOL_ID,
    platformCoreTools.cases,
    platformCoreTools.generateEsql,
    platformCoreTools.productDocumentation,
  ],
  getAgentDescription: () =>
    `You have access to security alerts provided in one or more batches. Each attachment contains a batch of up to 20 alerts with full field data.

When the conversation has many batches (summary mode), the system shows metadata only. Read each batch before answering:
- Each batch appears as <attachment attachment_id="<some-id>" type="security.alerts" ...> in the XML
- Call the attachment read tool (attachment_read) and pass the attachment_id value directly as the "attachment_id" parameter
- Read ALL batches before forming conclusions

Process each batch in order:
1. Extract _id, kibana.alert.rule.name, severity, risk_score, host.name, user.name, and MITRE fields.
2. Note entities (hosts, users) and patterns within the batch.

After processing all batches:
3. Identify shared entities, escalation indicators, and patterns across the full alert set.
4. Use the enrichment tools (entity risk score, security labs, attack discovery) for collective context.
5. Produce a structured summary with triage steps and recommended actions.`,
});
