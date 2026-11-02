/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuditGold } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads the gold labels from example metadata; undefined when absent or malformed. */
export const getAuditGold = (metadata: unknown): AuditGold | undefined => {
  if (!isRecord(metadata) || !isRecord(metadata.gold)) {
    return undefined;
  }
  const { alertGroups, forbiddenCoCitation, expectedDiscoveries, confirmed } = metadata.gold;
  if (
    !isRecord(alertGroups) ||
    !Array.isArray(forbiddenCoCitation) ||
    (expectedDiscoveries !== 'none' && expectedDiscoveries !== 'atLeastOne') ||
    typeof confirmed !== 'boolean'
  ) {
    return undefined;
  }
  return metadata.gold as unknown as AuditGold;
};
