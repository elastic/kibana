/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesSearch } from '../../../../../../common/api/detection_engine/rule_management';
import { convertRuleSearchTermToKQL } from '../../../../../../common/detection_engine/rule_management/rule_filtering';

/**
 * Combines the KQL filter with search into a unified query.
 */
export const buildGranularRulesKql = ({
  filter,
  search,
}: {
  filter: string | undefined;
  search: GranularRulesSearch | undefined;
}): string | undefined => {
  const parts: string[] = [];
  const trimmedFilter = filter?.trim();

  if (trimmedFilter) {
    parts.push(`(${trimmedFilter})`);
  }

  const mode = search?.mode ?? 'legacy';
  const trimmedSearch = search?.term?.trim();

  if (trimmedSearch && mode === 'legacy') {
    parts.push(`(${convertRuleSearchTermToKQL(trimmedSearch)})`);
  }

  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }

  return parts.join(' AND ');
};
