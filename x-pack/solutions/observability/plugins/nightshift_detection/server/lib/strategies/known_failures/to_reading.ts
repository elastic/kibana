/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { RuleRow } from '../../rules/managed_rule_reader';
import type { DetectionSignalReading } from '../types';

/** The rows a Known failures rule wrote in the window, newest first, with the indicator it watches. */
export interface MeasuredKnownFailure {
  knowledgeIndicator: QueryLink;
  rows: RuleRow[];
}

/**
 * The readings of a measured known failure. Returns nothing until the judgement lands in a
 * follow-up, so the strategy is wired end to end but stores no signal yet.
 */
export function toReadings(_measured: MeasuredKnownFailure): DetectionSignalReading[] {
  return [];
}
