/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type {
  BriefEntityType,
  EaCapability,
  Evidence,
  FactKind,
  FactSource,
  LinkType,
  Severity,
} from '../../../../../common/entity_analytics/executive_brief/evidence';

/**
 * Signal framework. Each signal is one file that gathers facts (and optionally links and
 * candidate entities) from one data source. Signals never see each other's output; the only
 * thing that flows between phases is the candidate entity set.
 */

/** 'tenant' signals look at the whole window; 'entities' signals look at the candidate set. */
export type SignalScope = 'tenant' | 'entities';

/** An entity as signals see it, before the evidence registry assigns an ENT id. */
export interface EntityRef {
  /** Entity Store id; resolved to the golden entity by the engine. */
  euid: string;
  type: BriefEntityType;
  name: string;
}

export interface SignalContext {
  /** Scoped to the requesting user, so signals only see what the user can see. */
  esClient: ElasticsearchClient;
  spaceId: string;
  /** Absolute window, fixed when the job starts. */
  timeRange: { from: string; to: string };
  now: Date;
  logger: Logger;
  /** The requesting user, for features with per-user visibility (e.g. Attack Discovery). */
  user: { username: string; profileUid?: string };
  getCasesClient: () => Promise<CasesClient | undefined>;
}

export type SignalInput<TScope extends SignalScope> = TScope extends 'entities'
  ? { entities: EntityRef[] }
  : Record<string, never>;

export interface FactDraft {
  kind: FactKind;
  title: string;
  at?: string;
  severity?: Severity;
  entities: EntityRef[];
  numbers?: Record<string, number>;
  details?: Record<string, string>;
  source?: FactSource;
}

export interface LinkDraft {
  type: LinkType;
  from: EntityRef;
  to: EntityRef;
  /** Indexes into this signal's `facts` array that back the link. */
  factIndexes?: number[];
  firstSeen?: string;
}

/** Extra entity attributes a signal knows (risk, criticality, watchlists); merged by euid. */
export interface EntityAttributes {
  euid: string;
  riskScore?: number;
  riskLevel?: string;
  criticality?: string;
  watchlists?: string[];
  privileged?: boolean;
}

export interface SignalOutput {
  facts: FactDraft[];
  links?: LinkDraft[];
  /** Tenant signals nominate entities for the entity-scoped phase. */
  candidates?: EntityRef[];
  entityAttributes?: EntityAttributes[];
}

export type Availability = { available: true } | { available: false; reason: string };

export interface BriefSignal<TScope extends SignalScope = SignalScope> {
  id: string;
  /** Shown in "Based on" and used as the prompt section header. */
  title: string;
  capability: EaCapability;
  scope: TScope;
  /** Defaults to BRIEF_LIMITS.signalTimeoutMs. */
  timeoutMs?: number;
  isAvailable(ctx: SignalContext): Promise<Availability>;
  run(
    ctx: SignalContext,
    input: SignalInput<TScope>,
    abortSignal: AbortSignal
  ): Promise<SignalOutput>;
}

/** Engine entry point, implemented in run_signals.ts. */
export type RunSignals = (
  ctx: SignalContext,
  signals: readonly BriefSignal[],
  options: { abortSignal: AbortSignal }
) => Promise<Evidence>;
