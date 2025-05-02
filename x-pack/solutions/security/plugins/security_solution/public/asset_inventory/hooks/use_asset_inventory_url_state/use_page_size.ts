/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { DEFAULT_VISIBLE_ROWS_PER_PAGE } from '../../constants';

/**
 * @description handles persisting the users table row size selection
 */
export const usePageSize = (localStorageKey: string) => {
  const [persistedPageSize, setPersistedPageSize] = useLocalStorage(
    localStorageKey,
    DEFAULT_VISIBLE_ROWS_PER_PAGE
  );

  return {
    pageSize: persistedPageSize || DEFAULT_VISIBLE_ROWS_PER_PAGE,
    setPageSize: setPersistedPageSize,
  };
};
