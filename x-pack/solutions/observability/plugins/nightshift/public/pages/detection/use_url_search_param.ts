/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDebounceFn } from '@kbn/react-hooks';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { PAGE_QUERY_PARAM } from './constants';

const SEARCH_DEBOUNCE_OPTIONS = { wait: 300 };

export const useUrlSearchParam = (paramName: string, maxLength: number) => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const urlValue = useMemo(
    () => (new URLSearchParams(search).get(paramName) ?? '').slice(0, maxLength),
    [maxLength, paramName, search]
  );
  const [value, setValue] = useState(urlValue);
  const [query, setQuery] = useState(urlValue.trim());

  const updateParam = useCallback(
    (nextValue: string) => {
      const nextParams = new URLSearchParams(search);
      if (nextValue.trim()) {
        nextParams.set(paramName, nextValue);
      } else {
        nextParams.delete(paramName);
      }
      nextParams.delete(PAGE_QUERY_PARAM);
      history.replace({ pathname, search: nextParams.toString() });
    },
    [history, paramName, pathname, search]
  );

  const pendingValue = useRef<string>();
  const { run: debouncedSetQuery, cancel: cancelDebouncedUpdate } = useDebounceFn(
    (nextValue: string) => {
      pendingValue.current = undefined;
      setQuery(nextValue.trim());
    },
    SEARCH_DEBOUNCE_OPTIONS
  );
  const cancelPendingUpdate = useCallback(() => {
    pendingValue.current = undefined;
    cancelDebouncedUpdate();
  }, [cancelDebouncedUpdate]);

  useEffect(() => {
    // The local URL write should not bypass the query debounce.
    if (pendingValue.current === urlValue) {
      return;
    }
    cancelPendingUpdate();
    setValue(urlValue);
    setQuery(urlValue.trim());
  }, [cancelPendingUpdate, urlValue]);

  // Back/Forward within the debounce window must drop the pending write.
  useEffect(
    () =>
      history.listen((location, action) => {
        if (action === 'POP') {
          cancelPendingUpdate();
          const nextValue = (new URLSearchParams(location.search).get(paramName) ?? '').slice(
            0,
            maxLength
          );
          setValue(nextValue);
          setQuery(nextValue.trim());
        }
      }),
    [cancelPendingUpdate, history, maxLength, paramName]
  );

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value.slice(0, maxLength);
      setValue(nextValue);
      pendingValue.current = nextValue;
      updateParam(nextValue);
      debouncedSetQuery(nextValue);
    },
    [debouncedSetQuery, maxLength, updateParam]
  );

  const clear = useCallback(() => {
    cancelPendingUpdate();
    setValue('');
    setQuery('');
  }, [cancelPendingUpdate]);

  return { value, query, onChange, clear };
};
