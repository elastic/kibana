/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { IOC_TYPES, SEVERITY_LEVELS } from '../../../common';

/**
 * IDs for the five attachment types. The `threat-intel-` prefix matches the
 * plugin/skill identity — do NOT use the original `cisonews-` prefix; the
 * design generalizes beyond CISO News.
 *
 * `findingCard` is the per-finding analyst-ready card emitted by
 * `hunt_behavior`. It carries three action buttons (Deploy / Dismiss /
 * Investigate) so an analyst can act on a behavioral finding without
 * leaving chat.
 */
export const ATTACHMENT_TYPES = {
  mitreHeatmap: 'threat-intel-mitre-heatmap',
  reportTable: 'threat-intel-report-table',
  severityTimeline: 'threat-intel-severity-timeline',
  subscriptionConfirmation: 'threat-intel-subscription-confirmation',
  findingCard: 'threat-intel-finding-card',
} as const;

const techniqueRowSchema = z.object({
  technique_id: z.string().regex(/^T\d{4}(\.\d{3})?$/),
  name: z.string().min(1),
  tactic: z.string().min(1),
  article_count: z.number().int().min(0),
  severity_max: z.enum(SEVERITY_LEVELS),
  top_actors: z.array(z.string()),
  has_coverage: z.boolean().optional(),
  matching_rule_count: z.number().int().min(0).optional(),
});

const mitreHeatmapPayloadSchema = z.object({
  attachmentLabel: z.string().optional(),
  time_range_label: z.string().min(1),
  mode: z.enum(['reports', 'coverage']).optional(),
  techniques: z.array(techniqueRowSchema).min(0),
});

export type MitreHeatmapPayload = z.infer<typeof mitreHeatmapPayloadSchema>;

export const mitreHeatmapAttachmentType: AttachmentTypeDefinition<
  typeof ATTACHMENT_TYPES.mitreHeatmap,
  MitreHeatmapPayload
> = {
  id: ATTACHMENT_TYPES.mitreHeatmap,
  validate: (input) => {
    const parsed = mitreHeatmapPayloadSchema.safeParse(input);
    return parsed.success
      ? { valid: true, data: parsed.data }
      : { valid: false, error: parsed.error.message };
  },
  format: (attachment) => {
    const data = attachment.data;
    const isCoverage = data.mode === 'coverage';
    const top = data.techniques
      .slice(0, 5)
      .map((t) =>
        isCoverage
          ? `${t.technique_id} (${t.has_coverage ? 'covered' : 'uncovered'}, ${
              t.article_count
            } reports)`
          : `${t.technique_id} (${t.article_count} reports, ${t.severity_max})`
      );
    const uncovered = isCoverage
      ? data.techniques.filter((t) => t.has_coverage === false).length
      : 0;
    return {
      getRepresentation: () => ({
        type: 'text',
        value: isCoverage
          ? `MITRE coverage heatmap (${data.time_range_label}): ${data.techniques.length} ` +
            `technique(s) — ${uncovered} uncovered. Top: ${top.join(', ')}.`
          : `MITRE heatmap (${data.time_range_label}): ${data.techniques.length} ` +
            `technique(s) across reports. Top: ${top.join(', ')}.`,
      }),
    };
  },
  isReadonly: true,
  getAgentDescription: () =>
    `An ATT&CK technique heatmap rendered inline. Two modes: ` +
    `(a) "reports" — cells colored by max observed severity, sized by report count; ` +
    `(b) "coverage" — cells colored green when covered by at least one enabled SIEM rule, ` +
    `red when uncovered. Use mode "coverage" with the output of threat_intel.coverage_gap.`,
};

const iocRowSchema = z.object({
  type: z.enum(IOC_TYPES),
  value: z.string().min(1),
});

const reportRowSchema = z.object({
  report_id: z.string().min(1),
  title: z.string().min(1),
  source: z.object({
    type: z.string().min(1),
    name: z.string().min(1),
    url: z.string().optional(),
  }),
  severity: z.enum(SEVERITY_LEVELS),
  techniques: z.array(z.string()).default([]),
  iocs: z.array(iocRowSchema).default([]),
  environment_hits_total: z.number().int().min(0).optional(),
  related_reports: z
    .object({
      count: z.number().int().min(0),
      top_ids: z.array(z.string().min(1)).default([]),
    })
    .optional(),
});

const reportTablePayloadSchema = z.object({
  attachmentLabel: z.string().optional(),
  time_range_label: z.string().min(1),
  reports: z.array(reportRowSchema).min(0),
});

export type ReportTablePayload = z.infer<typeof reportTablePayloadSchema>;

export const reportTableAttachmentType: AttachmentTypeDefinition<
  typeof ATTACHMENT_TYPES.reportTable,
  ReportTablePayload
> = {
  id: ATTACHMENT_TYPES.reportTable,
  validate: (input) => {
    const parsed = reportTablePayloadSchema.safeParse(input);
    return parsed.success
      ? { valid: true, data: parsed.data }
      : { valid: false, error: parsed.error.message };
  },
  format: (attachment) => {
    const data = attachment.data;
    const totalIocs = data.reports.reduce((acc, r) => acc + r.iocs.length, 0);
    const envHits = data.reports.reduce((acc, r) => acc + (r.environment_hits_total ?? 0), 0);
    return {
      getRepresentation: () => ({
        type: 'text',
        value:
          `Report table (${data.time_range_label}): ${data.reports.length} report(s), ` +
          `${totalIocs} IOC(s) total. ${envHits} IOC observation(s) already in environment.`,
      }),
    };
  },
  isReadonly: true,
  getAgentDescription: () =>
    `A table of threat reports rendered inline. Each row is a report (title, source, ` +
    `severity, techniques) with embedded IOC details. Selected IOCs can be promoted into ` +
    `a threat_match Detection Engine rule via the row action buttons.`,
};

const timelinePointSchema = z.object({
  report_id: z.string().min(1),
  '@timestamp': z.string().min(1),
  severity: z.enum(SEVERITY_LEVELS),
  severity_score: z.number().min(0).max(100),
  title: z.string().min(1),
  source_name: z.string().min(1),
});

const severityTimelinePayloadSchema = z.object({
  attachmentLabel: z.string().optional(),
  time_range_label: z.string().min(1),
  points: z.array(timelinePointSchema).min(0),
});

export type SeverityTimelinePayload = z.infer<typeof severityTimelinePayloadSchema>;

export const severityTimelineAttachmentType: AttachmentTypeDefinition<
  typeof ATTACHMENT_TYPES.severityTimeline,
  SeverityTimelinePayload
> = {
  id: ATTACHMENT_TYPES.severityTimeline,
  validate: (input) => {
    const parsed = severityTimelinePayloadSchema.safeParse(input);
    return parsed.success
      ? { valid: true, data: parsed.data }
      : { valid: false, error: parsed.error.message };
  },
  format: (attachment) => {
    const { points, time_range_label: range } = attachment.data;
    const counts = points.reduce<Record<string, number>>((acc, p) => {
      acc[p.severity] = (acc[p.severity] ?? 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(counts)
      .map(([sev, count]) => `${count} ${sev}`)
      .join(', ');
    return {
      getRepresentation: () => ({
        type: 'text',
        value: `Severity timeline (${range}): ${points.length} report(s) — ${
          summary || 'no severity breakdown'
        }.`,
      }),
    };
  },
  isReadonly: true,
  getAgentDescription: () =>
    `A temporal scatter plot of report severity over time, rendered inline. Useful for ` +
    `digests over a wider window (>7 days) to visualize severity peaks and trends.`,
};

const subscriptionConfirmationPayloadSchema = z.object({
  attachmentLabel: z.string().optional(),
  tags: z.array(z.string().min(1)).min(1),
  severity_threshold: z.enum(SEVERITY_LEVELS),
  schedule_rrule: z.string().min(1),
  delivery: z.object({
    type: z.enum(['email', 'slack']),
    target: z.string().min(1),
  }),
  human_summary: z.string().min(1),
  template_id: z.string().optional(),
});

export type SubscriptionConfirmationPayload = z.infer<typeof subscriptionConfirmationPayloadSchema>;

/**
 * Editable subscription-confirmation card.
 *
 * The renderer is now a controlled form: the agent proposes initial values
 * (optionally seeded from a `template_id` such as `daily-threat-debrief`)
 * and the user can edit tags / severity / schedule / delivery in place
 * before clicking Submit. Submit posts directly to
 * `/internal/threat_intelligence/subscriptions/submit`, which calls the
 * shared `persistSubscription` helper used by the `create_subscription`
 * tool — no second agent round-trip required.
 */
export const subscriptionConfirmationAttachmentType: AttachmentTypeDefinition<
  typeof ATTACHMENT_TYPES.subscriptionConfirmation,
  SubscriptionConfirmationPayload
> = {
  id: ATTACHMENT_TYPES.subscriptionConfirmation,
  validate: (input) => {
    const parsed = subscriptionConfirmationPayloadSchema.safeParse(input);
    return parsed.success
      ? { valid: true, data: parsed.data }
      : { valid: false, error: parsed.error.message };
  },
  format: (attachment) => {
    const data = attachment.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value:
          `Pending subscription confirmation: ${data.human_summary} ` +
          `(awaiting user edit + Submit on the rendered attachment).`,
      }),
    };
  },
  isReadonly: false,
  getAgentDescription: () =>
    `An editable subscription-confirmation card. The user can adjust tags, severity, ` +
    `schedule, and delivery target before submitting. Submit posts directly to the plugin's ` +
    `internal route — the agent does NOT need to be re-invoked unless the caller is acting ` +
    `non-interactively. Optionally seed initial values from a pre-staged template_id.`,
};

const findingCardPayloadSchema = z.object({
  attachmentLabel: z.string().optional(),
  finding_id: z.string().min(1),
  report_id: z.string().min(1),
  report_title: z.string().min(1),
  report_source_name: z.string().min(1),
  report_source_url: z.string().optional(),
  technique_id: z.string().regex(/^T\d{4}(\.\d{3})?$/),
  technique_name: z.string().min(1),
  parent_technique_id: z
    .string()
    .regex(/^T\d{4}$/)
    .optional(),
  tactics: z.array(z.string().min(1)).default([]),
  severity: z.enum(SEVERITY_LEVELS),
  confidence: z.number().min(0).max(1),
  evidence_quote: z.string().min(1),
  proposed_esql_rule: z.string().min(1),
  rule_name: z.string().min(1),
  risk_score: z.number().int().min(0).max(100),
});

export type FindingCardPayload = z.infer<typeof findingCardPayloadSchema>;

export const findingCardAttachmentType: AttachmentTypeDefinition<
  typeof ATTACHMENT_TYPES.findingCard,
  FindingCardPayload
> = {
  id: ATTACHMENT_TYPES.findingCard,
  validate: (input) => {
    const parsed = findingCardPayloadSchema.safeParse(input);
    return parsed.success
      ? { valid: true, data: parsed.data }
      : { valid: false, error: parsed.error.message };
  },
  format: (attachment) => {
    const data = attachment.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value:
          `Behavioral finding ${data.technique_id} (${data.technique_name}) — ` +
          `severity ${data.severity}, confidence ${data.confidence.toFixed(2)}. ` +
          `Source: ${data.report_source_name} (${data.report_id}). ` +
          `Actions available: Deploy (create rule), Dismiss, Investigate (open case).`,
      }),
    };
  },
  // The card itself does not mutate when the user clicks an action — Deploy
  // and Investigate hand off to Security app pages, Dismiss is purely
  // client-side UI state. Marking readonly keeps the agent from trying to
  // re-fetch a server copy on every render.
  isReadonly: true,
  getAgentDescription: () =>
    `A single analyst-ready behavioral finding rendered inline as a card. ` +
    `Carries a MITRE ATT&CK technique, an evidence quote from the source report, ` +
    `severity/confidence scores, and a deploy-ready ES|QL Detection Engine rule body. ` +
    `Three action buttons: Deploy (opens Detection Engine rule create with the ES|QL ` +
    `body copied to clipboard), Dismiss (client-side hide), and Investigate (opens a ` +
    `pre-populated Case for tracking).`,
};

export const ALL_ATTACHMENT_TYPES = [
  mitreHeatmapAttachmentType,
  reportTableAttachmentType,
  severityTimelineAttachmentType,
  subscriptionConfirmationAttachmentType,
  findingCardAttachmentType,
] as const;
