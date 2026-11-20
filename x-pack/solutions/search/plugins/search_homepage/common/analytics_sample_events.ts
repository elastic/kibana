/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANALYTICS_SAMPLE_EVENTS_PATH = '/internal/search_homepage/analytics/sample_events';

/** The prefix marks the index as sample data for the cluster state and the pages. */
export const ANALYTICS_SAMPLE_EVENTS_INDEX = 'kibana_sample_data_clickstream';

export interface AnalyticsSampleEventsInstallResult {
  index: string;
  eventsCount: number;
  /**
   * `alreadyInstalled`: complete, recent events were present and left untouched.
   * `replaced`: incomplete or outdated events were present and regenerated.
   */
  status: 'installed' | 'replaced' | 'alreadyInstalled';
}

export interface AnalyticsSampleEventsRemoveResult {
  index: string;
  status: 'removed' | 'notInstalled';
}
