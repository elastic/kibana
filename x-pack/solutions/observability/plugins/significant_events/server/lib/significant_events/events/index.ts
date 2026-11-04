/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DEFAULT_EVENTS_SEARCH_FROM, DEFAULT_EVENTS_SEARCH_TO } from './constants';
export type { SignificantEvent } from '@kbn/significant-events-schema';
export { deleteLegacyEventsDataStream } from './delete_legacy_events_data_stream';
export { RuleEventsClient } from './rule_events_client';
export { toRuleEvent } from './to_rule_event';
export type { EventsFilterOptions, EventsPaginatedSearchOptions } from './types';
