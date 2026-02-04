/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import {
  createKbnUrlStateStorage,
  createSessionStorageStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import deepmerge from 'deepmerge';
import { pick } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DEFAULT_SLO_PAGE_SIZE } from '../../../../common/constants';
import type { GroupByField, SortDirection, SortField, ViewType } from '../types';

export const SLO_LIST_SEARCH_URL_STORAGE_KEY = 'search';
export const SLO_LIST_SEARCH_SESSION_STORAGE_KEY = 'slo.list_page_search_state';

export interface SearchState {
  kqlQuery: string;
  page: number;
  perPage: number;
  sort: {
    by: SortField;
    direction: SortDirection;
  };
  view: ViewType;
  groupBy: GroupByField;
  filters: Filter[];
  lastRefresh?: number;
  tagsFilter?: Filter;
  statusFilter?: Filter;
}

export const DEFAULT_STATE: SearchState = {
  kqlQuery: '',
  page: 0,
  perPage: DEFAULT_SLO_PAGE_SIZE,
  sort: { by: 'status', direction: 'desc' },
  view: 'cardView',
  groupBy: 'ungrouped',
  filters: [],
  lastRefresh: 0,
};

export function useUrlSearchState(): {
  state: SearchState;
  onStateChange: (state: Partial<SearchState>) => void;
} {
  const [state, setState] = useState<SearchState>(DEFAULT_STATE);
  const history = useHistory();
  const urlStateStorage = useRef(
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    })
  );

  const sessionStorage = useRef(createSessionStorageStateStorage(window.localStorage));

  useEffect(() => {
    const sub = urlStateStorage.current
      ?.change$<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY)
      .subscribe((newSearchState) => {
        // When URL has no search params, newSearchState will be null/undefined
        // In that case, reset to DEFAULT_STATE
        setState(newSearchState ?? DEFAULT_STATE);
      });

    setState(
      urlStateStorage.current?.get<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY) ??
        sessionStorage.current?.get<SearchState>(SLO_LIST_SEARCH_SESSION_STORAGE_KEY) ??
        DEFAULT_STATE
    );

    return () => {
      sub?.unsubscribe();
    };
  }, [urlStateStorage, sessionStorage]);

  const onStateChange = useCallback(
    (newState: Partial<SearchState>) => {
      const updatedState = { ...state, page: 0, ...newState };
      setState(() => updatedState);

      urlStateStorage.current?.set(SLO_LIST_SEARCH_URL_STORAGE_KEY, updatedState);

      // Discard search itself from session storage. Keep only view preferences
      sessionStorage.current?.set(
        SLO_LIST_SEARCH_SESSION_STORAGE_KEY,
        pick(updatedState, 'sort', 'view', 'groupBy')
      );
    },
    [state]
  );

  return {
    state: deepmerge(DEFAULT_STATE, state),
    onStateChange,
  };
}
