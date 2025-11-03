/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BaseResponseProps,
  EqlRuleResponseFields,
  EsqlRuleResponseFields,
  MachineLearningRuleResponseFields,
  NewTermsRuleResponseFields,
  QueryRuleResponseFields,
  SavedQueryRuleResponseFields,
  ThreatMatchRuleResponseFields,
  ThresholdRuleResponseFields,
} from '../../../../model/rule_schema';
import type { TwoWayFieldsDiff } from './two_way_fields_diff';

// Omit non-diffable fields from BaseResponseProps
export type TwoWayRuleDiffCommonFields = Omit<
  BaseResponseProps,
  | 'actions'
  | 'exceptions_list'
  | 'enabled'
  | 'author'
  | 'license'
  | 'response_actions'
  | 'throttle'
  | 'outcome'
  | 'alias_purpose'
  | 'alias_target_id'
  | 'output_index'
  | 'meta'
  | 'namespace'
>;

export type TwoWayRuleDiffCustomQueryFields = QueryRuleResponseFields;
export type TwoWayRuleDiffSavedQueryFields = SavedQueryRuleResponseFields;
export type TwoWayRuleDiffEqlFields = EqlRuleResponseFields;
export type TwoWayRuleDiffEsqlFields = EsqlRuleResponseFields;
export type TwoWayRuleDiffThresholdFields = ThresholdRuleResponseFields;
export type TwoWayRuleDiffMachineLearningFields = MachineLearningRuleResponseFields;
export type TwoWayRuleDiffNewTermsFields = NewTermsRuleResponseFields;

// Omit non-diffable fields from ThreatMatchRuleResponseFields
export type TwoWayRuleDiffThreatMatchFields = Omit<
  ThreatMatchRuleResponseFields,
  'concurrent_searches' | 'items_per_search'
>;

export type TwoWayRuleDiffFieldsByTypeUnion =
  | (TwoWayRuleDiffCustomQueryFields & { type: 'query' })
  | (TwoWayRuleDiffSavedQueryFields & { type: 'saved_query' })
  | (TwoWayRuleDiffEqlFields & { type: 'eql' })
  | (TwoWayRuleDiffEsqlFields & { type: 'esql' })
  | (TwoWayRuleDiffThreatMatchFields & { type: 'threat_match' })
  | (TwoWayRuleDiffThresholdFields & { type: 'threshold' })
  | (TwoWayRuleDiffMachineLearningFields & { type: 'machine_learning' })
  | (TwoWayRuleDiffNewTermsFields & { type: 'new_terms' });

export type TwoWayDiffRule = TwoWayRuleDiffCommonFields & TwoWayRuleDiffFieldsByTypeUnion;

export type TwoWayRuleFieldsDiff = TwoWayFieldsDiff<TwoWayDiffRule>;
