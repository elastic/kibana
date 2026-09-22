/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

export interface ImpactVerdictCounts {
  true_positive: number;
  false_positive: number;
  inconclusive: number;
}

export interface ImpactedEntity {
  entity_type: 'host' | 'user';
  name: string;
  alert_count: number;
  verdicts: ImpactVerdictCounts;
}

export interface ImpactAttachmentData {
  attachmentLabel?: string;
  entities?: ImpactedEntity[];
  total_alert_count?: number;
  truncated?: boolean;
}

export type ImpactAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.impact,
  ImpactAttachmentData
>;
