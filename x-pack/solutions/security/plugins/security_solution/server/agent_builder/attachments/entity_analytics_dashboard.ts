/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { z } from '@kbn/zod/v4';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

const entityListRowSchema = z.object({
  entity_type: z.enum(['host', 'user', 'service', 'generic']),
  entity_id: z.string().min(1),
  entity_name: z.string().optional(),
  source: z.unknown().optional(),
  risk_score_norm: z.number().optional(),
  risk_level: z.string().optional(),
  criticality: z.string().optional(),
  first_seen: z.string().optional(),
  last_seen: z.string().optional(),
});

const severityCountSchema = z.object({
  Critical: z.number().int().min(0),
  High: z.number().int().min(0),
  Moderate: z.number().int().min(0),
  Low: z.number().int().min(0),
  Unknown: z.number().int().min(0),
});

const anomalyHighlightSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
});

const entityAnalyticsDashboardAttachmentDataSchema = securityAttachmentDataSchema.extend({
  summary: z.string().max(8000).optional(),
  time_range_label: z.string().max(256).optional(),
  watchlist_id: z.string().max(512).optional(),
  watchlist_name: z.string().max(512).optional(),
  severity_count: severityCountSchema.optional(),
  distribution_note: z.string().max(2000).optional(),
  anomaly_highlights: z.array(anomalyHighlightSchema).max(25).optional(),
  entities: z.array(entityListRowSchema).max(100),
});

export type EntityAnalyticsDashboardAttachmentData = z.infer<
  typeof entityAnalyticsDashboardAttachmentDataSchema
>;

const isEntityAnalyticsDashboardAttachmentData = (
  data: unknown
): data is EntityAnalyticsDashboardAttachmentData => {
  return entityAnalyticsDashboardAttachmentDataSchema.safeParse(data).success;
};

const formatDashboardForAgent = (
  attachmentId: string,
  data: EntityAnalyticsDashboardAttachmentData
): string => {
  const lines = [
    `Entity analytics dashboard "${
      data.attachmentLabel ?? 'Entity Analytics'
    }" (id: "${attachmentId}")`,
  ];
  if (data.time_range_label) {
    lines.push(`Time context: ${data.time_range_label}`);
  }
  if (data.watchlist_id || data.watchlist_name) {
    lines.push(
      `Watchlist: ${data.watchlist_name ?? data.watchlist_id ?? '—'} (${
        data.watchlist_id ?? 'no id'
      })`
    );
  }
  if (data.severity_count) {
    lines.push(
      `Risk level counts — Critical: ${data.severity_count.Critical}, High: ${data.severity_count.High}, Moderate: ${data.severity_count.Moderate}, Low: ${data.severity_count.Low}, Unknown: ${data.severity_count.Unknown}`
    );
  }
  if (data.distribution_note) {
    lines.push(`Distribution note: ${data.distribution_note}`);
  }
  if (data.summary) {
    lines.push(`Summary: ${data.summary.slice(0, 500)}${data.summary.length > 500 ? '…' : ''}`);
  }
  if (data.anomaly_highlights?.length) {
    lines.push(`Highlights: ${data.anomaly_highlights.map((h) => h.title).join('; ')}`);
  }
  lines.push(`Entities in snapshot: ${data.entities.length}`);
  data.entities.slice(0, 20).forEach((e, i) => {
    lines.push(
      `${i + 1}. [${e.entity_type}] ${e.entity_name ?? e.entity_id} (EUID: ${e.entity_id})`
    );
  });
  if (data.entities.length > 20) {
    lines.push(`…and ${data.entities.length - 20} more (see Canvas).`);
  }
  return lines.join('\n');
};

export const createEntityAnalyticsDashboardAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.entityAnalyticsDashboard,
    validate: (input) => {
      const parseResult = entityAnalyticsDashboardAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isEntityAnalyticsDashboardAttachmentData(data)) {
        throw new Error(
          `Invalid entity analytics dashboard attachment data for attachment ${attachment.id}`
        );
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatDashboardForAgent(attachment.id, data) };
        },
      };
    },
    getTools: () => [],
    getAgentDescription: () => {
      return `A security Entity Analytics dashboard snapshot attachment mirrors the built-in Security → Entity Analytics home experience in Canvas: entity risk level counts with the same donut/table visuals as the product, an optional "recent anomalies" style highlight list you author from investigation context, and the entities table. Use it when the user wants to show, open, view, or explore the **Entity Analytics dashboard/home/overview** (the **product Entity Analytics page** / same IA as that navigation entry), not only when they say "create". This precedence applies only when the user has NOT used explicit dashboard/home/overview phrasing: if the prompt contains phrases like \`entity analytics dashboard\`, \`EA dashboard\`, \`entity analytics home/overview/landing\`, or \`show/open/view Entity Analytics\`, use this attachment even when the same prompt also mentions list/ranking/top-N framing. **Do not** use this type when the user only asked for a **list**, **ranking**, **table**, **top N**, **multiple entities**, **hosts and users**, **riskiest entities**, **top entities**, **entities in the system**, or similar **set-of-entities** framing without clearly wanting that **home/overview** page — for those, the "${SecurityAgentBuilderAttachments.entity}" attachment that security.search_entities and security.get_entity emit automatically is sufficient (the rich renderer shows an entities table for 2+ rows and a single-entity card for 1 row). Only add this dashboard type on top of that when they also asked for the EA page experience. Do not confuse this with composing a new Kibana saved Dashboard (dashboard-management skill). Summarize in prose and reference the attachment id. Create with the attachments.add tool, type "${SecurityAgentBuilderAttachments.entityAnalyticsDashboard}", JSON fields: optional attachmentLabel, summary, time_range_label, watchlist_id, watchlist_name, severity_count (object with integer counts for Critical, High, Moderate, Low, Unknown — prefer real totals when inferable; otherwise bucket entities from your search and set distribution_note explaining the scope), optional distribution_note, optional anomaly_highlights as { title, body? }[], entities as row objects { entity_type, entity_id, entity_name?, source?, risk_score_norm?, risk_level?, criticality?, first_seen?, last_seen? } (may be empty when only KPIs/highlights matter). \`last_seen\` is the entity store record's top-level \`@timestamp\` (always present for entities in the store); use it — not \`entity.lifecycle.last_activity\` — because the lifecycle field can be missing for freshly upserted entities.

## Inline rendering (REQUIRED after attachments.add)
A successful \`attachments.add\` returns \`{ id, current_version }\`. The element name is literally \`render_attachment\` and the attribute names are literally \`id\` and \`version\` — do not rename them. Emit the tag on its OWN LINE, with a BLANK LINE before and after it, by substituting the values from the \`attachments.add\` result into this exact template:

    <render_attachment id="<id from attachments.add>" version="<current_version from attachments.add>" />

Rules:
- Copy \`id\` and \`current_version\` VERBATIM from the \`attachments.add\` tool result. Never synthesize an id from the user's prompt, the \`attachmentLabel\`, or any other field; never guess the id format.
- Do not wrap the tag in backticks, quotes, or a code fence.
- Without this tag the UI only shows "Attachment added: …" text and the user cannot open the Canvas — that is incorrect.`;
    },
  };
};
