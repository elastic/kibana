/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
} from '@kbn/alerting-plugin/common';
import type { RuleTagArray } from '../../../../api/detection_engine/model/rule_schema';

/**
 * Drops tags managed by the Alerting Framework so they aren't treated as user customizations.
 */
export function normalizeTags(tags?: RuleTagArray): RuleTagArray {
  return (tags ?? []).filter((tag) => !SYSTEM_MANAGED_TAGS.has(tag));
}

const SYSTEM_MANAGED_TAGS: ReadonlySet<string> = new Set([
  MISSING_UIAM_API_KEY_TAG,
  LEGACY_MISSING_UIAM_API_KEY_TAG,
]);
