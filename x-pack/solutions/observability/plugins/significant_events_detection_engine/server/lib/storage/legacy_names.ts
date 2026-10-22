/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineConfig, EngineEvent, SignalStrategyId } from '../../../common';

/**
 * Builds before the rename to signal strategies stored the known failure queries strategy as
 * `ki_rules` and a member's latest signal as `latest_detection_id`. Reads map them to the current
 * names, so a space keeps its settings and open events across the upgrade.
 */
const LEGACY_STRATEGY_IDS: Record<string, SignalStrategyId> = {
  ki_rules: 'known_failure_queries',
};

/** The current id of a strategy id read from storage. */
export function currentStrategyId(id: string): SignalStrategyId {
  return LEGACY_STRATEGY_IDS[id] ?? (id as SignalStrategyId);
}

/** Renames legacy keys of a record keyed by strategy id, keeping a current key when both exist. */
export function withCurrentStrategyKeys<TValue>(
  record: Record<string, TValue> | undefined
): Record<string, TValue> | undefined {
  if (!record) {
    return record;
  }
  return Object.entries(record).reduce<Record<string, TValue>>((renamed, [key, value]) => {
    const current = currentStrategyId(key);
    return current !== key && current in record ? renamed : { ...renamed, [current]: value };
  }, {});
}

/** A stored config with legacy strategy ids renamed. */
export function withCurrentConfigNames(
  stored: Partial<EngineConfig> | undefined
): Partial<EngineConfig> | undefined {
  return stored?.strategies
    ? {
        ...stored,
        strategies: withCurrentStrategyKeys(stored.strategies) as EngineConfig['strategies'],
      }
    : stored;
}

/** A stored event with legacy strategy ids and field names renamed. */
export function withCurrentEventNames(event: EngineEvent): EngineEvent {
  return {
    ...event,
    origin_strategy: currentStrategyId(event.origin_strategy),
    members: event.members.map((member) => {
      const { latest_detection_id: legacyId, ...rest } = member as typeof member & {
        latest_detection_id?: string;
      };
      return {
        ...rest,
        strategy: currentStrategyId(member.strategy),
        latest_signal_id: member.latest_signal_id ?? legacyId ?? '',
      };
    }),
  };
}
