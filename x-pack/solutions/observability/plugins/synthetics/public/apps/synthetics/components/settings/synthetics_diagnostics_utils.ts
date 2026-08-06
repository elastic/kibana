/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ORDERED_DIAGNOSTICS_SECTION_KEYS: string[] = [
  'meta',
  'overviewStatus',
  'monitors',
  'monitorCountByLocationId',
  'referencedPackagePolicyIds',
  'packagePolicies',
  'privateLocations',
  'privateLocationAgentPolicies',
  'fleetAgentPolicies',
  'globalParams',
  'dynamicSettings',
  'indices',
  'syntheticsServiceSyncErrors',
];

export const jsonStringifyDiagnostics = (
  value: unknown,
  options?: { compact?: boolean }
): string => {
  try {
    return options?.compact ? JSON.stringify(value) : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const getDiagnosticsSectionKeysInOrder = (data: Record<string, unknown>): string[] => {
  const known = new Set(ORDERED_DIAGNOSTICS_SECTION_KEYS);
  const extra = Object.keys(data).filter((k) => !known.has(k));
  return [...ORDERED_DIAGNOSTICS_SECTION_KEYS.filter((k) => k in data), ...extra.sort()];
};
