/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DiffableAllFields,
  DiffableCommonFields,
  DiffableCustomQueryFields,
  DiffableEqlFields,
  DiffableEsqlFields,
  DiffableMachineLearningFields,
  DiffableNewTermsFields,
  DiffableSavedQueryFields,
  DiffableThreatMatchFields,
  DiffableThresholdFields,
} from '../diffable_rule/diffable_rule';

import type { FieldsDiff } from './fields_diff';

export type AllThreeWayFieldsDiff = FieldsDiff<DiffableAllFields>;
export type CommonThreeWayFieldsDiff = FieldsDiff<DiffableCommonFields>;
export type CustomQueryThreeWayFieldsDiff = FieldsDiff<DiffableCustomQueryFields>;
export type SavedQueryThreeWayFieldsDiff = FieldsDiff<DiffableSavedQueryFields>;
export type EqlThreeWayFieldsDiff = FieldsDiff<DiffableEqlFields>;
export type EsqlThreeWayFieldsDiff = FieldsDiff<DiffableEsqlFields>;
export type ThreatMatchThreeWayFieldsDiff = FieldsDiff<DiffableThreatMatchFields>;
export type ThresholdThreeWayFieldsDiff = FieldsDiff<DiffableThresholdFields>;
export type MachineLearningThreeWayFieldsDiff = FieldsDiff<DiffableMachineLearningFields>;
export type NewTermsThreeWayFieldsDiff = FieldsDiff<DiffableNewTermsFields>;

/**
 * It's an object which keys are the same as keys of DiffableRule, but values are
 * three-way diffs calculated for their values.
 *
 * @example
 * {
 *   name: ThreeWayDiff<RuleName>;
 *   tags: ThreeWayDiff<RuleTagArray>;
 *   // etc
 * }
 */
export type ThreeWayRuleFieldsDiff = CommonThreeWayFieldsDiff &
  (
    | CustomQueryThreeWayFieldsDiff
    | SavedQueryThreeWayFieldsDiff
    | EqlThreeWayFieldsDiff
    | EsqlThreeWayFieldsDiff
    | ThreatMatchThreeWayFieldsDiff
    | ThresholdThreeWayFieldsDiff
    | MachineLearningThreeWayFieldsDiff
    | NewTermsThreeWayFieldsDiff
  );

interface BaseRuleDiff {
  num_fields_with_updates: number;
  num_fields_with_conflicts: number;
  num_fields_with_non_solvable_conflicts: number;
}
/**
 * Full rule diff contains diffs for all the top-level rule fields.
 * Even if there's no change at all to a given field, its diff will be included in this object.
 * This diff can be useful for internal server-side calculations or debugging.
 * Note that this is a pretty large object so returning it from the API might be undesirable.
 */
export interface FullThreeWayRuleDiff extends BaseRuleDiff {
  fields: ThreeWayRuleFieldsDiff;
}

/**
 * Partial rule diff contains diffs only for those rule fields that have some changes to them.
 * This diff can be useful for returning info from REST API endpoints because its size is tolerable.
 */
export interface PartialThreeWayRuleDiff extends BaseRuleDiff {
  fields: Partial<ThreeWayRuleFieldsDiff>;
}

export type RuleFieldsDiffWithDataSource =
  | CustomQueryThreeWayFieldsDiff
  | SavedQueryThreeWayFieldsDiff
  | EqlThreeWayFieldsDiff
  | ThreatMatchThreeWayFieldsDiff
  | ThresholdThreeWayFieldsDiff
  | NewTermsThreeWayFieldsDiff;

export type RuleFieldsDiffWithKqlQuery =
  | CustomQueryThreeWayFieldsDiff
  | SavedQueryThreeWayFieldsDiff
  | ThreatMatchThreeWayFieldsDiff
  | ThresholdThreeWayFieldsDiff
  | NewTermsThreeWayFieldsDiff;

export type RuleFieldsDiffWithEqlQuery = EqlThreeWayFieldsDiff;

export type RuleFieldsDiffWithEsqlQuery = EsqlThreeWayFieldsDiff;

export type RuleFieldsDiffWithThreatQuery = ThreatMatchThreeWayFieldsDiff;

export type RuleFieldsDiffWithThreshold = ThresholdThreeWayFieldsDiff;
