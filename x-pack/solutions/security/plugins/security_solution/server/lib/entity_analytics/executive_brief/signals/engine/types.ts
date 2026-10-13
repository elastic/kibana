/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import type {
  BriefMetadata,
  BriefReport,
  Fact,
  FactSource,
  Severity,
  SignalStatus,
} from '../../../../../../common/api/entity_analytics/executive_brief/common.gen';

export interface SignalContext {
  /** Scoped to the requesting user, so signals only see what the user can see. */
  esClient: ElasticsearchClient;
  spaceId: string;
  /** Absolute window, fixed when the job starts. */
  timeRange: { from: string; to: string };
  logger: Logger;
  /** The requesting user, for features with per-user visibility (Attack Discovery); may be empty. */
  username: string;
}

/** A fact before it is numbered. Its entities are golden Entity Store records. */
export interface FactDraft {
  title: string;
  /** ISO time. */
  timestamp?: string;
  severity?: Severity;
  entities: Entity[];
  numbers?: Record<string, number>;
  details?: Record<string, string>;
  source?: FactSource;
}

/** One data source the brief reads. A signal never sees another signal's output. */
export interface BriefSignal {
  id: string;
  /** Shown in "Based on" and used as the prompt section header. */
  title: string;
  /** Defaults to BRIEF_LIMITS.signalTimeoutMs. */
  timeoutMs?: number;
  run(ctx: SignalContext, abortSignal: AbortSignal): Promise<FactDraft[]>;
}

/** How one signal's run went, for the prompt and telemetry; only `status` and `took` are stored. */
export interface SignalOutcome {
  id: string;
  status: SignalStatus;
  /** Why it was unavailable, timed out or failed, in plain words. */
  reason?: string;
  /** Duration in milliseconds. */
  took: number;
  factCount: number;
}

/** What the signals gathered: the report's entities and facts, and each signal's run. */
export interface Evidence {
  entities: BriefReport['entities'];
  facts: Fact[];
  signals: BriefMetadata['signals'];
}

export interface GatherResult {
  evidence: Evidence;
  /** One per signal, in signal-priority order. */
  outcomes: SignalOutcome[];
}
