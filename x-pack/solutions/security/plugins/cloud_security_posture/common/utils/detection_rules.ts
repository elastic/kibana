/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CspBenchmarkRuleMetadata } from '@kbn/cloud-security-posture-common/schema/rules/latest';

export const convertRuleTagsToMatchAllKQL = (tags: string[]): string => {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(` AND `)})`;
};

export const convertRuleTagsToMatchAnyKQL = (tags: string[]): string => {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(` OR `)})`;
};

export const getFindingsDetectionRuleSearchTagsFromArrayOfRules = (
  cspBenchmarkRules: CspBenchmarkRuleMetadata[]
): string[] => {
  if (
    !cspBenchmarkRules ||
    !cspBenchmarkRules.some((rule) => rule.benchmark) ||
    !cspBenchmarkRules.some((rule) => rule.benchmark.id)
  ) {
    return [];
  }

  // we can just take the first benchmark id because we Know that the array will ONLY contain 1 kind of id
  const benchmarkIds = cspBenchmarkRules.map((rule) => rule.benchmark.id);
  if (benchmarkIds.length === 0) return [];
  const benchmarkId = benchmarkIds[0];
  const benchmarkRuleNumbers = cspBenchmarkRules.map((rule) => rule.benchmark.rule_number);
  if (benchmarkRuleNumbers.length === 0) return [];
  const benchmarkTagArray = benchmarkRuleNumbers.map(
    (tag) => benchmarkId.replace('_', ' ').toUpperCase() + ' ' + tag
  );
  // we want the tags to only consist of a format like this CIS AWS 1.1.0
  return benchmarkTagArray;
};
