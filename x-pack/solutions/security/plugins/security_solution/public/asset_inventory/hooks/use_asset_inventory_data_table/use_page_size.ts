/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import useLocalStorage from 'react-use/lib/useLocalStorage';

/**
 * @description handles persisting the users table row size selection
 */
export const usePageSize = (localStorageKey: string, defaultVisibleRowsPerPage = 25) => {
  const [persistedPageSize, setPersistedPageSize] = useLocalStorage(
    localStorageKey,
    defaultVisibleRowsPerPage
  );

  const pageSize = persistedPageSize ? persistedPageSize : defaultVisibleRowsPerPage;

  return { pageSize, setPageSize: setPersistedPageSize };
};
