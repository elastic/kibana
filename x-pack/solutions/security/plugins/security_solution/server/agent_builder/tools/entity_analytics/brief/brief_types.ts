/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { z, lazySchema } from '@kbn/zod/v4';
import type {
  BriefTileId,
  EntityAnalyticsScope,
} from '../../../../../common/entity_analytics/ai_brief/scope';

export const MAX_BRIEF_CANDIDATES = 25;
export const MAX_PRIORITIES = 3;
export const MAX_CHANGE_ROWS = 3;

export type BriefEntityType = 'host' | 'user' | 'service' | 'generic';

/** An entity from the page's tiles, with its Entity Store record. */
export interface BriefCandidate {
  /** The resolved entity id (EUID), as the tile returned it. */
  id: string;
  name: string;
  type: BriefEntityType;
  /** The tiles the entity appears in, the selected tile first. */
  tileIds: BriefTileId[];
  record: Entity;
}

/** One statement about one candidate. Ids are local to a brief. */
export interface BriefFact {
  id: number;
  entityId: string;
  text: string;
}

/** What the model submits. Limits are enforced after the call, so a long answer is trimmed, not rejected. */
export const BriefDraft = lazySchema(() =>
  // Priorities come first. Claude sometimes leaks tool-call markup at the end of a string argument,
  // which swallowed the next argument when attention came first; verification trims it.
  z.object({
    priorities: z.array(
      z.object({
        entityId: z.string(),
        observed: z.string(),
        whyItMatters: z.string(),
        nextStep: z.string(),
        factIds: z.array(z.number().int()),
      })
    ),
    attention: z.string(),
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
  abortSignal?: AbortSignal;
  logger: Logger;
}

/**
 * - `brief`: a composed brief with at least one priority.
 * - `no_priorities`: composed, but no priority survived verification.
 * - `quiet`: nothing to brief on, so no model call was made.
 */
export type BriefOutcome = 'brief' | 'no_priorities' | 'quiet';

export interface GenerateBriefResult {
  /** Markdown, presented verbatim by the agent. */
  brief: string;
  outcome: BriefOutcome;
  stats: {
    candidateCount: number;
    factCount: number;
    priorityCount: number;
    droppedPriorityCount: number;
    repaired: boolean;
    took: number;
  };
}
