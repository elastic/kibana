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

export type RuleDiffCommonFields = z.infer<typeof RuleDiffCommonFields>;
export const RuleDiffCommonFields = BaseResponseProps.omit({
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

export type RuleDiffCustomQueryFields = z.infer<typeof RuleDiffCustomQueryFields>;
export const RuleDiffCustomQueryFields = QueryRuleResponseFields;

export type RuleDiffSavedQueryFields = z.infer<typeof RuleDiffSavedQueryFields>;
export const RuleDiffSavedQueryFields = SavedQueryRuleResponseFields;

export type RuleDiffEqlFields = z.infer<typeof RuleDiffEqlFields>;
export const RuleDiffEqlFields = EqlRuleResponseFields;

export type RuleDiffEsqlFields = z.infer<typeof RuleDiffEsqlFields>;
export const RuleDiffEsqlFields = EsqlRuleResponseFields;

export type RuleDiffThreatMatchFields = z.infer<typeof RuleDiffThreatMatchFields>;
export const RuleDiffThreatMatchFields = ThreatMatchRuleResponseFields.omit({
  concurrent_searches: true,
  items_per_search: true,
});

export type RuleDiffThresholdFields = z.infer<typeof RuleDiffThresholdFields>;
export const RuleDiffThresholdFields = ThresholdRuleResponseFields;

export type RuleDiffMachineLearningFields = z.infer<typeof RuleDiffMachineLearningFields>;
export const RuleDiffMachineLearningFields = MachineLearningRuleResponseFields;

export type RuleDiffNewTermsFields = z.infer<typeof RuleDiffNewTermsFields>;
export const RuleDiffNewTermsFields = NewTermsRuleResponseFields;

export const RuleDiffFieldsByTypeUnion = z.discriminatedUnion('type', [
  RuleDiffCustomQueryFields,
  RuleDiffSavedQueryFields,
  RuleDiffEqlFields,
  RuleDiffEsqlFields,
  RuleDiffThreatMatchFields,
  RuleDiffThresholdFields,
  RuleDiffMachineLearningFields,
  RuleDiffNewTermsFields,
]);

export type RuleDiffFields = z.infer<typeof RuleDiffFields>;
export const RuleDiffFields = z.union([
  RuleDiffCommonFields,
  RuleDiffCustomQueryFields,
  RuleDiffSavedQueryFields,
  RuleDiffEqlFields,
  RuleDiffEsqlFields,
  RuleDiffThreatMatchFields,
  RuleDiffThresholdFields,
  RuleDiffMachineLearningFields,
  RuleDiffNewTermsFields,
]);

export type TwoWayDiffRule = z.infer<typeof TwoWayDiffRule>;
export const TwoWayDiffRule = z.intersection(RuleDiffCommonFields, RuleDiffFieldsByTypeUnion);
