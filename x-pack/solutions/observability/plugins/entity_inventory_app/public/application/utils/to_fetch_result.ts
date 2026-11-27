/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FetchResult<T> {
  /** `initialValue` until the first response arrives, and again after a failed request. */
  data: T;
  /** True while a request is in flight, and before the first one starts. */
  loading: boolean;
  error?: Error;
  /** Runs the request again, keeping the current `data` until the new response arrives. */
  refresh: () => void;
}

/** The `useAbortableAsync` state a fetch reports, before `toFetchResult` fills in its defaults. */
interface AsyncState<T> {
  value?: T;
  loading: boolean;
  error?: Error;
  refresh: () => void;
}

/**
 * Options every fetch of the app passes to `useAbortableAsync`: a reload keeps the previous
 * response up until the new one arrives, and a failure drops it, so nothing of the last response
 * is shown beside an error.
 */
export const FETCH_OPTIONS = { clearValueOnNext: false, unsetValueOnError: true } as const;

/**
 * The same four fields in every state, so a consumer renders its loading, error and empty states
 * from `loading`, `error` and `data` alone. A reload keeps the previous `data` while `loading` is
 * true, which is how a consumer tells a reload from a first load: only a reload has data to keep.
 */
export const toFetchResult = <T>(
  { value, loading, error, refresh }: AsyncState<T>,
  initialValue: T
): FetchResult<T> => {
  // `useAbortableAsync` sets `loading` inside its effect, so on the first render it is still false
  // with nothing requested yet. No response and no error is that not-started state, which is the
  // loading state as far as a consumer is concerned.
  const hasResponse = value !== undefined;

  return {
    data: hasResponse ? value : initialValue,
    loading: loading || (!hasResponse && !error),
    error,
    refresh,
  };
};
