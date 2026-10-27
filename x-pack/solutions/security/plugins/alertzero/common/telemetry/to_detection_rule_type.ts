/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionRuleType } from './constants';
import { DETECTION_RULE_TYPES } from './constants';

const RENAMED_RULE_TYPES: Readonly<Record<string, DetectionRuleType>> = {
  machine_learning: 'ml',
  saved_query: 'query',
};

const isDetectionRuleType = (value: string): value is DetectionRuleType =>
  (DETECTION_RULE_TYPES as readonly string[]).includes(value);

/** Maps a detection rule's own `type` to the #19891 vocabulary; any other text is `other`. */
export const toDetectionRuleType = (value: unknown): unknown => {
  if (typeof value !== 'string' || value === '') {
    return value === '' || value === null ? undefined : value;
  }
  return RENAMED_RULE_TYPES[value] ?? (isDetectionRuleType(value) ? value : 'other');
};
