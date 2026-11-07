/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Base internal API path for AI Hunt history persistence. */
export const AI_HUNT_HISTORY_URL = '/internal/entity_analytics/ai_hunt_history' as const;
/** GET (list) + POST (create) live on the collection URL. */
export const AI_HUNT_HISTORY_LIST_URL = AI_HUNT_HISTORY_URL as string;
/** GET one / PATCH / DELETE operate on a single record by id. */
export const AI_HUNT_HISTORY_BY_ID_URL = `${AI_HUNT_HISTORY_URL}/{id}` as const;

const AI_HUNT_HISTORY_INDEX_PREFIX = '.entity-analytics-hunts' as const;

export const AI_HUNT_HISTORY_INDEX_PATTERN = `${AI_HUNT_HISTORY_INDEX_PREFIX}-*` as const;

/** Per-space hidden index that stores saved AI Hunt records. */
export const getAiHuntHistoryIndexName = (spaceId: string): string =>
  `${AI_HUNT_HISTORY_INDEX_PREFIX}-${spaceId}`;

/**
 * Upper bound on hunt records returned by the list endpoint. Keeps the history
 * surface bounded regardless of how many hunts an analyst has accumulated.
 */
export const MAX_HUNT_HISTORY_RESULTS = 100;
