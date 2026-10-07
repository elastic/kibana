/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_TAB } from '../../../common';

const SIGNIFICANT_EVENTS_TABS = [
  'sources',
  'knowledge_indicators',
  'queries',
  'detections',
  SIGNIFICANT_EVENTS_TAB,
  'cortex',
  'decision_trees',
  'memory',
] as const;

export type SignificantEventsTabId = (typeof SIGNIFICANT_EVENTS_TABS)[number];

/** True for every Significant Events tab id, including tabs hidden behind a feature flag. */
export function isValidSignificantEventsTab(value: string): value is SignificantEventsTabId {
  return SIGNIFICANT_EVENTS_TABS.includes(value as SignificantEventsTabId);
}
