/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function convertRuleIdsToKQL(ruleIds: string[]): string {
  return `${ruleIds.map((ruleId) => `alert.id: ("alert:${ruleId}")`).join(' OR ')}`;
}

/**
 * Enrich the filter with rule ids
 * @param originalFilter - The original filter
 * @param ruleIds - The rule ids
 * @returns The enriched filter
 */
export const enrichFilterWithRuleIds = (
  originalFilter: string | null | undefined,
  ruleIds?: string[]
) => {
  if (ruleIds === undefined || ruleIds.length === 0) {
    return originalFilter;
  }

  const ruleIdsKQL = convertRuleIdsToKQL(ruleIds);

  if (originalFilter == null || originalFilter.length === 0) {
    return ruleIdsKQL;
  }

  // Just in case of statements OR'ed in the filter wrap it in parentheses
  return `(${originalFilter}) AND (${ruleIdsKQL})`;
};
