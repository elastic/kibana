/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { DetectionStrategyDescriptor, LearnedDetector, StrategyMode } from '../../../common';
import type { OwnedRule, StrategyObservation } from '../domain';
import type { IRecordsStore } from '../storage/records_store';
import type { IRuleEventsReader } from './rule_events_reader';

/** A detector the learning loop wrote, with how it runs right now. */
export interface RunningDetector extends LearnedDetector {
  candidate_id: string;
  /** Trial until it passes its acceptance criteria; live after. */
  mode: Exclude<StrategyMode, 'off'>;
}

/** What every strategy evaluation gets. */
interface BaseStrategyContext {
  spaceId: string;
  /** Enabled sources; strategies watch only what the admin chose. */
  sources: NightshiftSource[];
  /** Reads the customer's data as the user, across CPS-linked projects. */
  dataEsClient: ElasticsearchClient;
  /** Knowledge indicator queries of the enabled sources, read once per run. */
  getQueryLinks: () => Promise<QueryLink[]>;
  /** Detectors the learning loop wrote that are in trial or live. */
  getLearnedDetectors: () => Promise<RunningDetector[]>;
  signal: AbortSignal;
  logger: Logger;
}

/** One live evaluation over the settled buckets [from, to). */
export interface StrategyContext extends BaseStrategyContext {
  from: number;
  to: number;
  /** Reads the customer's alert indices as the user. */
  userEsClient: ElasticsearchClient;
  /** Reads what Alerting v2 rules wrote. */
  ruleEvents: IRuleEventsReader;
  /** Rules the engine owns for this strategy, from the last reconciliation. */
  ownedRules: OwnedRule[];
  /** Past observations, for checks that compare with recent history. */
  records: IRecordsStore;
  /** Most rows to read from `.rule-events` in this evaluation. */
  maxRows: number;
}

/** A replay over past buckets [from, to), run with direct queries because rules never backfill. */
export interface ReplayContext extends BaseStrategyContext {
  from: number;
  to: number;
}

/** What a strategy reports for one evaluation. */
export interface StrategyEvaluation {
  observations: StrategyObservation[];
  /** Things the strategy could not do, such as a source without the fields it needs. */
  notes: string[];
  /** True when reading stopped at the per-run cap. */
  truncated?: boolean;
  /** How many rules the evaluation read from. */
  watchedRules?: number;
}

/** What building a strategy's rules needs. */
export interface RuleSpecContext {
  spaceId: string;
  sources: NightshiftSource[];
  dataEsClient: ElasticsearchClient;
  /** Rule queries must route to every linked project when cross-project search is on. */
  cpsEnabled: boolean;
  /** Knowledge indicator queries of the enabled sources. */
  getQueryLinks: () => Promise<QueryLink[]>;
  /** Detectors the learning loop wrote that are in trial or live. */
  getLearnedDetectors: () => Promise<RunningDetector[]>;
  signal: AbortSignal;
}

/** An Alerting v2 rule the engine wants to exist, with the id derived from its definition. */
export interface DesiredRule {
  rule_id: string;
  source_id: string;
  data: CreateRuleData;
  /** What the strategy needs to read the rule's rows back, such as the error condition used. */
  meta?: Record<string, string>;
}

/** The rules a strategy needs, and the sources it cannot watch. */
export interface DesiredRules {
  rules: DesiredRule[];
  skipped: Array<{ source_id: string; reason: string }>;
}

/**
 * A detection strategy: one way of finding that something may be wrong. It watches data or
 * alerts and reports what looks off. It never decides whether a detection becomes an event.
 */
export interface IDetectionStrategy {
  descriptor: DetectionStrategyDescriptor;
  /** Reports an observation for every series it evaluated in every bucket of [from, to). */
  evaluate(context: StrategyContext): Promise<StrategyEvaluation>;
  /** Evaluates past buckets directly, to seed baselines and to trial the strategy. */
  replay?(context: ReplayContext): Promise<StrategyEvaluation>;
  /** The Alerting v2 rules this strategy runs on, when the engine owns them. */
  desiredRules?(context: RuleSpecContext): Promise<DesiredRules>;
}
