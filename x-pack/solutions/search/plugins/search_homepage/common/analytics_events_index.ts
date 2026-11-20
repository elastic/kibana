/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANALYTICS_EVENTS_INDEX_PATH = '/internal/search_homepage/analytics/events_index';

export const DEFAULT_EVENTS_INDEX_NAME = 'events';

/** The index mode event indices are created in. */
export const EVENTS_INDEX_MODE = 'columnar';

/** Elasticsearch limits an index name to this many bytes. */
export const MAX_EVENTS_INDEX_NAME_BYTES = 255;

export type EventsIndexNameProblem =
  | 'empty'
  | 'tooLong'
  | 'uppercase'
  | 'invalidCharacters'
  | 'invalidStart';

const INVALID_CHARACTERS = /[\s\\/*?"<>|,#:]/;
// A leading dot would make a hidden index, which the home does not count as the user's data.
const INVALID_START = /^[-_+.]/;

/** Why Elasticsearch would not take the name for a new index, or undefined when it would. */
export const getEventsIndexNameProblem = (name: string): EventsIndexNameProblem | undefined => {
  if (name === '') {
    return 'empty';
  }
  if (new TextEncoder().encode(name).length > MAX_EVENTS_INDEX_NAME_BYTES) {
    return 'tooLong';
  }
  if (name !== name.toLowerCase()) {
    return 'uppercase';
  }
  if (INVALID_CHARACTERS.test(name)) {
    return 'invalidCharacters';
  }
  if (INVALID_START.test(name)) {
    return 'invalidStart';
  }
  return undefined;
};

export interface AnalyticsEventsIndexCreateRequest {
  name: string;
}

export interface AnalyticsEventsIndexCreateResult {
  index: string;
}
