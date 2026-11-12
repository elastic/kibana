/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Why a piece of data is missing: what someone must fix, versus what the agent can still check. */
export const MISSING_DATA_REASONS = [
  'no_access',
  'not_retained',
  'not_collected',
  'not_queried',
] as const;

export type MissingDataReason = (typeof MISSING_DATA_REASONS)[number];

/** A gap in the data that kept an investigation from confirming its cause. */
export interface MissingDataItem {
  what: string;
  source?: string;
  why?: MissingDataReason;
  would_decide?: string;
}

/** The longest any text of an item may be. */
export const MAX_MISSING_DATA_TEXT_LENGTH = 200;
/** Gaps an investigation may list. */
export const MAX_MISSING_DATA = 3;

export const isMissingDataReason = (value: unknown): value is MissingDataReason =>
  MISSING_DATA_REASONS.some((reason) => reason === value);
