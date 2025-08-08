/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, useLocation } from 'react-router-dom';
import { TabId } from '../types';

const ALERT_DETAILS_TAB_URL_STORAGE_KEY = 'tabId';

export const useTabId = () => {
  const { search } = useLocation();
  const history = useHistory();

  const getUrlTabId = () => {
    const searchParams = new URLSearchParams(search);
    return searchParams.get(ALERT_DETAILS_TAB_URL_STORAGE_KEY);
  };

  const setUrlTabId = (
    tabId: TabId,
    overrideSearchState?: boolean,
    newSearchState?: Record<string, string>
  ) => {
    const searchParams = new URLSearchParams(overrideSearchState ? undefined : search);
    searchParams.set(ALERT_DETAILS_TAB_URL_STORAGE_KEY, tabId);

    if (newSearchState) {
      Object.entries(newSearchState).forEach(([key, value]) => {
        searchParams.set(key, value);
      });
    }

    history.replace({ search: searchParams.toString() });
  };

  return {
    getUrlTabId,
    setUrlTabId,
  };
};
