/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DISCOVERY_QUERIES_QUERY_KEY = ['discoveryQueries'] as const;
export const DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY = ['discoveryQueriesOccurrences'] as const;
export const SOURCES_QUERY_KEY = ['nightshiftSources'] as const;
export const FEATURES_QUERY_KEY = ['features'] as const;

export const DETECTION_OVERVIEW_QUERY_KEY = ['nightshift.detectionOverview'] as const;
export const DETECTION_ENTITIES_QUERY_KEY = ['nightshift.detectionEntities'] as const;

export const detectionEntitiesQueryKey = ({ from, to }: { from: string; to: string }) =>
  [...DETECTION_ENTITIES_QUERY_KEY, from, to] as const;

export const detectionOverviewQueryKey = ({ from, to }: { from: string; to: string }) =>
  [...DETECTION_OVERVIEW_QUERY_KEY, from, to] as const;

export const SIGNIFICANT_EVENTS_LIST_QUERY_KEY = ['nightshift.significantEventsList'] as const;
export const EVENT_BY_ID_QUERY_KEY = ['nightshift.eventById'] as const;
export const EVENT_LIFECYCLE_QUERY_KEY = ['nightshift.eventLifecycle'] as const;

export const SIGNIFICANT_EVENTS_FACETS_QUERY_KEY = ['nightshift.significantEventsFacets'] as const;
export const DETECTIONS_LIST_QUERY_KEY = ['nightshift.detectionsList'] as const;
export const DETECTION_BY_ID_QUERY_KEY = ['nightshift.detectionById'] as const;
export const DETECTION_HISTORY_QUERY_KEY = ['nightshift.detectionHistory'] as const;

/** Keys hold the whole request; react-query hashes objects by value. */
export const significantEventsListQueryKey = (params: object) =>
  [...SIGNIFICANT_EVENTS_LIST_QUERY_KEY, params] as const;

export const significantEventsFacetsQueryKey = (params: object) =>
  [...SIGNIFICANT_EVENTS_FACETS_QUERY_KEY, params] as const;

export const detectionsListQueryKey = (params: object) =>
  [...DETECTIONS_LIST_QUERY_KEY, params] as const;

export const detectionByIdQueryKey = (detectionId: string | undefined) =>
  [...DETECTION_BY_ID_QUERY_KEY, detectionId] as const;

export const detectionHistoryQueryKey = (ruleUuid: string | undefined) =>
  [...DETECTION_HISTORY_QUERY_KEY, ruleUuid] as const;
