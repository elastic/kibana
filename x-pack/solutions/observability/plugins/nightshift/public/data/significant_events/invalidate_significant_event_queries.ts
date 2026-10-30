/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import { NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY } from './use_fetch_significant_events';
import {
  DETECTION_ENTITIES_QUERY_KEY,
  EVENT_BY_ID_QUERY_KEY,
  EVENT_LIFECYCLE_QUERY_KEY,
  SIGNIFICANT_EVENTS_FACETS_QUERY_KEY,
  SIGNIFICANT_EVENTS_LIST_QUERY_KEY,
} from '../query_keys';

const SIGNIFICANT_EVENT_QUERY_KEYS = [
  DETECTION_ENTITIES_QUERY_KEY,
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  SIGNIFICANT_EVENTS_LIST_QUERY_KEY,
  SIGNIFICANT_EVENTS_FACETS_QUERY_KEY,
  EVENT_BY_ID_QUERY_KEY,
  EVENT_LIFECYCLE_QUERY_KEY,
] as const;

/** Refetches every significant event list and detail after an event changes. */
export const invalidateSignificantEventQueries = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all(
    SIGNIFICANT_EVENT_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );
};
