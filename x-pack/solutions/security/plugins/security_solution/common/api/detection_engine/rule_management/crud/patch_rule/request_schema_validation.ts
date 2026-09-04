/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharedPatchRuleRequestBody } from './patch_rule_request_body';

/**
 * Additional validation of the type-independent props that is implemented outside of the schema
 * itself. Type-specific validation happens in `patchTypeSpecificParams`, once the existing rule's
 * type is known and the type-specific fields have been validated against it.
 */
export const validatePatchRuleRequestBody = (rule: SharedPatchRuleRequestBody): string[] => {
  return [...validateId(rule), ...validateTimelineId(rule), ...validateTimelineTitle(rule)];
};

const validateId = (rule: SharedPatchRuleRequestBody): string[] => {
  if (rule.id != null && rule.rule_id != null) {
    return ['both "id" and "rule_id" cannot exist, choose one or the other'];
  } else if (rule.id == null && rule.rule_id == null) {
    return ['either "id" or "rule_id" must be set'];
  } else {
    return [];
  }
};

const validateTimelineId = (rule: SharedPatchRuleRequestBody): string[] => {
  if (rule.timeline_id != null) {
    if (rule.timeline_title == null) {
      return ['when "timeline_id" exists, "timeline_title" must also exist'];
    } else if (rule.timeline_id === '') {
      return ['"timeline_id" cannot be an empty string'];
    } else {
      return [];
    }
  }
  return [];
};

const validateTimelineTitle = (rule: SharedPatchRuleRequestBody): string[] => {
  if (rule.timeline_title != null) {
    if (rule.timeline_id == null) {
      return ['when "timeline_title" exists, "timeline_id" must also exist'];
    } else if (rule.timeline_title === '') {
      return ['"timeline_title" cannot be an empty string'];
    } else {
      return [];
    }
  }
  return [];
};
