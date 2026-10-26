/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { toFeatureFlagsApiError, type FeatureFlagsApiError } from './api_error';

export interface AsyncData<T> {
  data: T | undefined;
  error: FeatureFlagsApiError | undefined;
  loading: boolean;
  reload: () => void;
}

/** `load` must be a stable callback. Previous data stays visible while a reload is in flight. */
export const useAsyncData = <T>(load: () => Promise<T>): AsyncData<T> => {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<FeatureFlagsApiError>();
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    Promise.resolve()
      .then(load)
      .then((value) => {
        if (active) {
          setData(value);
          setLoading(false);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(toFeatureFlagsApiError(caught));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [load, reloadToken]);

  return { data, error, loading, reload };
};

export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};
