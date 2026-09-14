/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { isEqual, pick } from 'lodash';

/**
 * Returns true only when the given query value is a non-empty ES|QL query.
 *
 * This is used in `syncSavedSearch` to avoid creating a Discover saved search
 * (and thereby setting `savedSearchId`) simply because a user opened the ES|QL
 * tab without typing anything. Without this check, any saved, non-draft timeline
 * whose ES|QL tab is visited gets a `savedSearchId`, making it appear incompatible
 * with Super Timeline even though no ES|QL query was ever authored.
 *
 * An ES|QL query in Discover is represented as `{ esql: string }` (AggregateQuery),
 * while a KQL/Lucene query is `{ language: string; query: string }` (Query).
 * Checking for the presence of the `esql` key is the canonical discriminator.
 */
export const hasNonEmptyEsqlQuery = (query: unknown): boolean => {
  if (!query || typeof query !== 'object') return false;
  if (!('esql' in query)) return false;
  const esqlQuery = (query as { esql?: string }).esql;
  return typeof esqlQuery === 'string' && esqlQuery.trim().length > 0;
};

export const savedSearchComparator = (
  inputSavedSearch: SavedSearch | null,
  existingSavedSearch: SavedSearch | null
) => {
  const inputSavedSearchWithFields = {
    ...inputSavedSearch,
    fields: inputSavedSearch?.searchSource?.getFields(),
  };

  const existingSavedSearchWithFields = {
    ...existingSavedSearch,
    fields: existingSavedSearch?.searchSource?.getFields(),
  };

  const keysToSelect = [
    'columns',
    'sort',
    'timeRange',
    'fields.filter',
    'fields.query',
    'title',
    'description',
  ];

  const modifiedInputSavedSearch = pick(inputSavedSearchWithFields, keysToSelect);
  const modifiedExistingSavedSearch = pick(existingSavedSearchWithFields, keysToSelect);

  const result = isEqual(modifiedInputSavedSearch, modifiedExistingSavedSearch);
  return result;
};
