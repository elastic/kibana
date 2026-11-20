/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYTICS_SAMPLE_EVENTS_INDEX } from '../../common/analytics_sample_events';
import type { AnalyticsSampleDatasetId } from './types';

export const HOME_PATH = '/';
export const GUIDED_SETUP_PATH = '/get_started';
/** Where the event-analytics pages lived before the homes were unified; kept as redirects. */
export const LEGACY_ANALYTICS_HOME_PATH = '/analytics';
export const LEGACY_ANALYTICS_ONBOARDING_PATH = '/analytics/get_started';
/** How many pages a crawl started from the "Crawl a website" flyout indexes unless told otherwise. */
export const FIRST_WEB_CRAWL_MAX_PAGES = 50;
export const ANALYTICS_DEEP_LINK_ID = 'analytics';
export const ANALYTICS_TELEMETRY_PREFIX = 'searchHomepageAnalytics';

export const ANALYTICS_PREFERENCES_STORAGE_KEY = 'searchHomepage.analytics.preferences';

/** What a starter query covers, in Discover and as a request from the user's own code. */
export const STARTER_QUERY_TIME_RANGE = { from: 'now-7d', to: 'now' } as const;
/** The only field Discover applies its time range to for an ES|QL query without time parameters. */
export const DISCOVER_ESQL_TIME_FIELD = '@timestamp';

export const ANALYTICS_AGENT_SESSION_TAG = 'searchHomepage-analytics';

export const SAMPLE_DATASET_INDEX: Record<AnalyticsSampleDatasetId, string> = {
  clickstream: ANALYTICS_SAMPLE_EVENTS_INDEX,
  ecommerce: 'kibana_sample_data_ecommerce',
};

/** The sample data set offered when a use case has none of its own. */
export const DEFAULT_SAMPLE_DATASET: AnalyticsSampleDatasetId = 'clickstream';
