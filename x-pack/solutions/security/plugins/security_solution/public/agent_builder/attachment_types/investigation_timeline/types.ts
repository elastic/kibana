/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

export interface InvestigationTimelineEvent {
  timestamp: string;
  host: string;
  description: string;
}

/** The range the telemetry was searched over, as ISO-8601 strings. */
export interface InvestigationTimelineWindow {
  start: string;
  end: string;
}

export interface InvestigationTimelineAttachmentData {
  events: InvestigationTimelineEvent[];
  window?: InvestigationTimelineWindow;
  attachmentLabel?: string;
}

export type InvestigationTimelineAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.investigationTimeline,
  InvestigationTimelineAttachmentData
>;
