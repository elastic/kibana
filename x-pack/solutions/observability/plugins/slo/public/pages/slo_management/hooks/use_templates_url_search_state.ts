/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import deepmerge from 'deepmerge';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

export const SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY = 'search';

export interface TemplatesSearchState {
  search: string;
  tags: string[];
  page: number;
  perPage: number;
}

export const DEFAULT_STATE: TemplatesSearchState = {
  search: '',
  tags: [],
  page: 0,
  perPage: 20,
};

export function useTemplatesUrlSearchState(): {
  state: TemplatesSearchState;
  onStateChange: (state: Partial<TemplatesSearchState>) => void;
} {
  const [state, setState] = useState<TemplatesSearchState>(DEFAULT_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const history = useHistory();
  const urlStateStorage = useRef(
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    })
  );

  useEffect(() => {
    const sub = urlStateStorage.current
      ?.change$<TemplatesSearchState>(SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY)
      .subscribe((newSearchState) => {
        if (newSearchState) {
          setState(newSearchState);
        }
      });

    setState(
      urlStateStorage.current?.get<TemplatesSearchState>(SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY) ??
        DEFAULT_STATE
    );

    return () => {
      sub?.unsubscribe();
    };
  }, [urlStateStorage]);

  const onStateChange = useCallback(
    (newState: Partial<TemplatesSearchState>) => {
      const updatedState = { ...stateRef.current, page: 0, ...newState };
      stateRef.current = updatedState;
      setState(updatedState);
      urlStateStorage.current?.set(SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY, updatedState, {
        replace: true,
      });
    },
    [urlStateStorage]
  );

  return {
    state: deepmerge(DEFAULT_STATE, state),
    onStateChange,
  };
}
