/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule public API schemas and types.
 *
 * This barrel collects what neighboring code (routes, client, converter) needs.
 */

export type {
  DetectionRuleResponse,
  DetectionRuleResponseBase,
  CustomQueryRuleTypeFields,
  ThresholdRuleTypeFields,
  DetectionRuleSource,
  DetectionRuleSchedule,
} from './detection_rule_response_schema';
export {
  detectionRuleResponseSchema,
  detectionRuleResponseBaseSchema,
  customQueryRuleTypeFieldsSchema,
  thresholdRuleTypeFieldsSchema,
  detectionRuleSourceSchema,
  detectionRuleScheduleSchema,
} from './detection_rule_response_schema';

export type {
  DetectionRuleCreateProps,
  DetectionRuleUpdateProps,
  DetectionRulePatchProps,
  CustomQueryCreateProps,
  ThresholdCreateProps,
} from './detection_rule_request_schemas';
export {
  detectionRuleCreatePropsSchema,
  detectionRuleUpdatePropsSchema,
  detectionRulePatchPropsSchema,
  customQueryCreateSchema,
  thresholdCreateSchema,
} from './detection_rule_request_schemas';

export type { AliasMapEntry, DetectionRuleType } from './rule_alias_map';
export {
  ALIAS_MAP,
  ALIAS_TO_BUILDER_TYPE_ID,
  BUILDER_TYPE_ID_TO_ALIAS,
  detectionRuleTypeSchema,
  assertAliasBijectivity,
} from './rule_alias_map';

export { RULE_DEFAULTS, applyRuleDefaults, applyRuleUpdateDefaults } from './apply_rule_defaults';
