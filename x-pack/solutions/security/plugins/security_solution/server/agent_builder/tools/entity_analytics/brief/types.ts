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
import { z, lazySchema } from '@kbn/zod/v4';
import type { RiskScoreDataClient } from '../../../../lib/entity_analytics/risk_score/risk_score_data_client';
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';

export const MAX_BRIEF_CANDIDATES = 25;
export const MAX_PRIORITIES = 3;
/** Word limits, enforced again in verification. */
export const BRIEF_WORD_LIMITS = { attention: 40, priorityText: 20, recommendation: 30 } as const;
const { attention, priorityText, recommendation } = BRIEF_WORD_LIMITS;

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

/** What the model knows about a candidate. Every number the brief may state is here or in the view. */
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
    /** Null when not scored at the start of the period, never 0. Absent when it couldn't be read. */
    atPeriodStart?: number | null;
    change?: number;
  };
  assetCriticality?: string;
  privilegedUser?: true;
  otherWatchlists?: number;
  /** Relative to the capture, such as "5 days ago". */
  firstSeen?: string;
}

/**
 * What the model submits; the descriptions guide it. Limits are enforced after the call, so a long
 * answer is trimmed, not rejected. Structured fields come first, ahead of prose that may leak markup.
 */
export const BriefDraft = lazySchema(() =>
  z.object({
    priorities: z
      .array(
        z.object({
          entityId: z.string().describe('The entityId, exactly as given in <entities>'),
          observed: z
            .string()
            .describe(
              `What was observed, at most ${priorityText} words. Don't start with the entity name.`
            ),
          whyItMatters: z
            .string()
            .describe(
              `Why it matters, at most ${priorityText} words: criticality and risk where the data supports it`
            ),
          nextStep: z
            .string()
            .describe(`One specific investigation step, at most ${priorityText} words`),
        })
      )
      .describe(
        `At most ${MAX_PRIORITIES} entities to look at first, most important first. Never pad.`
      ),
    attention: z
      .string()
      .describe(`One or two sentences, at most ${attention} words, on what needs attention.`),
    recommendation: z
      .string()
      .describe(`The one step to take first across the view, at most ${recommendation} words.`),
  })
);
export type BriefDraft = z.infer<typeof BriefDraft>;
export type BriefPriority = BriefDraft['priorities'][number];

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
