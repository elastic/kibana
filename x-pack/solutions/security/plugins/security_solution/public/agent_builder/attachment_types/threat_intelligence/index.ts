/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';

/**
 * Attachment-type IDs emitted by the threat-intelligence Agent Builder skill
 * and its tools. The string values MUST stay byte-for-byte stable across the
 * standalone-to-`securitySolution` merge — they are referenced by the server-
 * side tool wrappers (e.g. `hunt_behavior` emits `threat-intel-finding-card`
 * attachments), by the matching server-side attachment-type definitions in
 * `server/agent_builder/attachments/threat_intelligence_attachment_types.ts`,
 * and historically by operator workflows. Renaming any of them is a separate,
 * deliberate migration — not something to slip into the merge.
 */
const ATTACHMENT_TYPE_IDS = {
  mitreHeatmap: 'threat-intel-mitre-heatmap',
  reportTable: 'threat-intel-report-table',
  severityTimeline: 'threat-intel-severity-timeline',
  subscriptionConfirmation: 'threat-intel-subscription-confirmation',
  findingCard: 'threat-intel-finding-card',
} as const;

/**
 * Registers the five threat-intelligence attachment renderers
 * (`threat-intel-mitre-heatmap`, `threat-intel-report-table`,
 * `threat-intel-severity-timeline`, `threat-intel-subscription-confirmation`,
 * `threat-intel-finding-card`) with the Agent Builder attachments service.
 *
 * Dynamically imports the renderer modules so the heavy EUI surface (data
 * grids, combo boxes, code blocks) and per-renderer transitive deps stay off
 * the main `securitySolution` page-load bundle. Mirrors the lazy-load pattern
 * established for `registerEntityAttachment` /
 * `registerEntityAnalyticsDashboardAttachment` / `registerRuleAttachment`.
 *
 * Race-window: until the chunk resolves, threat-intelligence attachments fall
 * back to the Agent Builder service's default unknown-attachment handling. In
 * practice the chunk resolves well before the user can post a message and get
 * a threat-intelligence attachment back from the LLM.
 *
 * Called unconditionally from `plugin.tsx#start()` regardless of the
 * `threatIntelligenceSkillEnabled` experimental flag — when the flag is off,
 * the tools that emit these attachments are not registered server-side, so
 * the renderers register against attachment types that simply never appear.
 * Cheap and matches the existing pattern.
 */
export const registerThreatIntelligenceAttachments = ({
  attachments,
  core,
}: {
  attachments: AttachmentServiceStartContract;
  core: CoreStart;
}): void => {
  void import(
    /* webpackChunkName: "security_threat_intelligence_attachments" */
    './mitre_heatmap'
  ).then(({ mitreHeatmapUiDefinition }) => {
    attachments.addAttachmentType(
      ATTACHMENT_TYPE_IDS.mitreHeatmap,
      mitreHeatmapUiDefinition as Parameters<typeof attachments.addAttachmentType>[1]
    );
  });

  void import(
    /* webpackChunkName: "security_threat_intelligence_attachments" */
    './report_table'
  ).then(({ buildReportTableUiDefinition }) => {
    attachments.addAttachmentType(
      ATTACHMENT_TYPE_IDS.reportTable,
      buildReportTableUiDefinition(core) as Parameters<typeof attachments.addAttachmentType>[1]
    );
  });

  void import(
    /* webpackChunkName: "security_threat_intelligence_attachments" */
    './severity_timeline'
  ).then(({ severityTimelineUiDefinition }) => {
    attachments.addAttachmentType(
      ATTACHMENT_TYPE_IDS.severityTimeline,
      severityTimelineUiDefinition as Parameters<typeof attachments.addAttachmentType>[1]
    );
  });

  void import(
    /* webpackChunkName: "security_threat_intelligence_attachments" */
    './subscription_confirmation'
  ).then(({ buildSubscriptionConfirmationUiDefinition }) => {
    attachments.addAttachmentType(
      ATTACHMENT_TYPE_IDS.subscriptionConfirmation,
      buildSubscriptionConfirmationUiDefinition(core.http) as Parameters<
        typeof attachments.addAttachmentType
      >[1]
    );
  });

  void import(
    /* webpackChunkName: "security_threat_intelligence_attachments" */
    './finding_card'
  ).then(({ buildFindingCardUiDefinition }) => {
    attachments.addAttachmentType(
      ATTACHMENT_TYPE_IDS.findingCard,
      buildFindingCardUiDefinition(core) as Parameters<typeof attachments.addAttachmentType>[1]
    );
  });
};
