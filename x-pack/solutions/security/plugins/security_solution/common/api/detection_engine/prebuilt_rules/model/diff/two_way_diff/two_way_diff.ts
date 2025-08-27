/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
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

export type TwoWayDiffCommonFields = z.infer<typeof TwoWayDiffCommonFields>;
export const TwoWayDiffCommonFields = BaseResponseProps.omit({
  actions: true,
  exceptions_list: true,
  enabled: true,
  author: true,
  license: true,
  response_actions: true,
  throttle: true,
  outcome: true,
  alias_purpose: true,
  alias_target_id: true,
  output_index: true,
  meta: true,
  namespace: true,
});

export type TwoWayDiffCustomQueryFields = z.infer<typeof TwoWayDiffCustomQueryFields>;
export const TwoWayDiffCustomQueryFields = QueryRuleResponseFields;

export type TwoWayDiffSavedQueryFields = z.infer<typeof TwoWayDiffSavedQueryFields>;
export const TwoWayDiffSavedQueryFields = SavedQueryRuleResponseFields;

export type TwoWayDiffEqlFields = z.infer<typeof TwoWayDiffEqlFields>;
export const TwoWayDiffEqlFields = EqlRuleResponseFields;

export type TwoWayDiffEsqlFields = z.infer<typeof TwoWayDiffEsqlFields>;
export const TwoWayDiffEsqlFields = EsqlRuleResponseFields;

export type TwoWayDiffThreatMatchFields = z.infer<typeof TwoWayDiffThreatMatchFields>;
export const TwoWayDiffThreatMatchFields = ThreatMatchRuleResponseFields.omit({
  concurrent_searches: true,
  items_per_search: true,
});

export type TwoWayDiffThresholdFields = z.infer<typeof TwoWayDiffThresholdFields>;
export const TwoWayDiffThresholdFields = ThresholdRuleResponseFields;

export type TwoWayDiffMachineLearningFields = z.infer<typeof TwoWayDiffMachineLearningFields>;
export const TwoWayDiffMachineLearningFields = MachineLearningRuleResponseFields;

export type TwoWayDiffNewTermsFields = z.infer<typeof TwoWayDiffNewTermsFields>;
export const TwoWayDiffNewTermsFields = NewTermsRuleResponseFields;

export const TwoWayDiffFieldsByTypeUnion = z.discriminatedUnion('type', [
  TwoWayDiffCustomQueryFields,
  TwoWayDiffSavedQueryFields,
  TwoWayDiffEqlFields,
  TwoWayDiffEsqlFields,
  TwoWayDiffThreatMatchFields,
  TwoWayDiffThresholdFields,
  TwoWayDiffMachineLearningFields,
  TwoWayDiffNewTermsFields,
]);

export type TwoWayDiffFields = z.infer<typeof TwoWayDiffFields>;
export const TwoWayDiffFields = z.union([
  TwoWayDiffCommonFields,
  TwoWayDiffCustomQueryFields,
  TwoWayDiffSavedQueryFields,
  TwoWayDiffEqlFields,
  TwoWayDiffEsqlFields,
  TwoWayDiffThreatMatchFields,
  TwoWayDiffThresholdFields,
  TwoWayDiffMachineLearningFields,
  TwoWayDiffNewTermsFields,
]);

type KeysOfUnion<T> = T extends unknown ? keyof T : never;

export type TwoWayDiffFieldsUnion =
  | TwoWayDiffCommonFields
  | TwoWayDiffCustomQueryFields
  | TwoWayDiffSavedQueryFields
  | TwoWayDiffEqlFields
  | TwoWayDiffEsqlFields
  | TwoWayDiffThreatMatchFields
  | TwoWayDiffThresholdFields
  | TwoWayDiffMachineLearningFields
  | TwoWayDiffNewTermsFields;

export type TwoWayDiffKeys = KeysOfUnion<TwoWayDiffFieldsUnion>;

export type TwoWayDiffRule = z.infer<typeof TwoWayDiffRule>;
export const TwoWayDiffRule = z.intersection(TwoWayDiffCommonFields, TwoWayDiffFieldsByTypeUnion);
