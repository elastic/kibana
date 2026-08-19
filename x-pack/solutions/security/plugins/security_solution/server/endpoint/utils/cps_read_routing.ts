/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Index owner classifiers used to decide which client a Defend read uses under CPS: Defend-owned
 * indices are read as the request user and fan out, everything else stays on the internal client.
 *
 * Matching is by substring so a CCS-prefixed pattern classifies the same as its unprefixed form.
 */

/** Checked before {@link isEndpointIndex}, since `.fleet-files-endpoint*` also contains `endpoint` */
export const isFleetIndex = (index: string): boolean => index.includes('fleet');

/** Defend's own indices that are only ever read by background tasks, so can never fan out */
const DEFEND_INTERNAL_ONLY_SUBSTRINGS = ['heartbeat', 'diagnostic.collection', 'telemetry'];

const isDefendInternalOnlyIndex = (index: string): boolean =>
  DEFEND_INTERNAL_ONLY_SUBSTRINGS.some((substring) => index.includes(substring));

export const isEndpointIndex = (index: string): boolean =>
  index.includes('endpoint') && !isFleetIndex(index) && !isDefendInternalOnlyIndex(index);

/**
 * Always `true` for a read that cannot fan out — CPS off, or on but without a `KibanaRequest` to
 * scope the search to. For one that can, a single Fleet index in the list still keeps the whole
 * search on the internal client, since the request user cannot read it at all.
 *
 * @param cpsRead the per-request predicate, i.e. `EndpointAppContextService#isCpsRead(request)`
 */
export const shouldUseInternalSearchClient = (indices: string[], cpsRead: boolean): boolean => {
  if (!cpsRead) {
    return true;
  }

  return indices.some(isFleetIndex) || !indices.some(isEndpointIndex);
};

/**
 * Elasticsearch prefixes the index of a hit that came from a linked project with its alias, so a
 * colon in a hit's `_index` is the only signal that the document did not come from this project.
 * Verified against a live fanned-in document rather than assumed; the same prefix is what
 * `expandIndexPatternsForCps` relies on for Lens.
 *
 * Read it off a hit only. Whether a *query* on `_index` sees the prefix is a different question and
 * is not relied on anywhere.
 */
export const isFannedInHit = (hitIndex?: string): boolean => Boolean(hitIndex?.includes(':'));

/**
 * CCS remote patterns (`cluster:index`) and CPS project-qualified names (`alias:index`) both use a
 * colon prefix. A fanned-out search must not also send those expressions: the two topologies are
 * not verified to combine, matching Defend's `ccsEnabled && !cpsRead` suppression.
 */
export const isRemoteOrProjectPrefixed = (index: string): boolean => index.includes(':');

/** Strip a CCS/project prefix, leaving the local index or pattern. */
export const toLocalIndexName = (index: string): string => {
  const colon = index.indexOf(':');
  return colon === -1 ? index : index.slice(colon + 1);
};

/**
 * When project routing is active, drop remote/project-prefixed expressions so the request only
 * names local patterns. If every entry was prefixed, fall back to the local names so the search
 * still has an index list.
 */
export const stripRemoteIndexPatterns = (indices: string[], cpsRead: boolean): string[] => {
  if (!cpsRead) {
    return indices;
  }

  const local = indices.filter((index) => !isRemoteOrProjectPrefixed(index));
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
  firstConcreteIndex(indices.filter(isRemoteOrProjectPrefixed));
