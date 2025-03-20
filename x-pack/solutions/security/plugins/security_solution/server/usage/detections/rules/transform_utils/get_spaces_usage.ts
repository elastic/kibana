/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import type { RuleSearchResult } from '../../../types';
import type { SpacesUsage } from '../types';

export const getSpacesUsage = (
  ruleResults: Array<SavedObjectsFindResult<RuleSearchResult>>
): SpacesUsage => {
  const spacesUsageMap = new Map<string, number>();

  // for loop is faster
  for (let i = 0; i < ruleResults.length; i++) {
    const rule = ruleResults[i];

    const space = rule.namespaces?.[0];

    if (space) {
      spacesUsageMap.set(space, (spacesUsageMap.get(space) ?? 0) + 1);
    }
  }

  return {
    total: spacesUsageMap.size,
    rules_in_spaces: Array.from(spacesUsageMap.values()),
  };
};
