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

  // Only typing writes the search to the URL, so Back/Forward can't be overwritten by a stale value.
  const pendingValue = useRef<string>();
  const { run: debouncedUpdateParam, cancel: cancelDebouncedUpdate } = useDebounceFn(
    (nextValue: string) => {
      pendingValue.current = undefined;
      updateParam(nextValue);
    },
    SEARCH_DEBOUNCE_OPTIONS
  );
  const cancelPendingUpdate = useCallback(() => {
    pendingValue.current = undefined;
    cancelDebouncedUpdate();
  }, [cancelDebouncedUpdate]);

  // A tab switch inside the debounce unmounts this hook; keep the typed search on the new URL.
  useEffect(
    () => () => {
      const nextValue = pendingValue.current;
      if (nextValue === undefined || !history.location.pathname.startsWith('/detections/')) return;
      const nextParams = new URLSearchParams(history.location.search);
      if (nextValue.trim()) nextParams.set(paramName, nextValue);
      else nextParams.delete(paramName);
      history.replace({ ...history.location, search: nextParams.toString() });
    },
    [history, paramName]
  );

  useEffect(() => {
    cancelPendingUpdate();
    setValue(urlValue);
  }, [cancelPendingUpdate, urlValue]);

  // Back/Forward within the debounce window must drop the pending write.
  useEffect(
    () =>
      history.listen((location, action) => {
        if (action === 'POP') {
          cancelPendingUpdate();
          setValue((new URLSearchParams(location.search).get(paramName) ?? '').slice(0, maxLength));
        }
      }),
    [cancelPendingUpdate, history, maxLength, paramName]
  );

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value.slice(0, maxLength);
      setValue(nextValue);
      pendingValue.current = nextValue;
      debouncedUpdateParam(nextValue);
    },
    [debouncedUpdateParam, maxLength]
  );

  const clear = useCallback(() => {
    cancelPendingUpdate();
    setValue('');
  }, [cancelPendingUpdate]);

  return { value, query: urlValue.trim(), onChange, clear };
};
