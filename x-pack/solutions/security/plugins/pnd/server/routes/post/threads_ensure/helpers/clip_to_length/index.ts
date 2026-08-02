/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Ellipsis marking a clipped value, so a truncated prompt never reads as the whole one. */
const ELLIPSIS = '…';

/**
 * Clip `value` to at most `maxLength` characters, marking the cut with an ellipsis.
 *
 * Thread titles and attachment text are assembled from model-authored strings whose contract
 * bounds are generous (`reasoning` at 8192, `message` at 4096, Agent Builder titles at 500).
 * Each is clipped to a bound this route chooses rather than inherited from the widest thing the
 * contract allows.
 *
 * Kept separate from `truncateAttackDiscoveryTitle`, which clips to a bound the *response contract*
 * imposes rather than one a prompt budget does; collapsing the two would tie a prompt-cost decision
 * to a wire-format decision.
 */
export const clipToLength = (value: string, maxLength: number): string =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, Math.max(maxLength - ELLIPSIS.length, 0)).trimEnd()}${ELLIPSIS}`;
