/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Correlation rule type definitions — kept outside rule_schemas.gen.ts because
 * `yarn openapi:generate` would strip them (no OpenAPI spec exists for
 * correlation rules yet). This file also re-exports augmented discriminated
 * unions that include the correlation variant so every consumer gets the full
 * set of rule types through the barrel.
 */

import { z } from '@kbn/zod/v4';

import { RuleQuery, AlertSuppression } from './common_attributes.gen';
import {
  SharedCreateProps,
  SharedUpdateProps,
  SharedPatchProps,
  SharedResponseProps,
  EqlRuleCreateFields,
  EqlRulePatchFields,
  EqlRuleResponseFields,
  EqlRule,
  EqlRuleCreateProps,
  EqlRuleUpdateProps,
  EqlRulePatchProps,
  QueryRuleCreateFields,
  QueryRulePatchFields,
  QueryRuleResponseFields,
  QueryRule,
  QueryRuleCreateProps,
  QueryRuleUpdateProps,
  QueryRulePatchProps,
  SavedQueryRuleCreateFields,
  SavedQueryRulePatchFields,
  SavedQueryRuleResponseFields,
  SavedQueryRule,
  SavedQueryRuleCreateProps,
  SavedQueryRuleUpdateProps,
  SavedQueryRulePatchProps,
  ThresholdRuleCreateFields,
  ThresholdRulePatchFields,
  ThresholdRuleResponseFields,
  ThresholdRule,
  ThresholdRuleCreateProps,
  ThresholdRuleUpdateProps,
  ThresholdRulePatchProps,
  ThreatMatchRuleCreateFields,
  ThreatMatchRulePatchFields,
  ThreatMatchRuleResponseFields,
  ThreatMatchRule,
  ThreatMatchRuleCreateProps,
  ThreatMatchRuleUpdateProps,
  ThreatMatchRulePatchProps,
  MachineLearningRuleCreateFields,
  MachineLearningRulePatchFields,
  MachineLearningRuleResponseFields,
  MachineLearningRule,
  MachineLearningRuleCreateProps,
  MachineLearningRuleUpdateProps,
  MachineLearningRulePatchProps,
  NewTermsRuleCreateFields,
  NewTermsRulePatchFields,
  NewTermsRuleResponseFields,
  NewTermsRule,
  NewTermsRuleCreateProps,
  NewTermsRuleUpdateProps,
  NewTermsRulePatchProps,
  EsqlRuleCreateFields,
  EsqlRulePatchFields,
  EsqlRuleResponseFields,
  EsqlRule,
  EsqlRuleCreateProps,
  EsqlRuleUpdateProps,
  EsqlRulePatchProps,
} from './rule_schemas.gen';

// ---------------------------------------------------------------------------
// Correlation rule type schemas
// ---------------------------------------------------------------------------

export type CorrelationRequiredFields = z.infer<typeof CorrelationRequiredFields>;
export const CorrelationRequiredFields = z.object({
  type: z.literal('correlation'),
  language: z.literal('esql'),
  query: RuleQuery,
  correlation: z.object({
    rules: z.array(z.string()).min(1),
    type: z.enum(['temporal', 'temporal_ordered', 'event_count', 'value_count']),
    group_by: z.array(z.string()).min(1),
    timespan: z.string(),
    condition: z
      .object({
        operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']),
        value: z.number(),
        field: z.string().optional(),
      })
      .optional(),
    aliases: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  }),
});

export type CorrelationOptionalFields = z.infer<typeof CorrelationOptionalFields>;
export const CorrelationOptionalFields = z.object({
  alert_suppression: AlertSuppression.optional(),
});

export type CorrelationRulePatchFields = z.infer<typeof CorrelationRulePatchFields>;
export const CorrelationRulePatchFields = CorrelationOptionalFields.merge(
  CorrelationRequiredFields.partial()
);

export type CorrelationRuleResponseFields = z.infer<typeof CorrelationRuleResponseFields>;
export const CorrelationRuleResponseFields =
  CorrelationOptionalFields.merge(CorrelationRequiredFields);

export type CorrelationRuleCreateFields = z.infer<typeof CorrelationRuleCreateFields>;
export const CorrelationRuleCreateFields =
  CorrelationOptionalFields.merge(CorrelationRequiredFields);

export type CorrelationRule = z.infer<typeof CorrelationRule>;
export const CorrelationRule = SharedResponseProps.merge(CorrelationRuleResponseFields);

export type CorrelationRuleCreateProps = z.infer<typeof CorrelationRuleCreateProps>;
export const CorrelationRuleCreateProps = SharedCreateProps.merge(CorrelationRuleCreateFields);

export type CorrelationRuleUpdateProps = z.infer<typeof CorrelationRuleUpdateProps>;
export const CorrelationRuleUpdateProps = SharedUpdateProps.merge(CorrelationRuleCreateFields);

export type CorrelationRulePatchProps = z.infer<typeof CorrelationRulePatchProps>;
export const CorrelationRulePatchProps = SharedPatchProps.merge(CorrelationRulePatchFields);

// ---------------------------------------------------------------------------
// Augmented discriminated unions — include correlation alongside the gen types
// ---------------------------------------------------------------------------

export const TypeSpecificCreatePropsInternal = z.discriminatedUnion('type', [
  EqlRuleCreateFields,
  QueryRuleCreateFields,
  SavedQueryRuleCreateFields,
  ThresholdRuleCreateFields,
  ThreatMatchRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  EsqlRuleCreateFields,
  CorrelationRuleCreateFields,
]);

export type TypeSpecificCreateProps = z.infer<typeof TypeSpecificCreatePropsInternal>;
export const TypeSpecificCreateProps =
  TypeSpecificCreatePropsInternal as z.ZodType<TypeSpecificCreateProps>;

export const TypeSpecificPatchPropsInternal = z.union([
  EqlRulePatchFields,
  QueryRulePatchFields,
  SavedQueryRulePatchFields,
  ThresholdRulePatchFields,
  ThreatMatchRulePatchFields,
  MachineLearningRulePatchFields,
  NewTermsRulePatchFields,
  EsqlRulePatchFields,
  CorrelationRulePatchFields,
]);

export type TypeSpecificPatchProps = z.infer<typeof TypeSpecificPatchPropsInternal>;
export const TypeSpecificPatchProps =
  TypeSpecificPatchPropsInternal as z.ZodType<TypeSpecificPatchProps>;

export const TypeSpecificResponseInternal = z.discriminatedUnion('type', [
  EqlRuleResponseFields,
  QueryRuleResponseFields,
  SavedQueryRuleResponseFields,
  ThresholdRuleResponseFields,
  ThreatMatchRuleResponseFields,
  MachineLearningRuleResponseFields,
  NewTermsRuleResponseFields,
  EsqlRuleResponseFields,
  CorrelationRuleResponseFields,
]);

export type TypeSpecificResponse = z.infer<typeof TypeSpecificResponseInternal>;
export const TypeSpecificResponse = TypeSpecificResponseInternal as z.ZodType<TypeSpecificResponse>;

export const RuleCreatePropsInternal = z.discriminatedUnion('type', [
  EqlRuleCreateProps,
  QueryRuleCreateProps,
  SavedQueryRuleCreateProps,
  ThresholdRuleCreateProps,
  ThreatMatchRuleCreateProps,
  MachineLearningRuleCreateProps,
  NewTermsRuleCreateProps,
  EsqlRuleCreateProps,
  CorrelationRuleCreateProps,
]);

export type RuleCreateProps = z.infer<typeof RuleCreatePropsInternal>;
export const RuleCreateProps = RuleCreatePropsInternal as z.ZodType<RuleCreateProps>;

export const RuleUpdatePropsInternal = z.discriminatedUnion('type', [
  EqlRuleUpdateProps,
  QueryRuleUpdateProps,
  SavedQueryRuleUpdateProps,
  ThresholdRuleUpdateProps,
  ThreatMatchRuleUpdateProps,
  MachineLearningRuleUpdateProps,
  NewTermsRuleUpdateProps,
  EsqlRuleUpdateProps,
  CorrelationRuleUpdateProps,
]);

export type RuleUpdateProps = z.infer<typeof RuleUpdatePropsInternal>;
export const RuleUpdateProps = RuleUpdatePropsInternal as z.ZodType<RuleUpdateProps>;

export const RulePatchPropsInternal = z.union([
  EqlRulePatchProps,
  QueryRulePatchProps,
  SavedQueryRulePatchProps,
  ThresholdRulePatchProps,
  ThreatMatchRulePatchProps,
  MachineLearningRulePatchProps,
  NewTermsRulePatchProps,
  EsqlRulePatchProps,
  CorrelationRulePatchProps,
]);

export type RulePatchProps = z.infer<typeof RulePatchPropsInternal>;
export const RulePatchProps = RulePatchPropsInternal as z.ZodType<RulePatchProps>;

export const RuleResponseInternal = z.discriminatedUnion('type', [
  EqlRule,
  QueryRule,
  SavedQueryRule,
  ThresholdRule,
  ThreatMatchRule,
  MachineLearningRule,
  NewTermsRule,
  EsqlRule,
  CorrelationRule,
]);

export type RuleResponse = z.infer<typeof RuleResponseInternal>;
export const RuleResponse = RuleResponseInternal as z.ZodType<RuleResponse>;
