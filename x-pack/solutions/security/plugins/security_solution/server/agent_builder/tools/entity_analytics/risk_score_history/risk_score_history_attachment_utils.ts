/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { RiskScoreHistoryEntry } from '../../../../../common/api/entity_analytics';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { ensureAttachment } from '../attachment_utils';
import type { EntityIdentifierType } from '../entity_resolution';

// Underscore-free stand-in for the `security.entity_risk_score_history` attachment type
const ENTITY_RISK_SCORE_HISTORY_ATTACHMENT_ID_PREFIX = 'security.riskscorehistory';

/**
 * Deterministic attachment id for a single-entity risk history chart.
 * Includes `scoreType` so base vs resolution series do not overwrite each other
 * in the same conversation.
 */
export const buildRiskScoreHistoryAttachmentId = (
  identifierType: EntityIdentifierType,
  entityStoreId: string,
  scoreType: NonNullable<RiskScoreHistoryEntry['score_type']> = 'base'
): string => {
  const hash = createHash('sha256')
    .update(`${identifierType}:${entityStoreId}:${scoreType}`)
    .digest('hex');
  return `${ENTITY_RISK_SCORE_HISTORY_ATTACHMENT_ID_PREFIX}:${identifierType}:${hash}`;
};

interface RiskScoreHistoryAttachmentData {
  attachmentLabel?: string;
  identifierType: EntityIdentifierType;
  identifier: string;
  entityStoreId: string;
  from: string;
  to: string;
  bucketInterval: string;
  scoreType?: RiskScoreHistoryEntry['score_type'];
  entries: RiskScoreHistoryEntry[];
}

/**
 * Drops contribution fields (`inputs`, `modifiers`, …) from a history entry.
 * The chart attachment only needs the score series.
 */
const stripHistoryEntryForAttachment = (entry: RiskScoreHistoryEntry) => ({
  '@timestamp': entry['@timestamp'],
  calculated_score_norm: entry.calculated_score_norm,
  calculated_level: entry.calculated_level,
  ...(entry.calculated_score !== undefined ? { calculated_score: entry.calculated_score } : {}),
  ...(entry.score_type !== undefined ? { score_type: entry.score_type } : {}),
  ...(entry.category_1_score !== undefined ? { category_1_score: entry.category_1_score } : {}),
  ...(entry.category_1_count !== undefined ? { category_1_count: entry.category_1_count } : {}),
});

/**
 * Creates or refreshes a `security.entity_risk_score_history` attachment.
 * Strips contribution-heavy fields from entries.
 */
export const ensureRiskScoreHistoryAttachment = async ({
  attachments,
  id,
  data,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  data: RiskScoreHistoryAttachmentData;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> =>
  ensureAttachment({
    attachments,
    id,
    type: SecurityAgentBuilderAttachments.entityRiskScoreHistory,
    data: {
      ...data,
      entries: data.entries.map(stripHistoryEntryForAttachment),
    },
    description,
    logger,
  });
