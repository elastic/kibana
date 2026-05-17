/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';

/**
 * Extract the list of changed-field names from a history item, stripping out
 * fields that should never be shown to the user. The source is the
 * `old_values` RFC 7396 merge patch — its top-level keys are exactly the
 * fields that differ between this revision and the previous one.
 */
export const extractChangedFieldNames = (
  item: Pick<RuleHistoryItem, 'old_values'>,
  ignored: ReadonlySet<string>
): string[] => {
  if (!item.old_values) {
    return [];
  }

  return Object.keys(item.old_values).filter((field) => !ignored.has(field));
};
