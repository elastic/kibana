/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { mitreHeatmapUiDefinition } from './mitre_heatmap';
import { buildReportTableUiDefinition } from './report_table';
import { severityTimelineUiDefinition } from './severity_timeline';
import { buildSubscriptionConfirmationUiDefinition } from './subscription_confirmation';
import { buildFindingCardUiDefinition } from './finding_card';

const ATTACHMENT_TYPE_IDS = {
  mitreHeatmap: 'threat-intel-mitre-heatmap',
  reportTable: 'threat-intel-report-table',
  severityTimeline: 'threat-intel-severity-timeline',
  subscriptionConfirmation: 'threat-intel-subscription-confirmation',
  findingCard: 'threat-intel-finding-card',
} as const;

export const registerAttachmentUiDefinitions = (
  agentBuilder: AgentBuilderPluginStart,
  core: CoreStart
): void => {
  agentBuilder.attachments.addAttachmentType(
    ATTACHMENT_TYPE_IDS.mitreHeatmap,
    mitreHeatmapUiDefinition as Parameters<typeof agentBuilder.attachments.addAttachmentType>[1]
  );
  agentBuilder.attachments.addAttachmentType(
    ATTACHMENT_TYPE_IDS.reportTable,
    buildReportTableUiDefinition(core) as Parameters<
      typeof agentBuilder.attachments.addAttachmentType
    >[1]
  );
  agentBuilder.attachments.addAttachmentType(
    ATTACHMENT_TYPE_IDS.severityTimeline,
    severityTimelineUiDefinition as Parameters<typeof agentBuilder.attachments.addAttachmentType>[1]
  );
  agentBuilder.attachments.addAttachmentType(
    ATTACHMENT_TYPE_IDS.subscriptionConfirmation,
    buildSubscriptionConfirmationUiDefinition(core.http) as Parameters<
      typeof agentBuilder.attachments.addAttachmentType
    >[1]
  );
  agentBuilder.attachments.addAttachmentType(
    ATTACHMENT_TYPE_IDS.findingCard,
    buildFindingCardUiDefinition(core) as Parameters<
      typeof agentBuilder.attachments.addAttachmentType
    >[1]
  );
};
