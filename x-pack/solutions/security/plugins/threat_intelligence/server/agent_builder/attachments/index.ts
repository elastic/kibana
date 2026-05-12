/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { ALL_ATTACHMENT_TYPES } from './types';

export const registerAttachmentTypes = (agentBuilder: AgentBuilderPluginSetup): void => {
  for (const attachmentType of ALL_ATTACHMENT_TYPES) {
    agentBuilder.attachments.registerType(
      attachmentType as Parameters<typeof agentBuilder.attachments.registerType>[0]
    );
  }
};

export {
  ATTACHMENT_TYPES,
  mitreHeatmapAttachmentType,
  reportTableAttachmentType,
  severityTimelineAttachmentType,
  subscriptionConfirmationAttachmentType,
  findingCardAttachmentType,
} from './types';
export type {
  MitreHeatmapPayload,
  ReportTablePayload,
  SeverityTimelinePayload,
  SubscriptionConfirmationPayload,
  FindingCardPayload,
} from './types';
