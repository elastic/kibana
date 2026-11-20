/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { RuleRow } from '../../rules/managed_rule_reader';
import type { DetectionSignalReading } from '../types';

/** The latest row of a Known failures rule in the window, with the knowledge indicator it watches. */
export interface ActiveKnownFailure {
  knowledgeIndicator: QueryLink;
  row: RuleRow;
}

/**
 * The reading of an active known failure. Returns nothing until the mapping lands
 * (nightshift-program#2070), so the strategy is wired end to end but stores no signal yet.
 */
export function toReading(_active: ActiveKnownFailure): DetectionSignalReading | undefined {
  return undefined;
}
