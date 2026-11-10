/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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
import { getAlertsByTags } from '../tools/get_alerts_by_tags';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

/** Most alert tags one attachment references. */
const ALERTS_ATTACHMENT_MAX_TAGS = 10;

export const bulkAlertsAttachmentDataSchema = lazySchema(() =>
  securityAttachmentDataSchema
    .extend({
      alertIds: z.array(z.string().max(512)).min(1).max(ALERTS_BATCH_MAX_SIZE).optional(),
      /**
       * Alert tags, matched against `kibana.alert.workflow_tags` (not the rule's tags): the
       * attachment also covers every alert that carries one of them, including alerts tagged later.
       */
      tags: z.array(z.string().min(1).max(256)).min(1).max(ALERTS_ATTACHMENT_MAX_TAGS).optional(),
    })
    .refine(({ alertIds, tags }) => alertIds !== undefined || tags !== undefined, {
      message: 'Either alertIds or tags is required',
    })
);

export type BulkAlertsAttachmentData = z.infer<typeof bulkAlertsAttachmentDataSchema>;

// Bounded cache to avoid re-fetching alert data from ES on every LLM attachment_read call.
// Keyed on attachment.id (UUIDs), evicts oldest entry when full.
const REPRESENTATION_CACHE_MAX_SIZE = 500;
const representationCache = new Map<string, string>();

const formatAlertEntries = (
  entries: ReadonlyArray<{ id: string; alert: unknown }>,
  offset: number
): string =>
  entries
    .map(
      ({ id, alert }, i) =>
        `Alert ${offset + i + 1}:\n${JSON.stringify({ _id: id, ...(alert as object) }, null, 2)}`
    )
    .join('\n\n---\n\n');

const describeAlertsById = async ({
  esClient,
  index,
  alertIds,
  logger,
}: {
  esClient: ElasticsearchClient;
  index: string;
  alertIds: string[];
  logger: Logger;
}): Promise<string> => {
  let alertsById: Record<string, unknown> | undefined;
  try {
    alertsById = await getAlertsById({ esClient, index, ids: alertIds });
  } catch (err) {
    logger.warn(
      `Failed to fetch ${alertIds.length} alert(s) from index ${index}: ${err?.message ?? err}`
    );
  }

  if (alertsById !== undefined && Object.keys(alertsById).length === 0 && alertIds.length > 0) {
    logger.warn(`ES returned no results for ${alertIds.length} alert ID(s) from index ${index}`);
  }

  const resolvedAlerts = alertsById ?? {};
  const entries = alertIds.map((id) => ({
    id,
    alert: resolvedAlerts[id] ?? { error: 'not found' },
  }));

  return `${alertIds.length} security alert${
    alertIds.length !== 1 ? 's' : ''
  }:\n\n${formatAlertEntries(entries, 0)}`;
};

const describeTags = (tags: readonly string[]): string =>
  tags.length === 1 ? `the tag ${tags[0]}` : `any of the tags ${tags.join(', ')}`;

/** The alerts that carry the tags, except the ones already listed by id, numbered after them. */
const describeAlertsByTags = async ({
  esClient,
  index,
  tags,
  listedIds,
  logger,
}: {
  esClient: ElasticsearchClient;
  index: string;
  tags: string[];
  listedIds: string[];
  logger: Logger;
}): Promise<string> => {
  try {
    const { total, alerts } = await getAlertsByTags({
      esClient,
      index,
      tags,
      excludeIds: listedIds,
    });
    const subject = `${total}${listedIds.length > 0 ? ' other' : ''} security alert${
      total !== 1 ? 's have' : ' has'
    } ${describeTags(tags)}`;
    if (alerts.length === 0) {
      return `${subject}.`;
    }
    const intro =
      alerts.length < total ? `${subject}. The ${alerts.length} most recent:` : `${subject}:`;
    return `${intro}\n\n${formatAlertEntries(
      alerts.map(({ id, source }) => ({ id, alert: source })),
      listedIds.length
    )}`;
  } catch (err) {
    logger.warn(
      `Failed to fetch the alerts with ${describeTags(tags)} from index ${index}: ${
        err?.message ?? err
      }`
    );
    return `The security alerts with ${describeTags(tags)} could not be read.`;
  }
};

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
    // Alerts can gain a tag at any time, so text that reads tagged alerts is never cached.
    const cacheable = data.tags === undefined;
    return {
      getRepresentation: async () => {
        const cached = cacheable ? representationCache.get(attachment.id) : undefined;
        if (cached !== undefined) {
          return { type: 'text' as const, value: cached };
        }

        const [coreStart] = await core.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(context.request).asCurrentUser;
        const index = getAlertsIndex(context.spaceId);
        const alertIds = data.alertIds ?? [];

        const sections: string[] = [];
        if (alertIds.length > 0) {
          sections.push(await describeAlertsById({ esClient, index, alertIds, logger }));
        }
        if (data.tags) {
          sections.push(
            await describeAlertsByTags({
              esClient,
              index,
              tags: data.tags,
              listedIds: alertIds,
              logger,
            })
          );
        }
        const value = sections.join('\n\n---\n\n');

        if (cacheable) {
          if (representationCache.size >= REPRESENTATION_CACHE_MAX_SIZE) {
            const oldest = representationCache.keys().next().value;
            if (oldest !== undefined) {
              representationCache.delete(oldest);
            }
          }
          representationCache.set(attachment.id, value);
        }

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

A batch can also reference alerts by tag. It then says how many alerts have the tag and includes the 20 most recent of them, after any alerts it lists by id. Alerts can gain the tag later, so read such a batch again for the current count.

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
