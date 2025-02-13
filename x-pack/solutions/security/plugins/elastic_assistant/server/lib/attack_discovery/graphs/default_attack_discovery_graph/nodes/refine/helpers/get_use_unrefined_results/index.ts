/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Note: the conditions tested here are different than the generate node
 */
export const getUseUnrefinedResults = ({
  maxHallucinationFailuresReached,
  maxRetriesReached,
}: {
  maxHallucinationFailuresReached: boolean;
  maxRetriesReached: boolean;
}): boolean => maxRetriesReached || maxHallucinationFailuresReached; // we may have reached max halucination failures, but we still want to use the unrefined results
