/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { EngineConfig } from '../../../common';
import type { EngineRulesRecord } from '../domain';
import type { IEngineScope } from '../engine/engine_scope';
import type { ActivityInput } from '../engine/run_recorder';
import type { RunningDetector } from '../strategies/types';
import { getErrorMessage } from '../errors';
import { computeRulesInputsHash, reconcileRules } from './rule_provisioner';

/** The rules state before the first reconciliation. */
export const EMPTY_RULES_RECORD: EngineRulesRecord = {
  created: 0,
  deleted: 0,
  strategies: [],
  owned: [],
};

/**
 * Reconciles the engine's rules when what they are built from changed, or when the last
 * reconciliation is older than the interval. It runs with the scope's request, so the rules it
 * creates run with that user's API key. A failure is recorded and retried at the next interval;
 * the run carries on with the rules that exist.
 */
export async function ensureRules({
  scope,
  config,
  sources,
  getQueryLinks,
  getLearnedDetectors,
  current,
  force = false,
  signal,
  log,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  sources: NightshiftSource[];
  getQueryLinks: () => Promise<QueryLink[]>;
  getLearnedDetectors: () => Promise<RunningDetector[]>;
  current: EngineRulesRecord | undefined;
  force?: boolean;
  signal: AbortSignal;
  log: (entry: ActivityInput) => void;
}): Promise<EngineRulesRecord> {
  // Unreadable KIs hash as none: the rules are then rebuilt once they can be read again.
  const queryLinks = await getQueryLinks().catch(() => []);
  const detectors = await getLearnedDetectors().catch(() => []);
  const inputsHash = computeRulesInputsHash({
    config,
    sources,
    queryLinks,
    detectors,
    cpsEnabled: scope.cpsEnabled,
  });
  const reconciledAt = current?.reconciled_at ? Date.parse(current.reconciled_at) : 0;
  const due =
    force ||
    current?.inputs_hash !== inputsHash ||
    Date.now() - reconciledAt >= scope.limits.reconcileIntervalMs;
  if (!due && current) {
    return current;
  }

  let record: EngineRulesRecord;
  try {
    record = {
      ...(await reconcileRules({
        rulesClient: await scope.getRulesClient(),
        config,
        context: {
          spaceId: scope.spaceId,
          sources,
          dataEsClient: scope.dataEsClient,
          cpsEnabled: scope.cpsEnabled,
          getQueryLinks: async () => queryLinks,
          getLearnedDetectors: async () => detectors,
          signal,
        },
        previous: current,
        logger: scope.logger,
      })),
      inputs_hash: inputsHash,
    };
  } catch (error) {
    record = {
      ...(current ?? EMPTY_RULES_RECORD),
      reconciled_at: new Date().toISOString(),
      inputs_hash: inputsHash,
      error: getErrorMessage(error),
    };
  }
  await scope.storage.state.put('rules', record);

  const strategyErrors = record.strategies.flatMap((strategy) =>
    strategy.errors.map((error) => `${strategy.strategy}: ${error}`)
  );
  if (record.created > 0 || record.deleted > 0 || record.error || strategyErrors.length > 0) {
    log({
      step: 'rules',
      action: record.error || strategyErrors.length > 0 ? 'reconcile_failed' : 'reconciled',
      message: `Alerting v2 rules reconciled: ${record.created} created, ${
        record.deleted
      } deleted, ${record.owned.length} owned.${record.error ? ` Error: ${record.error}.` : ''}${
        strategyErrors.length > 0 ? ` ${strategyErrors.slice(0, 3).join('; ')}` : ''
      }`,
    });
  }
  return record;
}
