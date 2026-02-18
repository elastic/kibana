/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const useWatchlistsTableData = (
  spaceId: string,
  pageIndex: number,
  toggleStatus: boolean
) => {
  return {
    visibleRecords: [],
    isLoading: false,
    hasError: false,
    refetch: () => {},
    inspect: {
      dsl: '',
      response: null,
    },
    hasNextPage: false,
  };
};
