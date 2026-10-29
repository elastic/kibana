/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { Entity, EntityRiskLevels } from '@kbn/entity-store/common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { GroupMember } from '../../../../lib/entity_analytics/entity_case_counts/fetch_group_member_ids';
import type { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';
import type { RiskScoreDataClient } from '../../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefViewModel } from './view_model';

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
  /** The members resolved to a golden entity, with their records. Absent for an entity without members. */
  members?: GroupMember[];
}

/** The open alerts of an entity, or of its resolution group, in the captured period. */
export interface EntityAlerts {
  count: number;
  /** How many distinct rules raised them, and how many of those are not in `rules`. */
  ruleCount: number;
  otherRuleCount: number;
  /** The two most important rules: those with the most severe alerts, then the most alerts. The model cites a rule by its index. */
  rules: Array<{ index: number; name: string; count: number }>;
}

/** The anomaly records of an entity, or of its resolution group, in the captured period. */
export interface EntityAnomalies {
  count: number;
  /** How many distinct jobs raised them, named or not. */
  jobCount: number;
  /** The named job with the highest record score, which the model cites by index. A job without a display name is only counted. */
  jobs: Array<{ index: number; name: string; score: number }>;
}

/** What the model knows about a candidate. */
export interface EntityFacts {
  /** The EUID, used in mention tokens. */
  entityId: string;
  name: string;
  type: BriefEntityType;
  flaggedFor: SignalCardId[];
  risk?: {
    of: 'entity' | 'resolution group';
    level: EntityRiskLevels;
    score: number;
  };
  assetCriticality?: string;
  alerts?: EntityAlerts;
  anomalies?: EntityAnomalies;
  /** The names of the watchlists the entity is on. */
  watchlists?: string[];
  /** Relative to the capture, such as "5 days ago". */
  firstSeen?: string;
}

/** Reads the installed machine learning jobs of the request's space. */
export interface BriefJobService {
  jobsSummary: () => Promise<MlSummaryJob[]>;
}

export interface GenerateBriefParams {
  scope: EntityAnalyticsScope;
  /** The request's space, never the attachment's. */
  spaceId: string;
  /** Scoped to the requesting user. */
  esClient: ElasticsearchClient;
  /** The conversation's default model. */
  inferenceClient: BoundInferenceClient;
  attachments: AttachmentStateManager;
  /** Reads the names of the watchlists the entities are on. */
  watchlistConfigClient: WatchlistConfigClient;
  /** Reads the installed Security jobs the anomalies come from. Absent without the ML plugin: the brief then has no anomalies. */
  jobService?: BriefJobService;
  /** For the risk-history charts. Absent when risk score history is disabled. */
  riskScoreDataClient?: RiskScoreDataClient;
  abortSignal?: AbortSignal;
  logger: Logger;
}

export interface GenerateBriefResult {
  /** The brief as the HTML of an inline visualization. */
  html: string;
  /** The card's height in pixels. */
  height: number;
  viewModel: BriefViewModel;
  /** The `security.entity` table of the priorities, as its render tag. */
  entityTableTag?: string;
  priorityCount: number;
}
