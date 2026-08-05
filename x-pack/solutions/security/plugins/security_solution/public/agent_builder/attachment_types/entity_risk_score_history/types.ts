/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { RiskScoreHistoryEntry } from '../../../../common/api/entity_analytics';
import type { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';

export interface EntityRiskScoreHistoryAttachmentData {
  attachmentLabel?: string;
  identifierType: IdentifierType;
  identifier: string;
  entityStoreId: string;
  from: string;
  to: string;
  bucketInterval: string;
  scoreType?: RiskScoreHistoryEntry['score_type'];
  entries: RiskScoreHistoryEntry[];
}

export type EntityRiskScoreHistoryAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.entityRiskScoreHistory,
  EntityRiskScoreHistoryAttachmentData
>;
