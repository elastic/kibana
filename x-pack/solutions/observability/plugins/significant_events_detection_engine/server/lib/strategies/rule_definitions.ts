/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { DetectionStrategyId } from '../../../common';
import type { DesiredRule } from './types';

/** Every rule the engine owns carries this tag; reconciliation only ever touches these. */
export const ENGINE_RULE_TAG = 'detection_engine:managed';
export const STRATEGY_TAG_PREFIX = 'detection_engine:strategy:';
export const strategyRuleTag = (strategy: DetectionStrategyId) =>
  `${STRATEGY_TAG_PREFIX}${strategy}`;
// Deliberately not `nightshift:source:<id>`: Significant Events deletes rules with that tag
// that do not back one of its KIs.
export const sourceRuleTag = (sourceId: string) => `detection_engine:source:${sourceId}`;

/** Namespace of the engine's deterministic rule ids. */
const RULE_ID_NAMESPACE = '6a3f2c56-7f4e-4b3e-9a62-1c5d0e8b7a41';
const MAX_RULE_NAME_LENGTH = 256;

/**
 * The same space, strategy, source and query always give the same id, so reconciling twice
 * never creates a second rule, and a changed query gets a new id instead of an in-place edit.
 */
export function computeRuleId({
  spaceId,
  strategy,
  sourceId,
  query,
}: {
  spaceId: string;
  strategy: DetectionStrategyId;
  sourceId: string;
  query: string;
}): string {
  const queryHash = createHash('sha256').update(query).digest('hex');
  return uuidv5(`${spaceId}|${strategy}|${sourceId}|${queryHash}`, RULE_ID_NAMESPACE);
}

/** Routes a rule query to every linked project, as Significant Events' own rules do. */
function withProjectRouting(query: string, cpsEnabled: boolean): string {
  return cpsEnabled ? `SET project_routing="${PROJECT_ROUTING_ALL}";\n${query}` : query;
}

/** A signal rule the engine owns, for one strategy and one source. */
export function buildSignalRule({
  spaceId,
  strategy,
  strategyName,
  source,
  query,
  every,
  lookback,
  groupBy,
  cpsEnabled,
}: {
  spaceId: string;
  strategy: DetectionStrategyId;
  strategyName: string;
  source: NightshiftSource;
  query: string;
  every: string;
  lookback: string;
  groupBy: string[];
  cpsEnabled: boolean;
}): DesiredRule {
  const routed = withProjectRouting(query, cpsEnabled);
  const ruleId = computeRuleId({ spaceId, strategy, sourceId: source.id, query: routed });
  // Names are unique per space; the rule id suffix keeps two sources with one title apart.
  const name = `Detection engine: ${strategyName} on ${source.title}`.slice(
    0,
    MAX_RULE_NAME_LENGTH - 11
  );
  return {
    rule_id: ruleId,
    source_id: source.id,
    data: {
      kind: 'signal',
      metadata: {
        name: `${name} (${ruleId.slice(0, 8)})`,
        description: `Managed by the Significant Events detection engine. It records what the ${strategyName} strategy measures on "${source.title}"; the engine decides what becomes an event. Edits are overwritten.`,
        tags: [ENGINE_RULE_TAG, strategyRuleTag(strategy), sourceRuleTag(source.id)],
      },
      time_field: '@timestamp',
      schedule: { every, lookback },
      query: { base: routed },
      grouping: { fields: groupBy },
    },
  };
}
