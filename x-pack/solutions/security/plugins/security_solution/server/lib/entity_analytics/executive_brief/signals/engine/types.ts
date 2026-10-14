/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import type { ResolutionClient } from '@kbn/entity-store/server';
import type {
  BriefReport,
  Fact,
  SignalStatus,
} from '../../../../../../common/api/entity_analytics/executive_brief/common.gen';

/** What a signal's `run` receives. */
export interface SignalInput {
  /** Scoped to the requesting user, so signals only see what the user can see. */
  esClient: ElasticsearchClient;
  /** Entity Store resolution, with the same user-scoped client. */
  resolutionClient: ResolutionClient;
  spaceId: string;
  /** The requesting user's name, for Attack Discovery visibility; may be empty. */
  username: string;
  /** The requesting user's profile id, for Attack Discovery visibility. */
  profileId: string;
  /** Absolute window, fixed when the job starts. */
  timeRange: { from: string; to: string };
  /** Aborts on the signal's timeout, the gather budget or the job's end; pass it to every search. */
  abortSignal: AbortSignal;
  logger: Logger;
}

/** What a signal's `run` returns: facts before numbering, and the golden records they reference. */
export interface SignalResult {
  facts: Array<Omit<Fact, 'id'>>;
  entities: Entity[];
}

/** One data source the brief reads; register it in `signals/index.ts`. */
export interface Signal {
  id: string;
  /** Shown in "Based on" and used as the prompt section header. */
  title: string;
  run(input: SignalInput): Promise<SignalResult>;
}

/** How one signal's run went, for the prompt, the stored metadata and telemetry. */
export interface SignalOutcome {
  id: string;
  status: SignalStatus;
  /** Why it was unavailable, timed out or failed, in plain words. */
  reason?: string;
  /** Duration in milliseconds. */
  took: number;
  factCount: number;
}

/** What the signals gathered: entities keyed by EUID, facts numbered in signal order, and each run. */
export interface Evidence {
  entities: BriefReport['entities'];
  facts: Fact[];
  signals: SignalOutcome[];
}
