/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';

/**
 * Resolver-owned helpers for reconciling the index expressions a fanned-out (project-routed) read
 * sends with the concrete `_index` values it gets back. CCS remote patterns (`cluster:index`) and
 * CPS project-qualified names (`alias:index`) both use a colon prefix, so `isNonLocalIndexName` is
 * the single shared definition of that rule.
 */

/** Strip a CCS/project prefix, leaving the local index or pattern. */
export const toLocalIndexName = (index: string): string => {
  const colon = index.indexOf(':');
  return colon === -1 ? index : index.slice(colon + 1);
};

/**
 * When project routing is active, drop remote/project-prefixed expressions so the request only
 * names local patterns. If every entry was prefixed, fall back to the local names so the search
 * still has an index list.
 *
 * CCS remote patterns (`cluster:index`) and CPS project-qualified names (`alias:index`) both use a
 * colon prefix. A fanned-out search must not also send those expressions: the two topologies are
 * not verified to combine, matching Defend's `ccsEnabled && !cpsRead` suppression.
 */
export const stripRemoteIndexPatterns = (indices: string[], cpsRead: boolean): string[] => {
  if (!cpsRead) {
    return indices;
  }

  const local = indices.filter((index) => !isNonLocalIndexName(index));
  if (local.length > 0) {
    return local;
  }

  return indices.map(toLocalIndexName);
};

/** First index that names a concrete document rather than a wildcard pattern. */
export const firstConcreteIndex = (indices: string[]): string | undefined =>
  indices.find((index) => !toLocalIndexName(index).includes('*'));

/**
 * Concrete `_index` used to disambiguate the same `_id` across projects. Origin-only names
 * (alerts aliases, winlogbeat archives, hidden backing indices) keep the pre-CPS first-hit
 * lookup; treating them as a preferred index changes Analyzer on ordinary flyout alerts.
 */
export const firstProjectQualifiedConcreteIndex = (indices: string[]): string | undefined =>
  firstConcreteIndex(indices.filter(isNonLocalIndexName));
