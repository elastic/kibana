/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createKbnUrlStateStorage,
  createSessionStorageStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import deepmerge from 'deepmerge';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DEFAULT_SLO_PAGE_SIZE } from '../../../../common/constants';

export const SLO_MANAGEMENT_SEARCH_URL_STORAGE_KEY = 'search';
export const SLO_MANAGEMENT_SEARCH_SESSION_STORAGE_KEY = 'slo.management_page_search_state';

export interface SearchState {
  search: string;
  tags: string[];
  page: number;
  perPage: number;
  includeOutdatedOnly?: boolean;
}

export const DEFAULT_STATE: SearchState = {
  search: '',
  tags: [],
  page: 0,
  perPage: DEFAULT_SLO_PAGE_SIZE,
  includeOutdatedOnly: false,
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
      ?.change$<SearchState>(SLO_MANAGEMENT_SEARCH_URL_STORAGE_KEY)
      .subscribe((newSearchState) => {
        if (newSearchState) {
          setState(newSearchState);
        }
      });

    setState(
      urlStateStorage.current?.get<SearchState>(SLO_MANAGEMENT_SEARCH_URL_STORAGE_KEY) ??
        sessionStorage.current?.get<SearchState>(SLO_MANAGEMENT_SEARCH_SESSION_STORAGE_KEY) ??
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

      urlStateStorage.current?.set(SLO_MANAGEMENT_SEARCH_URL_STORAGE_KEY, updatedState, {
        replace: true,
      });
    },
    [state]
  );

  return {
    state: deepmerge(DEFAULT_STATE, state),
    onStateChange,
  };
}
