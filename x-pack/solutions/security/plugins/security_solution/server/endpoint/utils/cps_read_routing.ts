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
 * Always `true` with CPS off. With CPS on, a single Fleet index in the list keeps the whole search on
 * the internal client, since the request user cannot read it at all.
 */
export const shouldUseInternalSearchClient = (indices: string[], cpsEnabled: boolean): boolean => {
  if (!cpsEnabled) {
    return true;
  }

  return indices.some(isFleetIndex) || !indices.some(isEndpointIndex);
};
