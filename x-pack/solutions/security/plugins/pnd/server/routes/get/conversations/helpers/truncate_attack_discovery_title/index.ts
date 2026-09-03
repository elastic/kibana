/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upper bound on `DeriveConversationIdsResponse.attackDiscoveryTitle`. The response contract bounds
 * it at 200 characters, and an Attack Discovery title is model-authored, so it can exceed that.
 */
export const ATTACK_DISCOVERY_TITLE_MAX_LENGTH = 200;

/** Ellipsis marking a truncated title, so a clipped conversation name never reads as the whole one. */
const ELLIPSIS = '…';

/**
 * Clip an Attack Discovery title to the length `DeriveConversationIdsResponse` allows.
 *
 * The route must not hand an over-long value to response construction: the orchestrators name the
 * investigation, incident and tuning conversations from this title alone (kibana-phf4.16), and a 500
 * while preparing conversation context would take the whole Watch run down over a cosmetic field.
 *
 * Accepts `undefined` deliberately. The title is a required field of the Attack Discovery public
 * contract, but PND reads that contract through an unvalidated self-client fetch, so a missing value
 * is reachable at runtime without being reachable at compile time. Degrading to an empty title is
 * what the YAML already tolerates (`| default: 'Attack Discovery'` covers both empty and absent,
 * so a rename can never blank a conversation name); throwing is not.
 */
export const truncateAttackDiscoveryTitle = (title: string | undefined): string => {
  if (typeof title !== 'string') {
    return '';
  }

  if (title.length <= ATTACK_DISCOVERY_TITLE_MAX_LENGTH) {
    return title;
  }

  return `${title
    .slice(0, ATTACK_DISCOVERY_TITLE_MAX_LENGTH - ELLIPSIS.length)
    .trimEnd()}${ELLIPSIS}`;
};
