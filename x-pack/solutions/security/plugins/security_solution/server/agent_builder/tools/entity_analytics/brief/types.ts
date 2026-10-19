/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity, EntityRiskLevels } from '@kbn/entity-store/common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { RiskScoreDataClient } from '../../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';

export const MAX_BRIEF_CANDIDATES = 25;

export type BriefEntityType = 'host' | 'user' | 'service' | 'generic';

/** A flagged entity, with its Entity Store record. */
export interface BriefCandidate {
  /** The EUID, the golden entity's for a resolution group. */
  id: string;
  name: string;
  type: BriefEntityType;
  /** The tiles that flag the entity, in the page's order. */
  tileIds: SignalCardId[];
  record: Entity;
}

/** What the model knows about a candidate. */
export interface EntityFacts {
  /** The EUID, used in mention tokens. */
  entityId: string;
  name: string;
  type: BriefEntityType;
  /** The tiles that flag the entity; the prompt says what each means. */
  flaggedFor: SignalCardId[];
  risk?: {
    of: 'entity' | 'resolution group';
    level: EntityRiskLevels;
    score: number;
  };
  assetCriticality?: string;
  privilegedUser?: true;
  otherWatchlists?: number;
  /** Relative to the capture, such as "5 days ago". */
  firstSeen?: string;
}

export interface GenerateBriefParams {
  scope: EntityAnalyticsScope;
  /** The request's space, never the attachment's. */
  spaceId: string;
  /** Scoped to the requesting user. */
  esClient: ElasticsearchClient;
  /** The conversation's default model. */
  inferenceClient: BoundInferenceClient;
  /** For the entity table attachment. */
  attachments: AttachmentStateManager;
  /** For the risk-history charts. Absent when risk score history is disabled. */
  riskScoreDataClient?: RiskScoreDataClient;
  abortSignal?: AbortSignal;
  logger: Logger;
}

export interface GenerateBriefResult {
  /** Markdown, presented verbatim by the agent. */
  brief: string;
  priorityCount: number;
}
