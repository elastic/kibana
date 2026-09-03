/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';

const IGNORE_FIELDS: string[] = [
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'execution_summary',
];

export const getChanges = (
  before: RuleResponse,
  after: RuleResponse,
  addIgnoreFields: Array<keyof RuleResponse> = []
): Array<keyof RuleResponse> => {
  const ignore = new Set<string>([...IGNORE_FIELDS, ...addIgnoreFields]);
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changes: string[] = [];

  for (const key of keys) {
    if (!ignore.has(key) && !isEqual(a[key], b[key])) {
      changes.push(key);
    }
  }

  return changes as Array<keyof RuleResponse>;
};
