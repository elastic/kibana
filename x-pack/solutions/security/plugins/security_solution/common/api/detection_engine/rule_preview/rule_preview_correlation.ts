/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Augmented RulePreviewRequestBody that includes the correlation rule type.
 * Kept outside rule_preview.gen.ts because openapi:generate strips it.
 */

import { z } from '@kbn/zod/v4';

import {
  EqlRuleCreateProps,
  QueryRuleCreateProps,
  SavedQueryRuleCreateProps,
  ThresholdRuleCreateProps,
  ThreatMatchRuleCreateProps,
  MachineLearningRuleCreateProps,
  NewTermsRuleCreateProps,
  EsqlRuleCreateProps,
} from '../model/rule_schema/rule_schemas.gen';
import { CorrelationRuleCreateProps } from '../model/rule_schema/rule_schemas_correlation';
import { RulePreviewParams } from './rule_preview.gen';

export type RulePreviewRequestBody = z.infer<typeof RulePreviewRequestBody>;
export const RulePreviewRequestBody = z.discriminatedUnion('type', [
  EqlRuleCreateProps.merge(RulePreviewParams),
  QueryRuleCreateProps.merge(RulePreviewParams),
  SavedQueryRuleCreateProps.merge(RulePreviewParams),
  ThresholdRuleCreateProps.merge(RulePreviewParams),
  ThreatMatchRuleCreateProps.merge(RulePreviewParams),
  MachineLearningRuleCreateProps.merge(RulePreviewParams),
  NewTermsRuleCreateProps.merge(RulePreviewParams),
  EsqlRuleCreateProps.merge(RulePreviewParams),
  CorrelationRuleCreateProps.merge(RulePreviewParams),
]);
export type RulePreviewRequestBodyInput = z.input<typeof RulePreviewRequestBody>;
