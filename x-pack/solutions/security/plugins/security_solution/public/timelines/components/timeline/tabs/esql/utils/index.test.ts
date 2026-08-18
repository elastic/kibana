/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchComparator, hasNonEmptyEsqlQuery } from '.';

const customQuery = {
  language: 'kuery',
  query: '_id: *',
};

const dataViewMock = buildDataViewMock({
  name: 'first-data-view',
  fields: deepMockedFields,
});

describe('savedSearchComparator', () => {
  const mockSavedSearch = {
    id: 'first',
    title: 'first title',
    breakdownField: 'firstBreakdown Field',
    searchSource: createSearchSourceMock({
      index: dataViewMock,
      query: customQuery,
    }),
    managed: false,
  };

  it('should result true when saved search is same', () => {
    const result = savedSearchComparator(mockSavedSearch, { ...mockSavedSearch });
    expect(result).toBe(true);
  });

  it('should return false when query is different', () => {
    const newMockedSavedSearch = {
      ...mockSavedSearch,
      searchSource: createSearchSourceMock({
        index: dataViewMock,
        query: {
          ...customQuery,
          query: '*',
        },
      }),
    };

    const result = savedSearchComparator(mockSavedSearch, newMockedSavedSearch);

    expect(result).toBe(false);
  });

  it('should result false when title is different', () => {
    const newMockedSavedSearch = {
      ...mockSavedSearch,
      title: 'new-title',
    };
    const result = savedSearchComparator(mockSavedSearch, newMockedSavedSearch);

    expect(result).toBe(false);
  });
});

describe('hasNonEmptyEsqlQuery', () => {
  // These cases guard the syncSavedSearch effect: we must NOT create a saved search
  // (and therefore must NOT set savedSearchId) when a user opens the ES|QL tab without
  // typing a query. Without this predicate, visiting the tab on any saved KQL timeline
  // would set savedSearchId, making it appear incompatible with Super Timeline.

  it('returns false for undefined', () => {
    expect(hasNonEmptyEsqlQuery(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(hasNonEmptyEsqlQuery(null)).toBe(false);
  });

  it('returns false for a KQL query object (no esql key)', () => {
    expect(hasNonEmptyEsqlQuery({ language: 'kuery', query: '_id: *' })).toBe(false);
  });

  it('returns false for a Lucene query object (no esql key)', () => {
    expect(hasNonEmptyEsqlQuery({ language: 'lucene', query: '*' })).toBe(false);
  });

  it('returns false for an ES|QL query with an empty string', () => {
    expect(hasNonEmptyEsqlQuery({ esql: '' })).toBe(false);
  });

  it('returns false for an ES|QL query with only whitespace', () => {
    // whitespace-only is treated as "no query" to match build_super_timeline_model.ts trim() logic
    expect(hasNonEmptyEsqlQuery({ esql: '   ' })).toBe(false);
  });

  it('returns true for a non-empty ES|QL query', () => {
    expect(hasNonEmptyEsqlQuery({ esql: 'FROM logs-* | LIMIT 10' })).toBe(true);
  });

  it('returns true for an ES|QL query with surrounding whitespace (content after trim)', () => {
    expect(hasNonEmptyEsqlQuery({ esql: '  FROM logs-*  ' })).toBe(true);
  });

  it('returns false for a SavedSearch-shaped object whose esql field is empty (phantom savedSearchId self-heal path)', () => {
    // The self-heal check in esql/index.tsx calls hasNonEmptyEsqlQuery(savedSearchById.searchSource.getField('query')).
    // A phantom saved search created by the old bug has an empty esql field; this must return
    // false so the stale savedSearchId is cleared.
    expect(hasNonEmptyEsqlQuery({ esql: '' })).toBe(false);
  });
});
