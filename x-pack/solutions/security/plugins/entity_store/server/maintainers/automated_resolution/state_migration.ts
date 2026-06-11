/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';
import { STAGE_0_RULE_IDS } from './rules_config';
import type { AutomatedResolutionState, PerRuleState } from './types';

type RawState = Record<string, unknown>;

const OLD_STATE_FIELDS = new Set(['lastProcessedTimestamp', 'lastRun', 'rules']);
const PER_RULE_STATE_FIELDS = new Set(['lastProcessedTimestamp', 'lastRun']);

const isRecord = (value: unknown): value is RawState =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: RawState, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

function copyUnknownFields(source: RawState, knownFields: Set<string>): RawState {
  const output: RawState = {};
  for (const [key, value] of Object.entries(source)) {
    if (!knownFields.has(key)) {
      output[key] = value;
    }
  }
  return output;
}

function normalizeTimestamp(value: unknown, fieldPath: string, logger: Logger): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  logger.warn(
    `Dropping malformed automated-resolution timestamp at ${fieldPath}: ${String(value)}`
  );
  return null;
}

function normalizeLastRun(
  value: unknown,
  fieldPath: string,
  logger: Logger
): PerRuleState['lastRun'] {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    logger.warn(`Dropping malformed automated-resolution lastRun at ${fieldPath}`);
    return null;
  }
  const { resolutionsCreated, skippedAmbiguousBuckets } = value;
  if (
    typeof resolutionsCreated !== 'number' ||
    !Number.isFinite(resolutionsCreated) ||
    typeof skippedAmbiguousBuckets !== 'number' ||
    !Number.isFinite(skippedAmbiguousBuckets)
  ) {
    logger.warn(`Dropping malformed automated-resolution lastRun at ${fieldPath}`);
    return null;
  }
  const unknownFields = copyUnknownFields(
    value,
    new Set(['resolutionsCreated', 'skippedAmbiguousBuckets'])
  );
  return {
    ...(unknownFields as Record<string, unknown>),
    resolutionsCreated,
    skippedAmbiguousBuckets,
  } as PerRuleState['lastRun'];
}

function normalizeRuleState(
  value: unknown,
  ruleId: string,
  fallback: PerRuleState,
  logger: Logger
): PerRuleState {
  if (!isRecord(value)) {
    return fallback;
  }
  const unknownFields = copyUnknownFields(value, PER_RULE_STATE_FIELDS);
  const lastProcessedTimestamp = hasOwn(value, 'lastProcessedTimestamp')
    ? normalizeTimestamp(
        value.lastProcessedTimestamp,
        `rules.${ruleId}.lastProcessedTimestamp`,
        logger
      )
    : fallback.lastProcessedTimestamp;
  const lastRun = hasOwn(value, 'lastRun')
    ? normalizeLastRun(value.lastRun, `rules.${ruleId}.lastRun`, logger)
    : fallback.lastRun;
  return {
    ...(unknownFields as Record<string, unknown>),
    lastProcessedTimestamp,
    lastRun,
  } as PerRuleState;
}

/**
 * Migrate persisted maintainer state from the 9.4 single-rule shape to the
 * Stage-0 per-rule nested shape.  Idempotent — safe to call on already-migrated state.
 *
 * Old shape (9.4):  `{ lastProcessedTimestamp: T, lastRun: {...} }`
 * New shape (9.5+): `{ rules: { S1: { lastProcessedTimestamp: T, lastRun: {...} }, ... } }`
 */
export function migrateAutomatedResolutionState(
  input: EntityMaintainerState,
  logger: Logger
): AutomatedResolutionState {
  const source: RawState = isRecord(input) ? (input as RawState) : {};

  const oldS1State: PerRuleState = {
    lastProcessedTimestamp: hasOwn(source, 'lastProcessedTimestamp')
      ? normalizeTimestamp(source.lastProcessedTimestamp, 'lastProcessedTimestamp', logger)
      : null,
    lastRun: hasOwn(source, 'lastRun') ? normalizeLastRun(source.lastRun, 'lastRun', logger) : null,
  };

  const rulesSource: RawState = isRecord(source.rules) ? (source.rules as RawState) : {};

  const rules = STAGE_0_RULE_IDS.reduce<AutomatedResolutionState['rules']>((acc, ruleId) => {
    const fallback: PerRuleState =
      ruleId === 'S1' ? oldS1State : { lastProcessedTimestamp: null, lastRun: null };
    acc[ruleId] = normalizeRuleState(rulesSource[ruleId], ruleId, fallback, logger);
    return acc;
  }, {} as AutomatedResolutionState['rules']);

  return {
    ...copyUnknownFields(source, OLD_STATE_FIELDS),
    rules,
  } as AutomatedResolutionState;
}
