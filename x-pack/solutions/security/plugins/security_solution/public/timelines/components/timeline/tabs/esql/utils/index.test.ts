/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { buildDataViewMock, shallowMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { savedSearchComparator } from '.';

const customQuery = {
  language: 'kuery',
  query: '_id: *',
};

const dataViewMock = buildDataViewMock({
  name: 'first-data-view',
  fields: shallowMockedFields,
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
