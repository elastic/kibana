/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { EngineConfig, StrategyRunSummary } from '../../../common';
import { BUCKET_MS } from '../../../common';
import type { OwnedRule, TaggedObservation } from '../domain';
import { getErrorMessage } from '../errors';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { RunningDetector } from '../strategies/types';
import type { ICustomerRuleKnowledge } from '../knowledge/customer_rules';
import type { IEngineScope } from './engine_scope';
import type { StrategyWindow } from './plan_windows';
import type { IRunRecorder } from './run_recorder';

/** What every strategy reported, and which windows actually got evaluated. */
export interface StrategiesResult {
  observations: TaggedObservation[];
  /** Windows of strategies that ran; a failed strategy is absent and its watermark stays. */
  evaluated: StrategyWindow[];
  summaries: StrategyRunSummary[];
  /** Rules each strategy read, for the rules overview. */
  watchedRules: Partial<Record<string, number>>;
}

/**
 * Runs every planned strategy over its window, in parallel. A failing strategy never stops the
 * others; it is reported, and evaluates the same window again on the next run.
 */
export async function evaluateStrategies({
  scope,
  config,
  windows,
  sources,
  ownedRules,
  getQueryLinks,
  getLearnedDetectors,
  recorder,
  signal,
  backtest = false,
  now,
  customerRules,
}: {
  /** Knowledge from customer rules, for the customer alerts strategy. */
  customerRules?: ICustomerRuleKnowledge;
  scope: IEngineScope;
  config: EngineConfig;
  windows: StrategyWindow[];
  sources: NightshiftSource[];
  ownedRules: OwnedRule[];
  getQueryLinks: () => Promise<QueryLink[]>;
  getLearnedDetectors: () => Promise<RunningDetector[]>;
  recorder: IRunRecorder;
  signal: AbortSignal;
  /**
   * Evaluates past minutes with each strategy's direct query, because rules never backfill.
   * Everything after evaluation is the same pipeline a live run uses.
   */
  backtest?: boolean;
  /** The run's clock, which decides which minutes are still inside a rule's live window. */
  now: number;
}): Promise<StrategiesResult> {
  const rowsPerStrategy = Math.max(1, Math.floor(scope.limits.maxRuleEventRows / windows.length));
  const results = await Promise.all(
    windows.map(async (window) => {
      const strategy = STRATEGIES[window.strategy];
      const started = Date.now();
      const base = {
        strategy: window.strategy,
        mode: config.strategies[window.strategy].mode,
        buckets: Math.round((window.to - window.from) / BUCKET_MS),
        skipped_minutes: window.skippedMinutes || undefined,
      };
      try {
        const replayContext = (from: number, to: number) => ({
          spaceId: scope.spaceId,
          sources,
          dataEsClient: scope.dataEsClient,
          getQueryLinks,
          getLearnedDetectors,
          from,
          to,
          signal,
          logger: scope.logger,
          records: scope.storage.records,
        });
        const liveContext = (from: number) => ({
          ...replayContext(from, window.to),
          userEsClient: scope.userEsClient,
          ruleEvents: scope.ruleEvents,
          ownedRules: ownedRules.filter((rule) => rule.strategy === window.strategy),
          records: scope.storage.records,
          state: scope.storage.state,
          maxRows: rowsPerStrategy,
          customerRules,
          customerV2Rules: async (ids: string[]) => {
            const rules = ids.length > 0 ? await (await scope.getRulesClient()).getRules(ids) : [];
            return new Map(
              rules.map((rule) => [
                rule.id,
                {
                  rule_uuid: rule.id,
                  name: rule.metadata.name,
                  rule_type_id: `alerting_v2.${rule.kind}`,
                  tags: rule.metadata.tags ?? [],
                  parameters: { query: rule.query, grouping: rule.grouping },
                },
              ])
            );
          },
        });
        // Minutes older than the rule's live window may have no rule output at all, because
        // the platform was down or late; they are evaluated directly, from the data itself.
        const { liveWindowMs } = strategy.descriptor;
        const cut =
          backtest || !strategy.replay
            ? window.from
            : liveWindowMs === undefined
            ? window.from
            : Math.min(
                window.to,
                Math.max(window.from, Math.floor((now - liveWindowMs) / BUCKET_MS) * BUCKET_MS)
              );
        const parts = await Promise.all([
          backtest && strategy.replay
            ? strategy.replay(replayContext(window.from, window.to))
            : cut > window.from
            ? strategy.replay!(replayContext(window.from, cut))
            : undefined,
          !backtest && cut < window.to ? strategy.evaluate(liveContext(cut)) : undefined,
        ]);
        const evaluation = {
          observations: parts.flatMap((part) => part?.observations ?? []),
          notes: [
            ...parts.flatMap((part) => part?.notes ?? []),
            ...(cut > window.from && !backtest
              ? [
                  `${Math.round(
                    (cut - window.from) / BUCKET_MS
                  )} minute(s) were older than the rule output can be trusted for, so they were evaluated directly from the data.`,
                ]
              : []),
          ],
          truncated: parts.some((part) => part?.truncated),
          watchedRules: parts[1]?.watchedRules,
        };
        evaluation.notes.forEach((note) =>
          recorder.log({
            step: 'strategy',
            action: 'note',
            strategy: window.strategy,
            message: note,
          })
        );
        const visible = evaluation.observations.filter((observation) => !observation.internal);
        const summary: StrategyRunSummary = {
          ...base,
          watermark: new Date(window.to).toISOString(),
          observations: visible.length,
          looked_off: visible.filter((observation) => observation.looks_off).length,
          duration_ms: Date.now() - started,
          truncated: evaluation.truncated || undefined,
        };
        recorder.log({
          step: 'strategy',
          action: 'evaluated',
          strategy: window.strategy,
          message: `${strategy.descriptor.name} (${base.mode}) evaluated ${
            summary.buckets
          } minute(s): ${summary.observations} evaluations, ${summary.looked_off} looked off.${
            window.skippedMinutes
              ? ` It was ${window.skippedMinutes} minute(s) behind and skipped ahead.`
              : ''
          }${evaluation.truncated ? ' Reading stopped at the per-run cap; the rest follows.' : ''}`,
          details: { duration_ms: summary.duration_ms, from: window.from, to: window.to },
        });
        return {
          window,
          summary,
          observations: evaluation.observations.map(
            (observation): TaggedObservation => ({ ...observation, strategy: window.strategy })
          ),
          watchedRules: evaluation.watchedRules,
        };
      } catch (error) {
        const message = getErrorMessage(error);
        recorder.log({
          step: 'strategy',
          action: 'failed',
          strategy: window.strategy,
          message: `${strategy.descriptor.name} failed; it evaluates the same minutes on the next run: ${message}`,
        });
        return {
          window: undefined,
          summary: {
            ...base,
            observations: 0,
            looked_off: 0,
            duration_ms: Date.now() - started,
            error: message,
          },
          observations: [],
          watchedRules: undefined,
        };
      }
    })
  );

  return {
    observations: results.flatMap((result) => result.observations),
    evaluated: results.flatMap((result) => (result.window ? [result.window] : [])),
    summaries: results.map((result) => result.summary),
    watchedRules: Object.fromEntries(
      results.flatMap((result) =>
        result.watchedRules === undefined ? [] : [[result.summary.strategy, result.watchedRules]]
      )
    ),
  };
}
