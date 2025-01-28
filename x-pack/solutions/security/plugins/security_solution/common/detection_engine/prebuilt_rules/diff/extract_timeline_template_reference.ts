/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../api/detection_engine/model/rule_schema';
import type { TimelineTemplateReference } from '../../../api/detection_engine/prebuilt_rules';

export const extractTimelineTemplateReference = (
  rule: RuleResponse
): TimelineTemplateReference | undefined => {
  if (rule.timeline_id == null) {
    return undefined;
  }
  return {
    timeline_id: rule.timeline_id,
    timeline_title: rule.timeline_title ?? '',
  };
};
